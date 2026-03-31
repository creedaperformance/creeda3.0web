import {
  DEMAND_MAP,
  SPORTS_DATABASE,
  type PhysiologicalDemand,
  type SportData,
  type SportPosition,
} from '../../sport_intelligence';
import { EvidenceReference, mergeEvidenceReferences } from './SportsScienceKnowledge';

export interface SupplementRecommendation {
  name: string;
  status: 'food_first' | 'consider' | 'trial_in_training' | 'avoid_today';
  category: 'performance' | 'recovery' | 'competition';
  useCase: string;
  protocol: string;
  caution: string;
  references: EvidenceReference[];
}

export interface InjuryReturnGuidance {
  injuryType: string;
  phaseLabel: string;
  progressCriteria: string[];
  holdCriteria: string[];
  competitionGate: string;
  references: EvidenceReference[];
}

export interface ConditioningGuidance {
  archetype: string;
  todayFit: string;
  priorities: string[];
  loadWarnings: string[];
  references: EvidenceReference[];
}

export interface AthleteSportPositionProfile {
  sportKey: string;
  sportName: string;
  positionName: string;
  archetype: string;
  summary: string;
  demandKeys: PhysiologicalDemand[];
  demands: string[];
  physiologyPriorities: string[];
  riskHotspots: string[];
  generalRecommendations: string[];
  positionRecommendations: string[];
  references: EvidenceReference[];
}

export interface MentalPerformanceGuidance {
  summary: string;
  skills: string[];
  monitoring: string[];
  references: EvidenceReference[];
}

export interface RecoveryGuidance {
  summary: string;
  priorities: string[];
  monitoring: string[];
  references: EvidenceReference[];
}

export interface PerformanceNutritionGuidance {
  summary: string;
  priorities: string[];
  timing: string[];
  references: EvidenceReference[];
}

export interface AthleteScientificContext {
  summary: string;
  antiDopingNote: string;
  evidence: EvidenceReference[];
  supplements: SupplementRecommendation[];
  conditioning: ConditioningGuidance;
  injuryReturn: InjuryReturnGuidance | null;
  sportProfile: AthleteSportPositionProfile;
  psychology: MentalPerformanceGuidance;
  recovery: RecoveryGuidance;
  nutrition: PerformanceNutritionGuidance;
}

type AthleteScienceInput = {
  sport: string;
  position?: string;
  primaryGoal?: string;
  sessionType: string;
  decision: 'TRAIN' | 'MODIFY' | 'RECOVER';
  readinessScore: number;
  painLevel: number;
  isMatchDay?: boolean;
  age?: number;
  rehab?: {
    phase: number;
    label: string;
    injuryType?: string | null;
    progressionReadiness?: boolean;
  } | null;
};

type SportArchetype =
  | 'team_field'
  | 'court'
  | 'endurance'
  | 'strength_power'
  | 'combat'
  | 'precision'
  | 'aquatic'
  | 'mixed';

type ResolvedSportContext = {
  sportKey: string;
  sportData: SportData;
  positionData: SportPosition;
  archetype: SportArchetype;
  readinessState: 'fatigued' | 'recovering' | 'primed';
};

