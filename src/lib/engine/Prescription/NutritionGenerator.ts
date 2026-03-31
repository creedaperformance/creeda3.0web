import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { buildNutritionFramework } from './SportsScienceKnowledge';
import type {
  AthleteSportPositionProfile,
  PerformanceNutritionGuidance,
} from './AthleteScienceContext';

export interface MacroTarget {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface RecommendedMeal {
  mealType: string;
  name: string;
  macros: MacroTarget;
  foods: string[];
  portionSizeGrams: number;
  isSwapCandidate?: boolean;
  coachingNote?: string;
  mealWindow?: string;
}

export interface Constraints {
  isVeg: boolean;
  isVegan: boolean;
  isJain: boolean;
  allergies: string[];
  dislikes: string[];
}

type DietProfile = 'omni' | 'veg' | 'vegan' | 'jain';
type MealSlot = 'Breakfast' | 'Lunch' | 'Snack' | 'Dinner';
type MealDistribution = Record<MealSlot, number>;

interface MealTemplate {
  name: string;
  foods: string[];
  diets: DietProfile[];
  goals: string[];
  activityBias?: string[];
  sportTags?: string[];
  coachingNote: string;
}

interface AthleteMealContext {
  sessionType?: 'TRAIN' | 'MODIFY' | 'RECOVER';
  sport?: string;
  position?: string;
  sportProfile?: AthleteSportPositionProfile | null;
  nutritionGuidance?: PerformanceNutritionGuidance | null;
}

const DEFAULT_CONSTRAINTS: Constraints = {
  isVeg: false,
  isVegan: false,
  isJain: false,
  allergies: [],
  dislikes: [],
};

const MEAL_LIBRARY: Record<MealSlot, MealTemplate[]> = {
  Breakfast: [
    {
      name: 'Egg Bhurji and Multigrain Toast',
      foods: ['Egg bhurji', 'Multigrain toast', 'Fruit'],
      diets: ['omni'],
      goals: ['muscle_gain', 'general_fitness', 'fat_loss'],
      coachingNote: 'High-protein breakfast to steady energy and reduce mid-morning crashes.',
    },
    {
      name: 'Moong Dal Chilla with Curd',
      foods: ['Moong dal chilla', 'Curd', 'Mint chutney'],
      diets: ['veg', 'jain'],
      goals: ['fat_loss', 'general_fitness', 'muscle_gain'],
      coachingNote: 'Easy Indian protein breakfast that works well for office and college schedules.',
    },
    {
      name: 'Tofu Poha Bowl',
      foods: ['Poha', 'Tofu', 'Peanuts', 'Lime'],
      diets: ['vegan'],
      goals: ['general_fitness', 'endurance', 'fat_loss'],
      coachingNote: 'Balanced breakfast with easy carbs and enough protein for a busy day.',
    },
    {
      name: 'Oats and Banana Recovery Bowl',
      foods: ['Oats', 'Milk', 'Banana', 'Seeds'],
      diets: ['omni', 'veg'],
      goals: ['endurance', 'sport_specific', 'general_fitness'],
      activityBias: ['active', 'athlete'],
      sportTags: ['endurance', 'team_field', 'court', 'aquatic'],
      coachingNote: 'Higher-carb breakfast to support heavier training or more active routines.',
    },
  ],
  Lunch: [
    {
      name: 'Chicken Rice and Sabzi Plate',
      foods: ['Chicken breast', 'Rice', 'Seasonal sabzi', 'Salad'],
      diets: ['omni'],
      goals: ['muscle_gain', 'sport_specific', 'general_fitness'],
      sportTags: ['team_field', 'court', 'strength_power', 'combat'],
      coachingNote: 'Simple protein-plus-carb lunch that supports performance without feeling too heavy.',
    },
    {
      name: 'Rajma Rice and Curd Bowl',
      foods: ['Rajma', 'Rice', 'Curd', 'Salad'],
      diets: ['veg'],
      goals: ['general_fitness', 'endurance', 'muscle_gain'],
      sportTags: ['endurance', 'team_field', 'court'],
      coachingNote: 'Indian staple meal with good satiety, fibre, and recovery support.',
    },
    {
      name: 'Tofu Millet Khichdi Bowl',
      foods: ['Millet khichdi', 'Tofu', 'Vegetables', 'Coconut chutney'],
      diets: ['vegan'],
      goals: ['fat_loss', 'general_fitness', 'endurance'],
      sportTags: ['precision', 'mixed', 'recovery'],
      coachingNote: 'Lighter lunch that keeps energy stable through long work blocks.',
    },
    {
      name: 'Lauki Moong Comfort Plate',
      foods: ['Moong dal', 'Rice', 'Lauki sabzi', 'Curd'],
      diets: ['jain'],
      goals: ['fat_loss', 'general_fitness', 'recovery'],
      sportTags: ['precision', 'recovery'],
      coachingNote: 'Digestive-friendly lunch for lower-stress recovery days.',
    },
  ],
  Snack: [
    {
      name: 'Greek Yogurt Fruit Cup',
      foods: ['Greek yogurt', 'Banana', 'Seeds'],
      diets: ['veg', 'omni'],
      goals: ['muscle_gain', 'general_fitness', 'fat_loss'],
      sportTags: ['strength_power', 'precision', 'court'],
      coachingNote: 'Fast protein snack that is easy to fit between calls, classes, or commutes.',
    },
    {
      name: 'Roasted Chana and Fruit',
      foods: ['Roasted chana', 'Apple', 'Coconut water'],
      diets: ['veg', 'vegan', 'jain', 'omni'],
      goals: ['fat_loss', 'general_fitness', 'endurance'],
      sportTags: ['endurance', 'precision', 'recovery'],
      coachingNote: 'Portable snack for Indian workdays when convenience matters.',
    },
    {
      name: 'Paneer Roll-Up',
      foods: ['Paneer', 'Whole wheat roti', 'Cucumber'],
      diets: ['veg', 'jain'],
      goals: ['muscle_gain', 'sport_specific'],
      sportTags: ['strength_power', 'combat', 'team_field'],
      coachingNote: 'Higher-protein snack when strength or muscle gain is the priority.',
    },
    {
      name: 'Soy Makhana Mix',
      foods: ['Roasted makhana', 'Soy nuts', 'Fruit'],
      diets: ['vegan'],
      goals: ['muscle_gain', 'general_fitness'],
      sportTags: ['strength_power', 'precision'],
      coachingNote: 'Protein-supportive vegan snack with better satiety than biscuits or packaged snacks.',
    },
  ],
  Dinner: [
    {
      name: 'Fish, Rice, and Vegetable Plate',
      foods: ['Fish curry', 'Rice', 'Vegetable stir-fry'],
      diets: ['omni'],
      goals: ['endurance', 'general_fitness', 'fat_loss'],
      sportTags: ['endurance', 'aquatic', 'recovery'],
      coachingNote: 'Balanced dinner for recovery without a very heavy late-night load.',
    },
    {
      name: 'Paneer, Roti, and Dal Plate',
      foods: ['Paneer tikka', 'Whole wheat roti', 'Dal', 'Sabzi'],
      diets: ['veg'],
      goals: ['muscle_gain', 'general_fitness', 'sport_specific'],
      sportTags: ['team_field', 'court', 'strength_power', 'combat'],
      coachingNote: 'Solid Indian dinner for protein, recovery, and better overnight satiety.',
    },
    {
      name: 'Tofu Stir-Fry Millet Bowl',
      foods: ['Tofu', 'Millet', 'Sauteed vegetables'],
      diets: ['vegan'],
      goals: ['fat_loss', 'general_fitness'],
      sportTags: ['precision', 'mixed', 'recovery'],
      coachingNote: 'Lighter plant-based dinner that still protects protein intake.',
    },
    {
      name: 'Jain Paneer Millet Plate',
      foods: ['Paneer', 'Millet roti', 'Bottle gourd sabzi', 'Curd'],
      diets: ['jain'],
      goals: ['general_fitness', 'muscle_gain', 'fat_loss'],
      sportTags: ['recovery', 'precision'],
      coachingNote: 'Recovery-focused Jain dinner built around familiar foods.',
    },
  ],
};

export class NutritionGenerator {
  async buildDailyNutrition(
    userId: string,
    goal: string,
    weightKg: number,
    heightCm: number,
    age: number,
    timingPreference: 'EARLY' | 'LATE' | 'IF' = 'EARLY',
    activityLevel: string = 'moderate',
    biologicalSex: string = 'unknown',
    pathwayType?: string,
    athleteContext?: AthleteMealContext
  ): Promise<RecommendedMeal[]> {
    const framework = this.applyAthleteDayAdjustments(
      buildNutritionFramework({
        goal,
        activityLevel,
        weightKg,
        heightCm,
        age,
        biologicalSex,
        pathwayType,
      }),
      athleteContext
    );
    const constraints = await this.fetchConstraints(userId);
    const dietProfile = this.resolveDietProfile(constraints);
    const distribution = this.resolveDistribution(timingPreference, athleteContext);

    const slots: MealSlot[] = ['Breakfast', 'Lunch', 'Snack', 'Dinner'];

    const plan = slots.map((slot) => {
      const share = distribution[slot];
      if (share === 0) {
        return {
          mealType: slot,
          name: 'Fasting Window',
          macros: { calories: 0, protein: 0, carbs: 0, fats: 0 },
          foods: ['Water', 'Unsweetened tea or coffee'],
          portionSizeGrams: 0,
          isSwapCandidate: false,
          coachingNote: 'Use this window only if fasting already fits your routine and recovery stays stable.',
          mealWindow: this.resolveMealWindow(slot, timingPreference),
        } satisfies RecommendedMeal;
      }

      const template = this.selectMealTemplate(slot, goal, activityLevel, dietProfile, constraints, athleteContext);
      const mealMacros = this.scaleMacros(
        {
          calories: framework.calories,
          protein: framework.proteinTarget,
          carbs: framework.carbTarget,
          fats: framework.fatTarget,
        },
        share
      );

      const sportNote = this.buildSportMealNote(slot, athleteContext);

      return {
        mealType: slot,
        name: template.name,
        macros: mealMacros,
        foods: template.foods,
        portionSizeGrams: this.estimatePortionSize(mealMacros, slot),
        isSwapCandidate: true,
        coachingNote: `${template.coachingNote} Aim for about ${framework.proteinPerFeeding} g protein in this feeding window when possible.${sportNote}`,
        mealWindow: this.resolveMealWindow(slot, timingPreference),
      } satisfies RecommendedMeal;
    });

    return this.runConstraintProcessor(plan, constraints, dietProfile);
  }

