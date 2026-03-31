import { createClient } from "@/lib/supabase/client";

export interface ContextWeightings {
  sportDemands: Record<string, number>;
  positionDemands: Record<string, number>;
  goalProfile: Record<string, number>;
  injuryConstraints: string[];
}

export interface FinalContextBias {
  power: number;
  endurance: number;
  hypertrophy: number;
  mobility: number;
  injuryBias: string[];
}

export class ContextEngine {
  private supabase = createClient();

  // Weighted System Config
  private readonly WEIGHTS = {
    sport: 0.3,
    position: 0.25,
    goal: 0.2,
    injury: 0.25,
  };

  /**
   * Generates the final weighted context bias for a user.
   */
  async buildContext(userId: string): Promise<FinalContextBias> {
    // 1. Fetch Profile + Diagnostics
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('role, primary_sport, position')
      .eq('id', userId)
      .single();

    const { data: diagnostics } = await this.supabase
      .from('diagnostics')
      .select('primary_goal')
      .eq('athlete_id', userId)
      .single();

    // 2. Fetch Raw Weights from Ontology
    let sportDemands: Record<string, number> = { power: 0, endurance: 0, hypertrophy: 0, mobility: 0 };
    let positionDemands: Record<string, number> = { power: 0, endurance: 0, hypertrophy: 0, mobility: 0 };
    let goalProfile: Record<string, number> = { power: 0, endurance: 0, hypertrophy: 0, mobility: 0 };
    let injuryConstraints: string[] = [];

    if (profile?.primary_sport) {
      const { data: sport } = await this.supabase
        .from('sport_profiles')
        .select('movement_demands, injury_risks')
        .eq('sport', profile.primary_sport)
        .maybeSingle();
      if (sport) {
        sportDemands = sport.movement_demands as Record<string, number> || sportDemands;
        injuryConstraints = [...injuryConstraints, ...(sport.injury_risks || [])];
      }
    }

    if (profile?.position) {
      const { data: position } = await this.supabase
        .from('position_profiles')
        .select('position_demands, injury_bias')
        .eq('position', profile.position)
        .maybeSingle();
      if (position) {
        positionDemands = position.position_demands as Record<string, number> || positionDemands;
        injuryConstraints = [...injuryConstraints, ...(position.injury_bias || [])];
      }
    }

    if (diagnostics?.primary_goal) {
      const { data: goal } = await this.supabase
        .from('goal_profiles')
        .select('training_bias')
        .eq('goal', diagnostics.primary_goal)
        .maybeSingle();
      if (goal) {
        goalProfile = goal.training_bias as Record<string, number> || goalProfile;
      }
    }

    const { data: activeRehab } = await this.supabase
      .from('rehab_history')
      .select('injury_type')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeRehab) {
      injuryConstraints.push(activeRehab.injury_type);
    }

    // 3. Weighted Combination
    return this.calculateFinalBias({
      sportDemands,
      positionDemands,
      goalProfile,
      injuryConstraints: Array.from(new Set(injuryConstraints)) // Unique constraints
    });
  }

  private calculateFinalBias(context: ContextWeightings): FinalContextBias {
    const combine = (key: string) => {
      const sportV = (context.sportDemands[key] || 0) * this.WEIGHTS.sport;
      const posV = (context.positionDemands[key] || 0) * this.WEIGHTS.position;
      const goalV = (context.goalProfile[key] || 0) * this.WEIGHTS.goal;
      
      // Injury weight serves as a generic cap placeholder here; SafetyEngine enforces true constraints
      const rawScore = sportV + posV + goalV;
      
      return Math.min(100, Math.max(0, rawScore));
    };

    return {
      power: combine('power'),
      endurance: combine('endurance'),
      hypertrophy: combine('hypertrophy'),
      mobility: combine('mobility'),
      injuryBias: context.injuryConstraints,
    };
  }
}

export const contextEngine = new ContextEngine();