const EVIDENCE = {
  creatine: {
    id: 'issn-creatine-2017',
    shortLabel: 'ISSN',
    title: 'Creatine Supplementation in Exercise, Sport, and Medicine',
    organization: 'International Society of Sports Nutrition',
    year: 2017,
    url: 'https://pubmed.ncbi.nlm.nih.gov/28615996/',
    application: 'Creatine monohydrate for strength, power, lean mass, and rehabilitation support.',
  },
  caffeine: {
    id: 'issn-caffeine-2021',
    shortLabel: 'ISSN',
    title: 'Position Stand: Caffeine and Exercise Performance',
    organization: 'International Society of Sports Nutrition',
    year: 2021,
    url: 'https://pubmed.ncbi.nlm.nih.gov/33388079/',
    application: 'Caffeine strategy for competition and high-readiness sessions.',
  },
  betaAlanine: {
    id: 'issn-beta-alanine-2015',
    shortLabel: 'ISSN',
    title: 'Position Stand: Beta-Alanine',
    organization: 'International Society of Sports Nutrition',
    year: 2015,
    url: 'https://jissn.biomedcentral.com/counter/pdf/10.1186/s12970-015-0090-y.pdf',
    application: 'Beta-alanine for high-intensity efforts lasting roughly 1 to 4 minutes.',
  },
  sodiumBicarbonate: {
    id: 'issn-bicarbonate-2021',
    shortLabel: 'ISSN',
    title: 'Position Stand: Sodium Bicarbonate and Exercise Performance',
    organization: 'International Society of Sports Nutrition',
    year: 2021,
    url: 'https://pubmed.ncbi.nlm.nih.gov/34503527/',
    application: 'Sodium bicarbonate for high-intensity events with substantial acidosis demands.',
  },
  nutrientTiming: {
    id: 'issn-nutrient-timing-2017',
    shortLabel: 'ISSN',
    title: 'International Society of Sports Nutrition Position Stand: Nutrient Timing',
    organization: 'International Society of Sports Nutrition',
    year: 2017,
    url: 'https://pubmed.ncbi.nlm.nih.gov/28919842/',
    application: 'Carbohydrate timing, protein distribution, and rapid glycogen restoration guidance.',
  },
  aisSupplements: {
    id: 'ais-supplement-framework',
    shortLabel: 'AIS',
    title: 'AIS Sports Supplement Framework Group A',
    organization: 'Australian Institute of Sport',
    year: 2024,
    url: 'https://www.ausport.gov.au/ais/nutrition/supplements/group_a',
    application: 'Evidence-based supplement classification and supervised-use framing.',
  },
  bernReturn: {
    id: 'bern-return-to-sport-2016',
    shortLabel: 'Bern',
    title: 'Consensus Statement on Return to Sport',
    organization: 'First World Congress in Sports Physical Therapy',
    year: 2016,
    url: 'https://pubmed.ncbi.nlm.nih.gov/27226389/',
    application: 'Shared decision-making and risk-tolerance framing for return-to-sport decisions.',
  },
  anklePaass: {
    id: 'paass-ankle-2021',
    shortLabel: 'PAASS',
    title: 'Return to Sport Decisions After Acute Lateral Ankle Sprain',
    organization: 'BJSM International Multidisciplinary Consensus',
    year: 2021,
    url: 'https://bjsm.bmj.com/content/55/22/1270',
    application: 'Pain, ankle impairments, athlete perception, sensorimotor control, and sport performance domains.',
  },
  aclPanther: {
    id: 'panther-acl-2020',
    shortLabel: 'ACL',
    title: 'Panther Symposium ACL Return to Sport Consensus',
    organization: 'ACL Consensus Group',
    year: 2020,
    url: 'https://pubmed.ncbi.nlm.nih.gov/32616614/',
    application: 'ACL return-to-sport should be criterion-based, not time-only, with physical and psychological clearance.',
  },
  shoulderCriteria: {
    id: 'shoulder-return-2020',
    shortLabel: 'Shoulder',
    title: 'Return to Sport Participation Criteria Following Shoulder Injury',
    organization: 'International Journal of Sports Physical Therapy',
    year: 2020,
    url: 'https://pubmed.ncbi.nlm.nih.gov/33354395/',
    application: 'Range of motion, strength, function, and sport-specific testing for shoulder return-to-play.',
  },
  soccerDemand: {
    id: 'soccer-demand-2025',
    shortLabel: 'Football',
    title: 'Soccer Match Demands and Acceleration-Deceleration Load',
    organization: 'Journal of Sports Science and Medicine',
    year: 2025,
    url: 'https://www.jssm.org/volume24/iss4/cap/jssm-24-851.pdf',
    application: 'High-speed exposure plus acceleration and deceleration demand in football.',
  },
  teamSportDecel: {
    id: 'team-sport-deceleration-2024',
    shortLabel: 'Team Sport',
    title: 'Review of Biomechanical Demands in Court-Based Team Sports',
    organization: 'Peer-reviewed review article',
    year: 2024,
    url: 'https://www.lenus.ie/bitstreams/0073b89c-60fa-4d13-ba5c-b256f604f008/download',
    application: 'Repeated accelerations, decelerations, and braking load in basketball-like court sports.',
  },
  tennisDemand: {
    id: 'tennis-demand-2026',
    shortLabel: 'Tennis',
    title: 'Physiological Demand of Match Play in Tennis',
    organization: 'Journal of Sports Science and Medicine',
    year: 2026,
    url: 'https://www.jssm.org/volume25/iss1/cap/jssm-25-159.pdf',
    application: 'Repeated accelerations, decelerations, and change-of-direction load in tennis.',
  },
  enduranceDistribution: {
    id: 'endurance-intensity-distribution-2018',
    shortLabel: 'Endurance',
    title: 'Training Intensity Distribution in Middle- and Long-Distance Running',
    organization: 'International Journal of Sports Physiology and Performance',
    year: 2018,
    url: 'https://pubmed.ncbi.nlm.nih.gov/29182410/',
    application: 'Pyramidal and polarized intensity distribution for endurance development.',
  },
  athleteSleep: {
    id: 'athlete-sleep-review-2024',
    shortLabel: 'Sleep',
    title: 'Sleep and Athletic Performance: A Multidimensional Review of Physiological and Molecular Mechanisms',
    organization: 'Peer-reviewed review article',
    year: 2024,
    url: 'https://pubmed.ncbi.nlm.nih.gov/41227002/',
    application: 'Sleep quality and duration as core drivers of recovery, adaptation, and cognitive performance.',
  },
  mentalFatigue: {
    id: 'mental-fatigue-sport-performance-2023',
    shortLabel: 'Mental',
    title: 'Impact of Overtraining on Cognitive Function in Endurance Athletes: A Systematic Review',
    organization: 'Peer-reviewed systematic review',
    year: 2023,
    url: 'https://pubmed.ncbi.nlm.nih.gov/37552398/',
    application: 'Mental fatigue and overreaching can reduce cognitive sharpness, decision quality, and performance.',
  },
  iocMentalHealth: {
    id: 'ioc-mental-health-2019',
    shortLabel: 'IOC',
    title: 'Mental Health in Elite Athletes: International Olympic Committee Consensus Statement',
    organization: 'International Olympic Committee',
    year: 2019,
    url: 'https://pubmed.ncbi.nlm.nih.gov/31097450/',
    application: 'Mental health, environment, and biopsychosocial monitoring are part of athlete performance care.',
  },
} satisfies Record<string, EvidenceReference>;

const SPORT_ALIASES: Record<string, string[]> = {
  football: ['football', 'soccer'],
  cricket: ['cricket'],
  kabaddi: ['kabaddi'],
  badminton: ['badminton'],
  'field hockey': ['field hockey', 'hockey'],
  wrestling: ['wrestling'],
  boxing: ['boxing'],
  shooting: ['shooting', 'rifle', 'pistol'],
  archery: ['archery'],
  table_tennis: ['table tennis', 'table_tennis', 'ping pong'],
  weightlifting: ['weightlifting', 'olympic weightlifting'],
  squash: ['squash'],
  tennis: ['tennis'],
  volleyball: ['volleyball'],
  judo: ['judo'],
  rowing: ['rowing'],
  fencing: ['fencing'],
  basketball: ['basketball'],
  'athletics (sprints)': ['athletics sprints', 'sprints', 'track sprinting', '100m', '200m', '400m'],
  'athletics (distance)': ['athletics distance', 'distance running', 'middle distance', 'marathon', 'distance'],
  'athletics (jumps/throws)': ['athletics jumps', 'athletics throws', 'jumps', 'throws', 'javelin', 'shot put', 'discus', 'high jump', 'long jump', 'triple jump'],
  gymnastics: ['gymnastics'],
  cycling: ['cycling', 'road cycling', 'track cycling'],
  powerlifting: ['powerlifting'],
  taekwondo: ['taekwondo'],
  golf: ['golf'],
  'swimming (sprints)': ['swimming sprints', 'swimming', 'sprint swimming', '50m', '100m swim'],
  'swimming (distance)': ['swimming distance', 'distance swimming', '400m swim', 'open water swimming'],
  other: ['other', 'general athlete', 'general'],
};