  private applyAthleteDayAdjustments(
    framework: ReturnType<typeof buildNutritionFramework>,
    athleteContext?: AthleteMealContext
  ) {
    if (!athleteContext?.sportProfile) return framework;

    const demandKeys = athleteContext.sportProfile.demandKeys || [];
    const isHighCarbDemand = demandKeys.some((item) =>
      ['Aerobic Endurance', 'Anaerobic Capacity', 'Fatigue Resistance', 'Explosive Power', 'Agility'].includes(item)
    );
    const isStrengthDemand = demandKeys.includes('Strength');

    let calories = framework.calories;
    let carbTarget = framework.carbTarget;
    let proteinTarget = framework.proteinTarget;

    if (athleteContext.sessionType === 'TRAIN') {
      if (isHighCarbDemand) {
        calories = Math.round(calories * 1.06);
        carbTarget = Math.round(carbTarget * 1.12);
      } else if (isStrengthDemand) {
        calories = Math.round(calories * 1.04);
        carbTarget = Math.round(carbTarget * 1.06);
        proteinTarget = Math.round(proteinTarget * 1.03);
      }
    }

    if (athleteContext.sessionType === 'RECOVER') {
      calories = Math.round(calories * 0.96);
      carbTarget = Math.round(carbTarget * 0.94);
      proteinTarget = Math.round(proteinTarget * 1.02);
    }

    return {
      ...framework,
      calories,
      carbTarget,
      proteinTarget,
    };
  }

