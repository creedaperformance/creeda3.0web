import { RecommendedMeal, MacroTarget } from './NutritionGenerator';

/**
 * CREEDA: FOOD SWAP ENGINE
 * 
 * Logic to handle real-world nutrition flexibility:
 * 1. Substitute meals with similar macro profiles.
 * 2. Adjust future meals if the current one is skipped or modified.
 */
export class FoodSwapEngine {
  
  /**
   * Suggests a replacement for a meal while maintaining macro targets.
   */
  suggestSwap(originalMeal: RecommendedMeal, availableFoods: any[]): RecommendedMeal {
    // In a real implementation, this would query the `food_substitutions` table
    // and find items with similar density.
    return {
      ...originalMeal,
      name: `${originalMeal.name} (Modified)`,
      isSwapCandidate: false // Already swapped
    };
  }

  /**
   * Adjusts the MacroTarget for the next meal if the current one was skipped.
   * Uses a 'Carry Forward' logic for protein and a 'Decay' logic for carbs/fats.
   */
  recalculateNextMeal(
    skippedMeal: RecommendedMeal, 
    nextMeal: RecommendedMeal
  ): RecommendedMeal {
    const adjustedMacros: MacroTarget = {
      calories: nextMeal.macros.calories + (skippedMeal.macros.calories * 0.5), // 50% calorie carry-over
      protein: nextMeal.macros.protein + skippedMeal.macros.protein,           // 100% protein carry-over
      carbs: nextMeal.macros.carbs + (skippedMeal.macros.carbs * 0.3),         // 30% carb carry-over (limit spike)
      fats: nextMeal.macros.fats + (skippedMeal.macros.fats * 0.5)             // 50% fat carry-over
    };

    return {
      ...nextMeal,
      macros: adjustedMacros,
      portionSizeGrams: Math.round(adjustedMacros.calories / 1.5)
    };
  }
}

export const foodSwapEngine = new FoodSwapEngine();