const PHYSIOLOGY_PRIORITIES: Record<PhysiologicalDemand, string> = {
  'Explosive Power': 'Put your fastest or most explosive work early, and stop the set when first-step, jump, or contact quality clearly drops.',
  'Aerobic Endurance': 'Build most aerobic work at a genuinely sustainable intensity so the athlete can repeat hard efforts late without living in constant gray-zone fatigue.',
  'Anaerobic Capacity': 'Use short hard repeat efforts with enough recovery to preserve true glycolytic quality rather than accumulating sloppy fatigue.',
  'Agility': 'Train deceleration, redirection, and trunk-hip-knee control, not just quick feet or cone choreography.',
  'Reaction Time': 'Expose the athlete to perception-action work under realistic cues so reaction quality transfers to real play.',
  Strength: 'Build force through progressive loading and unilateral robustness around the athlete\'s highest-risk joints.',
  'Skill Precision': 'Schedule the most technical work while the nervous system is fresh so accuracy is protected under real constraints.',
  'Mental Focus': 'Use one consistent focus routine before key efforts so attention stays narrow under pressure.',
  'Fatigue Resistance': 'Condition the athlete to preserve decision quality and movement execution late, not just survive more minutes.',
};

const PSYCHOLOGY_PRIORITIES: Record<PhysiologicalDemand, string> = {
  'Explosive Power': 'Use one breath and one intent cue before explosive efforts so arousal stays high without becoming chaotic.',
  'Aerobic Endurance': 'Break long efforts into controllable segments and use pacing language that keeps discomfort from becoming panic.',
  'Anaerobic Capacity': 'Expect rising discomfort in hard intervals and pre-plan the reset cue for the next repeat before fatigue spikes.',
  'Agility': 'Train scanning and anticipation along with movement so decisions stay quick when the environment gets messy.',
  'Reaction Time': 'Reduce off-field cognitive clutter before key sessions because mental overload blunts reaction and tactical sharpness.',
  Strength: 'Use simple external cues under heavy loading so intent stays aggressive but technically organized.',
  'Skill Precision': 'Pair imagery with one external target cue to keep skill execution clear under pressure.',
  'Mental Focus': 'Protect the pre-performance routine because small attentional errors are often what performance breaks on first.',
  'Fatigue Resistance': 'Have a next-action reset after mistakes so one error does not become three more under fatigue.',
};

const RECOVERY_PRIORITIES: Record<PhysiologicalDemand, string> = {
  'Explosive Power': 'Protect high-quality sleep and enough low-load movement so the nervous system can express power again, not just feel less sore.',
  'Aerobic Endurance': 'Recovery should restore plasma volume, fueling, and easy aerobic rhythm instead of defaulting to total inactivity.',
  'Anaerobic Capacity': 'High-lactate work needs carbohydrate restoration and low-intensity circulation to clear residual fatigue without flattening the next session.',
  'Agility': 'Give extra attention to tendon, ankle, knee, and trunk recovery after heavy braking or cutting sessions.',
  'Reaction Time': 'If reaction quality has fallen, treat sleep debt and cognitive overload as recovery problems, not just motivation problems.',
  Strength: 'Heavy structural sessions need protein distribution, tissue-specific mobility, and joint calm before more loading.',
  'Skill Precision': 'When the sport depends on fine skill, recovery must also reduce mental noise, not only physical soreness.',
  'Mental Focus': 'Protect quiet, low-distraction recovery windows because decision quality erodes when the brain never downshifts.',
  'Fatigue Resistance': 'Track whether the athlete is actually rebounding between hard days or only surviving them with caffeine and willpower.',
};

const NUTRITION_PRIORITIES: Record<PhysiologicalDemand, string> = {
  'Explosive Power': 'Anchor the day with sufficient carbohydrate and protein so speed and power work are fueled, not just technically completed.',
  'Aerobic Endurance': 'Periodize carbohydrate around the longest or hardest aerobic work so glycogen depletion becomes a tool, not an accidental limiter.',
  'Anaerobic Capacity': 'Repeated high-intensity work pays back best when carbohydrate availability and sodium-fluid intake are not undercut.',
  'Agility': 'Chaotic, stop-start sports still need real training fuel; under-fueling shows up as slower feet and later-session control loss.',
  'Reaction Time': 'Keep hydration and blood glucose steady enough that decision speed is not being taxed by preventable nutrition errors.',
  Strength: 'Distribute protein across the day and keep carbohydrate available around hard lifting so force output and recovery both hold up.',
  'Skill Precision': 'Precision sports should avoid experimenting with aggressive stimulants or under-fueling that destabilizes fine motor control.',
  'Mental Focus': 'The brain also needs fuel. Long low-energy gaps can show up as poorer decisions before they show up as hunger.',
  'Fatigue Resistance': 'If late-session quality matters, the nutrition plan has to support work late, not only the warm-up.',
};

function normalizeToken(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_/]+/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeSport(sport: string) {
  return normalizeToken(sport);
}

