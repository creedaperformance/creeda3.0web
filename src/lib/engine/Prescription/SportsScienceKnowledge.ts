const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export interface EvidenceReference {
  id: string;
  shortLabel: string;
  title: string;
  organization: string;
  year: number;
  url: string;
  application: string;
}

export interface PersonalizedNutritionFramework {
  calories: number;
  proteinTarget: number;
  proteinPerKg: number;
  carbTarget: number;
  carbPerKg: number;
  fatTarget: number;
  fatPerKgFloor: number;
  hydrationLiters: number;
  proteinFeedings: number;
  proteinPerFeeding: number;
  rationale: string[];
  references: EvidenceReference[];
}

export interface PersonalizedTrainingFramework {
  weeklyAerobicMinutes: number;
  strengthDaysPerWeek: number;
  mobilityMinutesPerDay: number;
  sleepTargetHours: number;
  progressionCapPct: number;
  dailyStepTarget: number;
  rationale: string[];
  references: EvidenceReference[];
}

const EVIDENCE_LIBRARY = {
  whoAdults: {
    id: 'who-physical-activity-2020',
    shortLabel: 'WHO',
    title: 'WHO Guidelines on Physical Activity and Sedentary Behaviour',
    organization: 'World Health Organization',
    year: 2020,
    url: 'https://www.ncbi.nlm.nih.gov/books/NBK566046/',
    application: 'Baseline weekly aerobic volume and strength frequency for adults.',
  },
  acsmResistance: {
    id: 'acsm-resistance-progression-2009',
    shortLabel: 'ACSM',
    title: 'Progression Models in Resistance Training for Healthy Adults',
    organization: 'American College of Sports Medicine',
    year: 2009,
    url: 'https://journals.lww.com/acsm-msse/Fulltext/2009/03000/Progression_Models_in_Resistance_Training_for.26.aspx',
    application: 'Progressive overload limits and novice-to-advanced strength structure.',
  },
  issnProtein: {
    id: 'issn-protein-2017',
    shortLabel: 'ISSN',
    title: 'Position Stand: Protein and Exercise',
    organization: 'International Society of Sports Nutrition',
    year: 2017,
    url: 'https://jissn.biomedcentral.com/counter/pdf/10.1186/s12970-017-0177-8.pdf',
    application: 'Daily protein ranges and per-feeding protein guidance.',
  },
  sportsNutrition: {
    id: 'sports-nutrition-review-2018',
    shortLabel: 'Sports Med',
    title: 'Fueling for Performance',
    organization: 'Current Sports Medicine Reports / PMC',
    year: 2018,
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5753973/',
    application: 'Carbohydrate bands, hydration timing, and activity-factor estimation.',
  },
  sleepHealth: {
    id: 'aasm-srs-sleep-health-2015',
    shortLabel: 'AASM',
    title: 'Consensus sleep-health guidance for adults',
    organization: 'American Academy of Sleep Medicine / Sleep Research Society',
    year: 2015,
    url: 'https://aasm.org/wp-content/uploads/2025/04/sleep-health-imperative-AASM-SRS-2012.pdf',
    application: 'Adult sleep-duration target used to protect recovery and adaptation.',
  },
} satisfies Record<string, EvidenceReference>;

type NutritionInput = {
  goal: string;
  activityLevel: string;
  weightKg: number;
  heightCm: number;
  age: number;
  biologicalSex: string;
  pathwayType?: string;
};

type TrainingInput = {
  goal: string;
  activityLevel: string;
  pathwayType?: string;
  readinessScore: number;
  trainingExperience?: string;
  sedentaryHours?: number;
};

function normalizeActivityLevel(activityLevel: string) {
  const normalized = String(activityLevel || '').trim().toLowerCase();
  if (normalized === 'sedentary') return 'sedentary';
  if (normalized === 'active') return 'active';
  if (normalized === 'athlete') return 'athlete';
  return 'moderate';
}

function normalizeGoal(goal: string) {
  const normalized = String(goal || '').trim().toLowerCase();
  if (normalized.includes('fat')) return 'fat_loss';
  if (normalized.includes('muscle')) return 'muscle_gain';
  if (normalized.includes('endurance')) return 'endurance';
  if (normalized.includes('sport')) return 'sport_specific';
  return 'general_fitness';
}