  private resolveDistribution(timingPreference: 'EARLY' | 'LATE' | 'IF', athleteContext?: AthleteMealContext): MealDistribution {
    const base: MealDistribution =
      timingPreference === 'IF'
        ? { Breakfast: 0, Lunch: 0.42, Snack: 0.18, Dinner: 0.4 }
        : timingPreference === 'LATE'
          ? { Breakfast: 0.18, Lunch: 0.28, Snack: 0.12, Dinner: 0.42 }
          : { Breakfast: 0.3, Lunch: 0.35, Snack: 0.12, Dinner: 0.23 };

    if (!athleteContext?.sportProfile) return base;

    const demandKeys = athleteContext.sportProfile.demandKeys || [];
    if (athleteContext.sessionType === 'TRAIN' && demandKeys.some((item) => ['Aerobic Endurance', 'Anaerobic Capacity', 'Fatigue Resistance'].includes(item))) {
      return { Breakfast: 0.31, Lunch: 0.34, Snack: 0.17, Dinner: 0.18 } as const;
    }

    if (athleteContext.sessionType === 'RECOVER') {
      return { Breakfast: 0.27, Lunch: 0.31, Snack: 0.14, Dinner: 0.28 } as const;
    }

    return base;
  }

  private scaleMacros(target: MacroTarget, share: number): MacroTarget {
    return {
      calories: Math.round(target.calories * share),
      protein: Math.max(10, Math.round(target.protein * share)),
      carbs: Math.max(10, Math.round(target.carbs * share)),
      fats: Math.max(4, Math.round(target.fats * share)),
    };
  }