function normalizeGoal(goal?: string) {
  const normalized = normalizeToken(goal || '');
  if (normalized.includes('strength') || normalized.includes('power') || normalized.includes('muscle')) return 'strength';
  if (normalized.includes('endurance')) return 'endurance';
  if (normalized.includes('fat')) return 'fat_loss';
  return 'performance';
}

function getReadinessState(readinessScore: number): ResolvedSportContext['readinessState'] {
  if (readinessScore >= 80) return 'primed';
  if (readinessScore < 55) return 'fatigued';
  return 'recovering';
}

function isTeamFieldSport(sport: string) {
  return /(football|soccer|rugby|hockey|lacrosse|kabaddi|cricket)/.test(sport);
}

function isCourtSport(sport: string) {
  return /(basketball|tennis|badminton|squash|volleyball|table tennis)/.test(sport);
}

function isEnduranceSport(sport: string) {
  return /(running|marathon|cycling|swimming|triathlon|rowing|distance|endurance)/.test(sport);
}

function isStrengthSport(sport: string) {
  return /(gym|strength|hypertrophy|powerlifting|weightlifting|crossfit|sprint)/.test(sport);
}

function uniqueStrings(items: Array<string | null | undefined>) {
  return [...new Set(items.map((item) => String(item || '').trim()).filter(Boolean))];
}

function describeArchetype(archetype: SportArchetype) {
  switch (archetype) {
    case 'team_field':
      return 'Team-field readiness';
    case 'court':
      return 'Court-sport repeatability';
    case 'endurance':
      return 'Aerobic durability';
    case 'strength_power':
      return 'Strength-power quality';
    case 'combat':
      return 'Combat readiness';
    case 'precision':
      return 'Precision under pressure';
    case 'aquatic':
      return 'Aquatic efficiency';
    default:
      return 'Mixed-sport readiness';
  }
}

function classifySportArchetype(sportKey: string): SportArchetype {
  const normalized = normalizeToken(sportKey);
  if (/(football|cricket|kabaddi|field hockey)/.test(normalized)) return 'team_field';
  if (/(basketball|badminton|tennis|table tennis|squash|volleyball)/.test(normalized)) return 'court';
  if (/(distance|rowing|cycling)/.test(normalized)) return 'endurance';
  if (/(weightlifting|powerlifting|sprints|throws|jumps)/.test(normalized)) return 'strength_power';
  if (/(boxing|wrestling|judo|taekwondo|fencing)/.test(normalized)) return 'combat';
  if (/(shooting|archery|golf)/.test(normalized)) return 'precision';
  if (/(swimming)/.test(normalized)) return 'aquatic';
  return 'mixed';
}

function sportReferences(sportKey: string, archetype: SportArchetype): EvidenceReference[] {
  const normalized = normalizeToken(sportKey);

  if (normalized === 'football') {
    return [EVIDENCE.soccerDemand, EVIDENCE.teamSportDecel];
  }

  if (normalized === 'tennis') {
    return [EVIDENCE.tennisDemand, EVIDENCE.teamSportDecel];
  }

  if (archetype === 'court' || archetype === 'team_field') {
    return [EVIDENCE.teamSportDecel];
  }

  if (archetype === 'endurance' || normalized.includes('distance') || normalized.includes('rowing') || normalized.includes('cycling')) {
    return [EVIDENCE.enduranceDistribution];
  }

  return [EVIDENCE.nutrientTiming];
}

function resolveSportKey(sport: string) {
  const normalized = normalizeToken(sport);
  if (!normalized) return 'other';

  for (const key of Object.keys(SPORTS_DATABASE)) {
    if (normalizeToken(key) === normalized) return key;
  }

  for (const [key, data] of Object.entries(SPORTS_DATABASE)) {
    if (normalizeToken(data.name) === normalized) return key;
  }

  for (const [key, aliases] of Object.entries(SPORT_ALIASES)) {
    if (aliases.some((alias) => normalizeToken(alias) === normalized)) {
      return key;
    }
  }

  for (const [key, aliases] of Object.entries(SPORT_ALIASES)) {
    if (aliases.some((alias) => normalized.includes(normalizeToken(alias)) || normalizeToken(alias).includes(normalized))) {
      return key;
    }
  }

  if (normalized.includes('swim') && normalized.includes('distance')) return 'swimming (distance)';
  if (normalized.includes('swim')) return 'swimming (sprints)';
  if (normalized.includes('athlet') || normalized.includes('track')) {
    if (/(marathon|distance|1500|3000|5000|10000)/.test(normalized)) return 'athletics (distance)';
    if (/(jump|throw|javelin|discus|shot)/.test(normalized)) return 'athletics (jumps/throws)';
    return 'athletics (sprints)';
  }

  return 'other';
}

function resolvePosition(sportData: SportData, position?: string) {
  const normalized = normalizeToken(position || '');
  if (!normalized) return sportData.positions[0];

  for (const item of sportData.positions) {
    if (normalizeToken(item.name) === normalized) return item;
  }

  const partial = sportData.positions.find((item) => {
    const candidate = normalizeToken(item.name);
    return candidate.includes(normalized) || normalized.includes(candidate);
  });

  return partial || sportData.positions[0];
}

function resolveSportContext(input: AthleteScienceInput): ResolvedSportContext {
  const sportKey = resolveSportKey(input.sport);
  const sportData = SPORTS_DATABASE[sportKey] || SPORTS_DATABASE.other;
  const positionData = resolvePosition(sportData, input.position);

  return {
    sportKey,
    sportData,
    positionData,
    archetype: classifySportArchetype(sportKey),
    readinessState: getReadinessState(input.readinessScore),
  };
}

function extractDemandProfile(sportData: SportData, positionData: SportPosition) {
  return uniqueStrings([
    ...sportData.topDemands,
    ...positionData.specificDemands,
  ]) as PhysiologicalDemand[];
}