function normalizePathwayType(pathwayType?: string) {
  const normalized = String(pathwayType || '').trim().toLowerCase();
  if (normalized === 'lifestyle' || normalized === 'training' || normalized === 'sport') {
    return normalized;
  }
  return 'training';
}

function normalizeExperience(trainingExperience?: string) {
  const normalized = String(trainingExperience || '').trim().toLowerCase();
  if (['beginner', 'novice', 'intermediate', 'advanced', 'experienced'].includes(normalized)) {
    return normalized;
  }
  return 'novice';
}

function mifflinStJeorCalories(weightKg: number, heightCm: number, age: number, biologicalSex: string) {
  const normalizedSex = String(biologicalSex || '').trim().toLowerCase();
  const sexConstant =
    normalizedSex.startsWith('m') ? 5 :
    normalizedSex.startsWith('f') ? -161 :
    -78;

  return (10 * weightKg) + (6.25 * heightCm) - (5 * age) + sexConstant;
}

function activityFactor(activityLevel: string) {
  switch (normalizeActivityLevel(activityLevel)) {
    case 'sedentary':
      return 1.45;
    case 'active':
      return 1.9;
    case 'athlete':
      return 2.1;
    default:
      return 1.7;
  }
}

function determineProteinPerKg(goal: string, activityLevel: string) {
  const normalizedGoal = normalizeGoal(goal);
  const normalizedActivity = normalizeActivityLevel(activityLevel);

  if (normalizedGoal === 'fat_loss') {
    return normalizedActivity === 'athlete' || normalizedActivity === 'active' ? 2.0 : 1.8;
  }
  if (normalizedGoal === 'muscle_gain') return 1.9;
  if (normalizedGoal === 'endurance') return normalizedActivity === 'athlete' ? 1.8 : 1.6;
  if (normalizedGoal === 'sport_specific') return 1.8;
  return normalizedActivity === 'sedentary' ? 1.5 : 1.6;
}

function determineCarbPerKg(goal: string, activityLevel: string, pathwayType?: string) {
  const normalizedGoal = normalizeGoal(goal);
  const normalizedActivity = normalizeActivityLevel(activityLevel);
  const normalizedPathway = normalizePathwayType(pathwayType);

  if (normalizedGoal === 'endurance') {
    return normalizedActivity === 'athlete' ? 6.5 : normalizedActivity === 'active' ? 6.0 : 5.0;
  }

  if (normalizedGoal === 'sport_specific' || normalizedPathway === 'sport') {
    return normalizedActivity === 'athlete' ? 6.0 : normalizedActivity === 'active' ? 5.2 : 4.5;
  }

  if (normalizedGoal === 'muscle_gain') {
    return normalizedActivity === 'active' || normalizedActivity === 'athlete' ? 4.8 : 4.0;
  }

  if (normalizedGoal === 'fat_loss') {
    return normalizedActivity === 'athlete' ? 4.5 : normalizedActivity === 'active' ? 4.0 : normalizedActivity === 'moderate' ? 3.5 : 3.0;
  }

  if (normalizedPathway === 'lifestyle') {
    return normalizedActivity === 'sedentary' ? 3.0 : normalizedActivity === 'active' ? 4.2 : 3.6;
  }

  return normalizedActivity === 'athlete' ? 5.0 : normalizedActivity === 'active' ? 4.4 : normalizedActivity === 'sedentary' ? 3.2 : 3.8;
}

function determineGoalAdjustment(goal: string) {
  const normalizedGoal = normalizeGoal(goal);
  if (normalizedGoal === 'fat_loss') return 0.88;
  if (normalizedGoal === 'muscle_gain') return 1.08;
  if (normalizedGoal === 'endurance') return 1.05;
  if (normalizedGoal === 'sport_specific') return 1.03;
  return 1;
}

