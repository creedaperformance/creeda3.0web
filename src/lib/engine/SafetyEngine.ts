import { DosageOutput } from './Prescription/DosageEngine';

export interface GeneratedExercise {
  id: string;
  name: string;
  movement_pattern: string;
  contraindications: string[];
  coachingNote?: string;
  source?: 'catalog' | 'sport_drill' | 'recovery_protocol';
  sportContext?: string;
  blockFocus?: string;
  dosage: DosageOutput;
}

export class SafetyEngine {
  
  /**
   * Evaluates a generated workout against active injury constraints and fatigue levels.
   */
  public sanitizeWorkout(
    exercises: GeneratedExercise[], 
    activeInjuries: string[],
    readinessScore: number
  ): GeneratedExercise[] {
    const isFatigued = readinessScore < 40;
    
    // Track requested movement patterns to prevent compounding heavy conflicts
    const patternsInSession = new Set<string>();

    return exercises.filter(ex => {
      // Rule 1: Literal Contraindications
      const hasConflict = activeInjuries.some(inj => ex.contraindications.includes(inj));
      if (hasConflict) return false;

      // Rule 2: Fatigue Protection (No complex/explosive patterns when CNS is red)
      if (isFatigued) {
        if (ex.movement_pattern === 'olympic_lift' || ex.movement_pattern === 'sprint') {
          return false;
        }
      }

      // Rule 3: Conflict Prevention (e.g. don't load heavy hinge if sprint is already in session, or vice versa if hamstrings are at risk)
      // This is a simplified logic map for demonstration
      if (ex.movement_pattern === 'sprint' && patternsInSession.has('heavy_hinge') && activeInjuries.includes('hamstring_strain')) {
        return false;
      }
      
      patternsInSession.add(ex.movement_pattern);

      return true;
    });
  }

  /**
   * Ensures that intensity spikes don't exceed biological safety margins.
   */
  public capLoadSpikes(dosage: DosageOutput, previousLoad?: number): DosageOutput {
    if (!previousLoad) return dosage;

    // Hard limit: Users cannot jump more than 15% load in a single session for the same element
    const maxSafeLoad = previousLoad * 1.15;
    if (dosage.targetRPE > maxSafeLoad && dosage.targetRPE > 6) { 
      // RPE is relative, but assuming absolute volume or 1RM tracking here
      return {
        ...dosage,
        targetRPE: Math.floor(maxSafeLoad),
        isCapped: true
      };
    }
    
    return dosage;
  }
}

export const safetyEngine = new SafetyEngine();