function buildPhysiologyPriorities(demands: PhysiologicalDemand[], archetype: SportArchetype) {
  const archetypeAdditions: Record<SportArchetype, string[]> = {
    team_field: [
      'Keep exposure to sprinting, acceleration, and deceleration alive when healthy enough, because team-field fitness is not just generic cardio.',
    ],
    court: [
      'Preserve braking quality and repeatability of short explosive actions instead of chasing volume for its own sake.',
    ],
    endurance: [
      'Let easy work stay easy so quality sessions remain clearly high-quality instead of drifting into chronic medium-hard fatigue.',
    ],
    strength_power: [
      'Guard bar speed, jump quality, and fresh-force expression before adding extra accessory fatigue.',
    ],
    combat: [
      'Blend force, repeat effort, and contact tolerance while avoiding the trap of doing every hard quality in the same session.',
    ],
    precision: [
      'Protect steadiness, posture, and fine motor control because precision often disappears before obvious whole-body fatigue does.',
    ],
    aquatic: [
      'Keep technique linked to energy-system work so the athlete does not practice poor mechanics under fatigue.',
    ],
    mixed: [
      'Build the athlete around the highest match or event demands instead of defaulting to one-size-fits-all conditioning.',
    ],
  };

  return uniqueStrings([
    ...demands.map((demand) => PHYSIOLOGY_PRIORITIES[demand]),
    ...archetypeAdditions[archetype],
  ]).slice(0, 4);
}

function buildMentalPerformanceGuidance(
  input: AthleteScienceInput,
  context: ResolvedSportContext,
  demands: PhysiologicalDemand[]
): MentalPerformanceGuidance {
  const archetypeSkills: Record<SportArchetype, string[]> = {
    team_field: [
      'Use next-action language after mistakes so one bad play does not contaminate the next phase.',
      'Before high-speed or tactical work, narrow attention to one role cue and one scanning cue.',
    ],
    court: [
      'Reset quickly between rallies or possessions with breath, posture, and one clear tactical cue.',
      'Decision-heavy footwork days should avoid extra off-field cognitive clutter before the session.',
    ],
    endurance: [
      'Use pacing anchors and self-talk that separates discomfort from danger during longer work.',
      'Monitor monotony and mental drift, not only heart rate and mileage.',
    ],
    strength_power: [
      'Use the same intent ritual before heavy or explosive efforts so aggression stays organized.',
      'Mentally flat days should reduce complexity or total volume before they reduce technical quality.',
    ],
    combat: [
      'Control arousal between rounds or exchanges; the first task is composure, then aggression.',
      'Use one offensive intention and one defensive cue instead of chasing too many thoughts under pressure.',
    ],
    precision: [
      'Protect a repeatable routine: breath, anchor, external target, commit.',
      'Avoid changing caffeine or arousal strategy close to competition because fine motor control can destabilize fast.',
    ],
    aquatic: [
      'Link attention to stroke rhythm, turn quality, and breathing pattern so technique holds under fatigue.',
      'Use short focus resets before key sets instead of carrying frustration from the previous rep.',
    ],
    mixed: [
      'Keep the mental game simple: one cue for intent, one cue for execution, one cue for reset.',
      'Treat unusual irritability, apathy, or loss of enjoyment as performance-relevant signals, not background noise.',
    ],
  };

  const monitoring = uniqueStrings([
    ...demands.map((demand) => PSYCHOLOGY_PRIORITIES[demand]),
    'If concentration, confidence, or mood is slipping for several days, treat that as a load-management signal rather than a personality issue.',
    input.decision === 'RECOVER'
      ? 'Recovery days should also downshift cognitive load; the athlete does not need to stay mentally "on" all day to recover well.'
      : 'Performance days still need emotional control. The goal is ready and sharp, not frantic.',
  ]).slice(0, 4);

  return {
    summary:
      input.decision === 'RECOVER'
        ? `${context.positionData.name} performance today is more likely to improve from cognitive reset and routine quality than from forcing intensity.`
        : `${context.positionData.name} performance depends on mental control matching physical readiness, especially once pressure and fatigue rise.`,
    skills: uniqueStrings([
      ...demands.map((demand) => PSYCHOLOGY_PRIORITIES[demand]),
      ...archetypeSkills[context.archetype],
    ]).slice(0, 4),
    monitoring,
    references: [EVIDENCE.mentalFatigue, EVIDENCE.iocMentalHealth],
  };
}

function buildRecoveryGuidance(
  input: AthleteScienceInput,
  context: ResolvedSportContext,
  demands: PhysiologicalDemand[]
): RecoveryGuidance {
  const protocolTargets = context.sportData.recoveryProtocol?.targets || [];
  const riskHotspots = uniqueStrings([
    ...context.sportData.highRiskRegions,
    ...context.positionData.highRiskRegions,
  ]);

  return {
    summary:
      input.decision === 'RECOVER'
        ? `Recovery priority is ${context.sportData.recoveryProtocol?.priority || 'readiness restoration'}: lower the cost of today without letting the athlete go stale.`
        : `Recovery is part of the performance plan for ${context.positionData.name}, especially around ${riskHotspots.slice(0, 2).join(' and ').toLowerCase()}.`,
    priorities: uniqueStrings([
      context.sportData.recoveryProtocol?.priority
        ? `Primary recovery lens: ${context.sportData.recoveryProtocol.priority}.`
        : null,
      ...protocolTargets.map((item) => `Target: ${item}.`),
      ...demands.map((demand) => RECOVERY_PRIORITIES[demand]),
      riskHotspots.length
        ? `Tissue watch-list today: ${riskHotspots.slice(0, 3).join(', ')}.`
        : null,
    ]).slice(0, 5),
    monitoring: uniqueStrings([
      'Sleep debt, soreness asymmetry, and unusual irritability should all downshift load confidence.',
      'If pain climbs after the session or the next morning, the previous dose was too expensive.',
      input.decision === 'TRAIN'
        ? 'Hard days still need a clean recovery runway: hydration, post-session fuel, and enough quiet time to sleep well.'
        : 'Recovery days should preserve circulation, tissue quality, and confidence without adding hidden stress.',
    ]).slice(0, 3),
    references: [EVIDENCE.athleteSleep, EVIDENCE.mentalFatigue],
  };
}