function determineHydrationLiters(weightKg: number, activityLevel: string, pathwayType?: string) {
  const normalizedActivity = normalizeActivityLevel(activityLevel);
  const normalizedPathway = normalizePathwayType(pathwayType);
  const base = weightKg * 0.033;
  const activityAddon =
    normalizedActivity === 'athlete' ? 1.0 :
    normalizedActivity === 'active' ? 0.8 :
    normalizedActivity === 'moderate' ? 0.55 : 0.35;
  const pathwayAddon = normalizedPathway === 'sport' ? 0.2 : 0;

  return Number(clamp(base + activityAddon + pathwayAddon, 1.8, 5.5).toFixed(1));
}

export function buildNutritionFramework(input: NutritionInput): PersonalizedNutritionFramework {
  const goal = normalizeGoal(input.goal);
  const activityLevel = normalizeActivityLevel(input.activityLevel);
  const pathwayType = normalizePathwayType(input.pathwayType);
  const weightKg = clamp(Number(input.weightKg) || 70, 35, 220);
  const heightCm = clamp(Number(input.heightCm) || 170, 130, 230);
  const age = clamp(Number(input.age) || 28, 13, 90);

  const restingCalories = mifflinStJeorCalories(weightKg, heightCm, age, input.biologicalSex);
  const calories = Math.max(1400, Math.round(restingCalories * activityFactor(activityLevel) * determineGoalAdjustment(goal)));
  const proteinPerKg = determineProteinPerKg(goal, activityLevel);
  const proteinTarget = Math.round(weightKg * proteinPerKg);
  const carbPerKg = determineCarbPerKg(goal, activityLevel, pathwayType);
  const carbTarget = Math.round(weightKg * carbPerKg);
  const fatPerKgFloor = goal === 'fat_loss' ? 0.7 : 0.8;
  const fatFromEnergy = Math.round((calories * 0.26) / 9);
  const fatTarget = Math.max(Math.round(weightKg * fatPerKgFloor), fatFromEnergy);
  const proteinPerFeeding = Math.round(clamp(weightKg * 0.3, 20, 40));
  const proteinFeedings = clamp(Math.round(proteinTarget / proteinPerFeeding), 3, 5);
  const hydrationLiters = determineHydrationLiters(weightKg, activityLevel, pathwayType);

  const rationale = [
    `Protein is anchored at ${proteinPerKg.toFixed(1)} g/kg/day to support your current goal without relying on generic default macros.`,
    `Carbohydrate is scaled to ${carbPerKg.toFixed(1)} g/kg/day so fueling matches your actual movement demand instead of athlete-only assumptions.`,
    `Hydration starts around ${hydrationLiters.toFixed(1)} L/day as a safe baseline, then should rise on hotter days or longer sessions.`,
    `Protein is split into ${proteinFeedings} feedings of about ${proteinPerFeeding} g to make recovery more realistic across a normal Indian day.`,
  ];

  return {
    calories,
    proteinTarget,
    proteinPerKg,
    carbTarget,
    carbPerKg,
    fatTarget,
    fatPerKgFloor,
    hydrationLiters,
    proteinFeedings,
    proteinPerFeeding,
    rationale,
    references: [
      EVIDENCE_LIBRARY.issnProtein,
      EVIDENCE_LIBRARY.sportsNutrition,
    ],
  };
}

function determineAerobicMinutes(goal: string, activityLevel: string, pathwayType: string, readinessScore: number) {
  const normalizedGoal = normalizeGoal(goal);
  const normalizedActivity = normalizeActivityLevel(activityLevel);

  let minutes = 150;

  if (normalizedActivity === 'moderate') minutes = 180;
  if (normalizedActivity === 'active') minutes = 210;
  if (normalizedActivity === 'athlete') minutes = 240;

  if (pathwayType === 'sport') minutes += 30;
  if (normalizedGoal === 'endurance') minutes += 45;
  if (normalizedGoal === 'fat_loss') minutes += 20;

  if (readinessScore < 45) minutes = Math.max(120, minutes - 45);
  else if (readinessScore < 62) minutes = Math.max(135, minutes - 20);

  return clamp(Math.round(minutes / 15) * 15, 120, 300);
}