  private estimatePortionSize(macros: MacroTarget, slot: MealSlot) {
    const density =
      slot === 'Snack' ? 1.7 :
      slot === 'Breakfast' ? 1.45 :
      1.35;
    return Math.max(140, Math.round(macros.calories / density));
  }

  private resolveDietProfile(constraints: Constraints): DietProfile {
    if (constraints.isJain) return 'jain';
    if (constraints.isVegan) return 'vegan';
    if (constraints.isVeg) return 'veg';
    return 'omni';
  }

  private selectMealTemplate(
    slot: MealSlot,
    goal: string,
    activityLevel: string,
    dietProfile: DietProfile,
    constraints: Constraints,
    athleteContext?: AthleteMealContext
  ) {
    const blockedTerms = [...constraints.allergies, ...constraints.dislikes].map((item) => item.trim().toLowerCase());
    const sportTags = this.resolveSportTags(athleteContext);
    const options = MEAL_LIBRARY[slot]
      .filter((option) => option.diets.includes(dietProfile) || (dietProfile === 'veg' && option.diets.includes('omni') === false))
      .map((option) => {
        let score = 0;
        if (option.goals.includes(goal)) score += 4;
        if (option.activityBias?.includes(activityLevel)) score += 2;
        if (sportTags.some((tag) => option.sportTags?.includes(tag))) score += 3;
        if (blockedTerms.some((term) => option.foods.some((food) => food.toLowerCase().includes(term)))) score -= 5;
        return { option, score };
      })
      .sort((a, b) => b.score - a.score);

    return (options[0] || { option: MEAL_LIBRARY[slot][0], score: 0 }).option;
  }

  private resolveSportTags(athleteContext?: AthleteMealContext) {
    if (!athleteContext?.sportProfile) return [];

    const demandKeys = athleteContext.sportProfile.demandKeys || [];
    const sportKey = String(athleteContext.sportProfile.sportKey || athleteContext.sport || '').toLowerCase();
    const tags = [
      athleteContext.sportProfile.archetype.toLowerCase().includes('team') ? 'team_field' : null,
      athleteContext.sportProfile.archetype.toLowerCase().includes('court') ? 'court' : null,
      athleteContext.sportProfile.archetype.toLowerCase().includes('endurance') ? 'endurance' : null,
      athleteContext.sportProfile.archetype.toLowerCase().includes('strength') ? 'strength_power' : null,
      athleteContext.sportProfile.archetype.toLowerCase().includes('combat') ? 'combat' : null,
      athleteContext.sportProfile.archetype.toLowerCase().includes('precision') ? 'precision' : null,
      athleteContext.sportProfile.archetype.toLowerCase().includes('aquatic') ? 'aquatic' : null,
      /(cricket|shooting|archery|golf)/.test(sportKey) ? 'precision' : null,
      demandKeys.some((item) => ['Aerobic Endurance', 'Fatigue Resistance'].includes(item)) ? 'endurance' : null,
      demandKeys.some((item) => ['Explosive Power', 'Agility', 'Reaction Time'].includes(item)) ? 'court' : null,
      athleteContext.sessionType === 'RECOVER' ? 'recovery' : null,
    ].filter((item): item is string => Boolean(item));

    return [...new Set(tags)];
  }

  private buildSportMealNote(slot: MealSlot, athleteContext?: AthleteMealContext) {
    if (!athleteContext?.sportProfile) return '';

    const priority = athleteContext.nutritionGuidance?.priorities[0];
    const timing = athleteContext.nutritionGuidance?.timing[0];

    if (slot === 'Snack' && athleteContext.sessionType === 'TRAIN' && timing) {
      return ` ${athleteContext.sportProfile.positionName} fueling lens: ${timing}`;
    }

    if ((slot === 'Breakfast' || slot === 'Lunch') && priority) {
      return ` ${athleteContext.sportProfile.positionName} nutrition lens: ${priority}`;
    }

    if (slot === 'Dinner' && athleteContext.sessionType === 'RECOVER' && timing) {
      return ` Recovery lens: ${timing}`;
    }

    return '';
  }

  private resolveMealWindow(slot: MealSlot, timingPreference: 'EARLY' | 'LATE' | 'IF') {
    if (slot === 'Breakfast') return timingPreference === 'IF' ? 'Skipped morning meal' : '7-9 AM';
    if (slot === 'Lunch') return '12-2 PM';
    if (slot === 'Snack') return '4-6 PM';
    return timingPreference === 'LATE' ? '8-10 PM' : '7-9 PM';
  }