function buildNutritionGuidance(
  input: AthleteScienceInput,
  context: ResolvedSportContext,
  demands: PhysiologicalDemand[]
): PerformanceNutritionGuidance {
  const sportFueling =
    context.sportData.competitionProtocol?.nutrition ||
    'Fuel should match the true demand of the session, not just the length of time spent training.';

  const timing = [
    input.decision === 'TRAIN'
      ? 'Go into the key session fed enough to protect quality, especially when the work is fast, long, or highly technical.'
      : 'Use the lighter day to restore carbohydrate, protein, and hydration rather than accidentally under-fueling recovery.',
    'Distribute protein across the day and keep the biggest recovery feed close enough to training to support repair and glycogen restoration.',
    'In hot, humid, or very long sessions, match fluids with sodium and not plain water only.',
  ];

  if (context.archetype === 'combat') {
    timing.push('Avoid unsupervised aggressive weight-cutting; it can degrade both performance and recovery quality.');
  }

  if (context.archetype === 'precision') {
    timing.push('Keep caffeine and meal timing stable before competition so fine motor control and attention do not swing unexpectedly.');
  }

  return {
    summary:
      `${context.sportData.name} fueling should support ${context.positionData.name.toLowerCase()} demands, not just general fitness. ${sportFueling}`,
    priorities: uniqueStrings([
      ...demands.map((demand) => NUTRITION_PRIORITIES[demand]),
      context.sportData.competitionProtocol?.nutrition || null,
    ]).slice(0, 4),
    timing: uniqueStrings(timing).slice(0, 4),
    references: [EVIDENCE.nutrientTiming, EVIDENCE.aisSupplements],
  };
}

function buildSportPositionProfile(
  input: AthleteScienceInput,
  context: ResolvedSportContext,
  demands: PhysiologicalDemand[]
): AthleteSportPositionProfile {
  const template = context.sportData.precisionTemplates[context.readinessState];
  const drills = context.positionData.drills?.[context.readinessState] || [];
  const riskHotspots = uniqueStrings([
    ...context.sportData.highRiskRegions,
    ...context.positionData.highRiskRegions,
  ]);

  const demandLabels = demands.map((demand) => `${DEMAND_MAP[demand].name}: ${DEMAND_MAP[demand].description}`);

  return {
    sportKey: context.sportKey,
    sportName: context.sportData.name,
    positionName: context.positionData.name,
    archetype: describeArchetype(context.archetype),
    summary:
      input.decision === 'RECOVER'
        ? `${context.positionData.name} should keep sport feel and role clarity today without paying the full price of chaos, speed, or impact.`
        : `${context.positionData.name} needs a plan that protects the highest demands of the role while directing today's readiness toward the right kind of work.`,
    demandKeys: demands,
    demands: demandLabels.slice(0, 4),
    physiologyPriorities: buildPhysiologyPriorities(demands, context.archetype),
    riskHotspots: riskHotspots.slice(0, 4),
    generalRecommendations: uniqueStrings([
      template.what,
      template.how,
      template.why,
      context.sportData.dashboardFocus
        ? `Primary dashboard focus: ${context.sportData.dashboardFocus}.`
        : null,
      context.sportData.competitionProtocol?.focus
        ? `Competition lens: ${context.sportData.competitionProtocol.focus}.`
        : null,
    ]).slice(0, 5),
    positionRecommendations: uniqueStrings([
      drills[0] ? `Role-specific drill: ${drills[0]}.` : null,
      drills[1] ? `Secondary drill: ${drills[1]}.` : null,
      context.positionData.specificDemands[0]
        ? `${context.positionData.name} outcome is strongly driven by ${DEMAND_MAP[context.positionData.specificDemands[0]].name.toLowerCase()}, so protect that quality first.`
        : null,
      context.positionData.specificDemands[1]
        ? `Secondary role lens: ${DEMAND_MAP[context.positionData.specificDemands[1]].name.toLowerCase()} still has to hold up when fatigue appears.`
        : null,
    ]).slice(0, 4),
    references: sportReferences(context.sportKey, context.archetype),
  };
}