function determineStrengthDays(pathwayType: string, readinessScore: number, trainingExperience: string) {
  const experience = normalizeExperience(trainingExperience);

  let days =
    pathwayType === 'lifestyle' ? 2 :
    pathwayType === 'sport' ? 2 : 3;

  if (experience === 'advanced' || experience === 'experienced') days += 1;
  if (readinessScore < 45) days = Math.max(2, days - 1);

  return clamp(days, 2, 4);
}

function determineProgressionCap(readinessScore: number, trainingExperience: string) {
  const experience = normalizeExperience(trainingExperience);

  if (readinessScore < 45) return 3;
  if (experience === 'beginner') return 4;
  if (experience === 'novice') return 5;
  if (experience === 'intermediate') return 6;
  if (experience === 'advanced') return 8;
  return 9;
}

function determineSleepTargetHours(activityLevel: string, readinessScore: number, pathwayType: string) {
  const normalizedActivity = normalizeActivityLevel(activityLevel);

  let sleepTarget = normalizedActivity === 'sedentary' ? 7.5 : 8.0;
  if (pathwayType === 'sport' || normalizedActivity === 'athlete') sleepTarget += 0.3;
  if (readinessScore < 55) sleepTarget += 0.4;

  return Number(clamp(Number(sleepTarget.toFixed(1)), 7.5, 8.8).toFixed(1));
}

function determineDailyStepTarget(activityLevel: string, goal: string, sedentaryHours = 7) {
  const normalizedActivity = normalizeActivityLevel(activityLevel);
  let target =
    normalizedActivity === 'sedentary' ? 7000 :
    normalizedActivity === 'active' || normalizedActivity === 'athlete' ? 10000 : 8500;

  if (normalizeGoal(goal) === 'fat_loss') target += 1000;
  if (sedentaryHours >= 9) target += 500;

  return clamp(target, 6500, 12000);
}

export function buildTrainingFramework(input: TrainingInput): PersonalizedTrainingFramework {
  const pathwayType = normalizePathwayType(input.pathwayType);
  const activityLevel = normalizeActivityLevel(input.activityLevel);
  const readinessScore = clamp(Math.round(Number(input.readinessScore) || 60), 0, 100);
  const weeklyAerobicMinutes = determineAerobicMinutes(input.goal, activityLevel, pathwayType, readinessScore);
  const strengthDaysPerWeek = determineStrengthDays(pathwayType, readinessScore, input.trainingExperience || 'novice');
  const progressionCapPct = determineProgressionCap(readinessScore, input.trainingExperience || 'novice');
  const sleepTargetHours = determineSleepTargetHours(activityLevel, readinessScore, pathwayType);
  const dailyStepTarget = determineDailyStepTarget(activityLevel, input.goal, Number(input.sedentaryHours) || 7);
  const mobilityMinutesPerDay = Number(input.sedentaryHours) >= 8 ? 10 : 6;

  const rationale = [
    `Weekly movement starts from WHO minimums, then scales with your pathway and readiness instead of assuming everyone trains like an athlete.`,
    `Strength exposure stays at ${strengthDaysPerWeek} days/week so you build capacity without overloading a normal-life schedule.`,
    `Weekly load progression is capped around ${progressionCapPct}% to respect ACSM progression guidance and reduce spike risk.`,
    `Sleep is held near ${sleepTargetHours.toFixed(1)} hours because lower recovery quality rapidly reduces the value of harder training.`,
  ];

  return {
    weeklyAerobicMinutes,
    strengthDaysPerWeek,
    mobilityMinutesPerDay,
    sleepTargetHours,
    progressionCapPct,
    dailyStepTarget,
    rationale,
    references: [
      EVIDENCE_LIBRARY.whoAdults,
      EVIDENCE_LIBRARY.acsmResistance,
      EVIDENCE_LIBRARY.sleepHealth,
    ],
  };
}

export function mergeEvidenceReferences(...referenceGroups: EvidenceReference[][]) {
  const unique = new Map<string, EvidenceReference>();

  for (const group of referenceGroups) {
    for (const reference of group) {
      unique.set(reference.id, reference);
    }
  }

  return [...unique.values()];
}