  private async fetchConstraints(userId: string): Promise<Constraints> {
    try {
      const supabase = await this.getSupabaseClient();
      const { data: record } = await supabase
        .from('user_dietary_constraints')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      return {
        isVeg: record?.diet_type === 'veg',
        isVegan: record?.diet_type === 'vegan',
        isJain: record?.diet_type === 'jain',
        allergies: Array.isArray(record?.allergies) ? record.allergies : [],
        dislikes: Array.isArray(record?.dislikes) ? record.dislikes : [],
      };
    } catch (error) {
      console.warn('[NutritionGenerator] Falling back to default constraints:', error);
      return DEFAULT_CONSTRAINTS;
    }
  }

  private async getSupabaseClient() {
    if (typeof window === 'undefined') {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !key) {
        throw new Error('Supabase environment variables missing for nutrition generator.');
      }
      return createSupabaseClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    }

    const { createClient } = await import('@/lib/supabase/client');
    return createClient();
  }

  private async runConstraintProcessor(
    meals: RecommendedMeal[],
    constraints: Constraints,
    dietProfile: DietProfile
  ): Promise<RecommendedMeal[]> {
    const blockedTerms = [...constraints.allergies, ...constraints.dislikes].map((item) => item.trim().toLowerCase());
    const replacementMap: Record<string, string> = {
      egg: dietProfile === 'vegan' ? 'Tofu scramble' : 'Paneer bhurji',
      chicken: 'Paneer tikka',
      fish: 'Tofu',
      yogurt: dietProfile === 'vegan' ? 'Soy yogurt' : 'Curd',
      curd: dietProfile === 'vegan' ? 'Soy yogurt' : 'Curd',
      paneer: dietProfile === 'vegan' ? 'Tofu' : 'Paneer',
      milk: dietProfile === 'vegan' ? 'Soy milk' : 'Milk',
      peanut: 'Seeds',
      soy: 'Roasted chana',
    };

    return meals.map((meal) => {
      const filteredFoods = meal.foods
        .map((food) => {
          const normalized = food.toLowerCase();
          const blocked = blockedTerms.find((term) => normalized.includes(term));
          if (!blocked) return food;
          return replacementMap[blocked] || null;
        })
        .filter((food): food is string => Boolean(food));

      const jainFiltered = constraints.isJain
        ? filteredFoods.filter((food) => !/(onion|garlic|potato)/i.test(food))
        : filteredFoods;

      const foods = jainFiltered.length ? jainFiltered : this.getFallbackFoods(dietProfile, meal.mealType as MealSlot);
      const noteSuffix =
        foods.join('|') !== meal.foods.join('|')
          ? ' Adjusted for your dietary preferences.'
          : '';

      return {
        ...meal,
        foods,
        coachingNote: `${meal.coachingNote || 'Balanced meal recommendation.'}${noteSuffix}`,
      };
    });
  }

  private getFallbackFoods(dietProfile: DietProfile, slot: MealSlot) {
    const fallbackMap: Record<DietProfile, Record<MealSlot, string[]>> = {
      omni: {
        Breakfast: ['Eggs', 'Toast', 'Fruit'],
        Lunch: ['Chicken', 'Rice', 'Vegetables'],
        Snack: ['Greek yogurt', 'Fruit'],
        Dinner: ['Fish or chicken', 'Roti or rice', 'Vegetables'],
      },
      veg: {
        Breakfast: ['Moong dal chilla', 'Curd'],
        Lunch: ['Dal', 'Rice', 'Sabzi'],
        Snack: ['Roasted chana', 'Fruit'],
        Dinner: ['Paneer', 'Roti', 'Vegetables'],
      },
      vegan: {
        Breakfast: ['Tofu', 'Poha', 'Fruit'],
        Lunch: ['Millets', 'Tofu', 'Vegetables'],
        Snack: ['Makhana', 'Fruit'],
        Dinner: ['Tofu', 'Millets', 'Vegetables'],
      },
      jain: {
        Breakfast: ['Moong dal chilla', 'Curd'],
        Lunch: ['Moong dal', 'Rice', 'Lauki sabzi'],
        Snack: ['Roasted chana', 'Fruit'],
        Dinner: ['Paneer', 'Millet roti', 'Bottle gourd sabzi'],
      },
    };

    return fallbackMap[dietProfile][slot];
  }
}

export const nutritionGenerator = new NutritionGenerator();