function buildSupplementRecommendations(input: AthleteScienceInput): SupplementRecommendation[] {
  const sport = normalizeSport(input.sport);
  const goal = normalizeGoal(input.primaryGoal);
  const supplements: SupplementRecommendation[] = [];
  const under18 = typeof input.age === 'number' && input.age < 18;

  if (isStrengthSport(sport) || isTeamFieldSport(sport) || isCourtSport(sport) || goal === 'strength') {
    supplements.push({
      name: 'Creatine Monohydrate',
      status: under18 ? 'trial_in_training' : 'consider',
      category: 'performance',
      useCase: 'Best fit for repeated power output, lean-mass support, and heavy training or rehab blocks.',
      protocol: 'Typical evidence-based options are about 3-5 g/day, or a short loading phase around 0.3 g/kg/day for 5-7 days before maintenance.',
      caution: under18
        ? 'Do not use casually in younger athletes. Only consider with clinician, guardian, and qualified sports-dietitian oversight.'
        : 'Use third-party tested product only, and do not expect creatine to replace sleep, calories, or progressive loading.',
      references: [EVIDENCE.creatine, EVIDENCE.aisSupplements],
    });
  }

  if ((input.isMatchDay || input.decision === 'TRAIN') && input.painLevel < 4) {
    supplements.push({
      name: 'Caffeine',
      status: input.decision === 'RECOVER' ? 'avoid_today' : 'trial_in_training',
      category: 'competition',
      useCase: 'Useful when alertness, repeated sprint ability, or high-quality output matters most.',
      protocol: 'Most evidence-supported protocols sit around 3-6 mg/kg taken about 30-60 minutes before the target session or event, individualized for tolerance.',
      caution: 'Avoid new caffeine strategies on competition day, avoid late-day dosing when sleep may suffer, and reduce or skip if the athlete is anxious or jitter-prone.',
      references: [EVIDENCE.caffeine, EVIDENCE.aisSupplements],
    });
  }

  if (isTeamFieldSport(sport) || isCourtSport(sport) || /(swimming|rowing|combat)/.test(sport)) {
    supplements.push({
      name: 'Beta-Alanine',
      status: 'consider',
      category: 'performance',
      useCase: 'Most relevant for repeated hard efforts or continuous intense efforts lasting roughly 1-4 minutes.',
      protocol: 'Use as a chronic block, not an acute booster. Practical protocols commonly build with split daily doses over several weeks.',
      caution: 'Expect tingling if doses are too large at once. Split dosing and trial it in training, not right before an important event.',
      references: [EVIDENCE.betaAlanine, EVIDENCE.aisSupplements],
    });
  }

  if ((isTeamFieldSport(sport) || isCourtSport(sport) || /(swimming|rowing|combat|middle distance|800|1500)/.test(sport)) && input.decision !== 'RECOVER') {
    supplements.push({
      name: 'Sodium Bicarbonate',
      status: 'trial_in_training',
      category: 'competition',
      useCase: 'Most relevant for high-intensity efforts with substantial acidosis, especially repeated bouts or events lasting about 30 seconds to 12 minutes.',
      protocol: 'Evidence-supported acute protocols usually center around 0.2-0.3 g/kg taken 60-180 minutes before the session, with smaller split-dose options to reduce GI stress.',
      caution: 'High GI risk. Never first-use on competition day. Trial alongside normal fueling and only if the athlete tolerates it well.',
      references: [EVIDENCE.sodiumBicarbonate, EVIDENCE.aisSupplements],
    });
  }

  return supplements.slice(0, 3);
}

function buildConditioningGuidance(input: AthleteScienceInput): ConditioningGuidance {
  const sport = normalizeSport(input.sport);

  if (isTeamFieldSport(sport)) {
    return {
      archetype: 'Repeated sprint + high-speed running',
      todayFit:
        input.decision === 'TRAIN'
          ? 'Today should preserve or develop repeated sprint ability, high-speed exposure, and deceleration tolerance.'
          : 'Today should protect soft tissue while keeping some aerobic or movement continuity so speed exposure is not lost for too long.',
      priorities: [
        'Maintain weekly exposure to high-speed running when healthy enough to tolerate it.',
        'Build acceleration, deceleration, and braking capacity, not just straight-line conditioning.',
        'Keep an aerobic base strong enough to repeat intense efforts late in sessions or matches.',
      ],
      loadWarnings: [
        'Do not stack maximal sprinting on top of poor hamstring readiness or major eccentric soreness.',
        'Knee-risk profiles need extra control on heavy deceleration and cutting days.',
      ],
      references: [EVIDENCE.soccerDemand, EVIDENCE.teamSportDecel],
    };
  }

  if (isCourtSport(sport)) {
    return {
      archetype: sport.includes('tennis') ? 'Change-of-direction + rally repeatability' : 'Acceleration-deceleration repeatability',
      todayFit:
        input.decision === 'TRAIN'
          ? 'Today should build repeatability of fast actions without letting movement quality collapse.'
          : 'Today should lower joint stress while keeping footwork, tissue stiffness, and coordination online.',
      priorities: [
        'Condition the athlete for repeated short bursts with crisp recovery between efforts.',
        'Train braking and lateral movement quality, not just generic cardio.',
        'Pair conditioning with trunk and shoulder robustness when racket or overhead volume is relevant.',
      ],
      loadWarnings: [
        'When readiness is low, reduce chaotic change-of-direction exposure before you reduce all movement.',
        'Shoulder-irritable athletes need overhead volume kept submaximal before match days.',
      ],
      references: sport.includes('tennis')
        ? [EVIDENCE.tennisDemand, EVIDENCE.teamSportDecel]
        : [EVIDENCE.teamSportDecel],
    };
  }

  if (isEnduranceSport(sport)) {
    return {
      archetype: 'Aerobic base + threshold/quality distribution',
      todayFit:
        input.decision === 'TRAIN'
          ? 'Today should respect a pyramidal or polarized structure: most work easy, with a clearly defined quality target when intensity is prescribed.'
          : 'Today should keep easy aerobic continuity and technique while avoiding junk-threshold volume.',
      priorities: [
        'Anchor weekly load with mostly low-intensity aerobic volume.',
        'Use threshold or VO2max work deliberately instead of turning every session into moderate-hard gray-zone work.',
        'Protect durability with enough easy volume between hard sessions.',
      ],
      loadWarnings: [
        'Low-readiness days should not become hidden threshold sessions.',
        'Pain or sharp fatigue should push the athlete toward easy aerobic work or recovery, not forced volume.',
      ],
      references: [EVIDENCE.enduranceDistribution],
    };
  }

  return {
    archetype: 'Strength-power primary with aerobic support',
    todayFit:
      input.decision === 'TRAIN'
        ? 'Today should prioritize neural quality and force output, with just enough conditioning to support recovery and work capacity.'
        : 'Today should lower bar speed or loading stress while preserving movement quality and basic aerobic support.',
    priorities: [
      'Keep the highest-quality strength and power work early while fresh.',
      'Use light aerobic work to support recovery rather than compete with force production.',
      'Progress conditioning only when it does not blunt primary strength adaptations.',
    ],
    loadWarnings: [
      'Do not let fatigue-driven conditioning erase bar-speed quality.',
      'Poor sleep or pain should reduce intensity before chasing extra volume.',
    ],
    references: [EVIDENCE.creatine],
  };
}

function buildInjuryReturnGuidance(input: AthleteScienceInput): InjuryReturnGuidance | null {
  const rehab = input.rehab;
  if (!rehab?.injuryType) return null;

  const injuryType = String(rehab.injuryType).toUpperCase();

  if (injuryType === 'ANKLE') {
    return {
      injuryType: 'Lateral Ankle / Ankle Complex',
      phaseLabel: rehab.label,
      progressCriteria: [
        'Pain stays controlled during and after loading.',
        'Ankle impairments are improving: range, swelling, and strength are acceptable for the phase.',
        'Athlete perception is positive: confidence and psychological readiness are not lagging badly.',
        'Sensorimotor control and sport-specific hopping/cutting tasks are clean enough for the next step.',
      ],
      holdCriteria: [
        'Swelling or pain spikes after field or court exposure.',
        'Single-leg control degrades under speed or fatigue.',
      ],
      competitionGate: 'Return-to-sport should satisfy PAASS-style domains, not just pain at rest.',
      references: [EVIDENCE.anklePaass, EVIDENCE.bernReturn],
    };
  }

  if (injuryType === 'ACL' || injuryType === 'KNEE') {
    return {
      injuryType: 'ACL / Knee',
      phaseLabel: rehab.label,
      progressCriteria: [
        'Full or near-full range of motion with quiet swelling response.',
        'Strength and hop performance are near-symmetric and stable enough for the target sport.',
        'Athlete demonstrates psychological readiness, not just physical clearance.',
        'Cutting, deceleration, and sport-chaos exposure are rebuilt progressively before competition.',
      ],
      holdCriteria: [
        'Recurrent swelling, buckling, or loss of confidence under speed.',
        'Passing time alone without meeting objective movement and strength criteria.',
      ],
      competitionGate: 'ACL return should be criterion-based, not time-only, and should include physical plus psychological readiness.',
      references: [EVIDENCE.aclPanther, EVIDENCE.bernReturn],
    };
  }

  if (injuryType === 'SHOULDER') {
    return {
      injuryType: 'Shoulder',
      phaseLabel: rehab.label,
      progressCriteria: [
        'Range of motion is restored enough for sport demands.',
        'Strength and functional upper-extremity testing are back to acceptable levels.',
        'Overhead or contact-specific tasks are reintroduced progressively, not all at once.',
        'Sport-specific functional performance is clean before unrestricted practice.',
      ],
      holdCriteria: [
        'Pain returns during throwing, pressing, or overhead loading.',
        'Compensation appears in trunk or scapular control during higher-speed tasks.',
      ],
      competitionGate: 'Shoulder return should be sequential and criterion-based, with different testing demands for overhead versus contact athletes.',
      references: [EVIDENCE.shoulderCriteria, EVIDENCE.bernReturn],
    };
  }

  return {
    injuryType: 'Hamstring / Posterior Chain',
    phaseLabel: rehab.label,
    progressCriteria: [
      'Sprint, hinge, and lengthened hamstring work are pain-controlled at the current speed or load.',
      'Eccentric strength and running exposure are progressing without next-day flare.',
      'The athlete is reacquiring high-speed exposure before full return, not skipping straight from gym work to competition.',
      'Confidence in top-speed running and deceleration is returning alongside objective function.',
    ],
    holdCriteria: [
      'Pain spikes during acceleration or top-speed exposures.',
      'High-speed running has been absent too long to safely jump back into full match demand.',
    ],
    competitionGate: 'Hamstring return should restore pain-free strength and progressive high-speed running exposure before unrestricted play.',
    references: [EVIDENCE.bernReturn, EVIDENCE.soccerDemand],
  };
}

export function buildAthleteScientificContext(input: AthleteScienceInput): AthleteScientificContext {
  const resolved = resolveSportContext(input);
  const demands = extractDemandProfile(resolved.sportData, resolved.positionData);
  const supplements = buildSupplementRecommendations(input);
  const conditioning = buildConditioningGuidance(input);
  const injuryReturn = buildInjuryReturnGuidance(input);
  const sportProfile = buildSportPositionProfile(input, resolved, demands);
  const psychology = buildMentalPerformanceGuidance(input, resolved, demands);
  const recovery = buildRecoveryGuidance(input, resolved, demands);
  const nutrition = buildNutritionGuidance(input, resolved, demands);

  const evidence = mergeEvidenceReferences(
    sportProfile.references,
    conditioning.references,
    psychology.references,
    recovery.references,
    nutrition.references,
    ...supplements.map((item) => item.references),
    injuryReturn ? injuryReturn.references : []
  );

  return {
    summary:
      input.decision === 'RECOVER'
        ? `${resolved.positionData.name} is on a recovery-biased day, so CREEDA is protecting sport feel, recovery quality, and return-to-play guardrails instead of forcing generic work.`
        : `${resolved.sportData.name} ${resolved.positionData.name} guidance now combines sport-demand conditioning, role-specific recommendations, mental-performance coaching, recovery logic, and evidence-backed nutrition support.`,
    antiDopingNote:
      'Supplements are optional, not mandatory. Use third-party tested products only and keep all ergogenic strategies inside a supervised anti-doping-safe process.',
    evidence,
    supplements,
    conditioning,
    injuryReturn,
    sportProfile,
    psychology,
    recovery,
    nutrition,
  };
}
