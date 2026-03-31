/**
 * CREEDA RELATIONSHIP ENGINE
 * Collaborative visibility and coach links.
 */

import { createClient } from "@/lib/supabase/client";

export class RelationshipEngine {
  private supabase = createClient();

  /**
   * Fetches all approved athletes for a coach.
   */
  async getLinkedAthletes(userId: string) {
    const { data, error } = await this.supabase
      .from("connection_requests")
      .select(`
        athlete_id,
        profiles!athlete_id (
          id,
          full_name,
          user_type,
          avatar_url
        )
      `)
      .eq("coach_id", userId)
      .eq("status", "approved");

    if (error) {
      console.error("[RELATIONSHIP_ENGINE] Error fetching athletes:", error);
      return [];
    }

    return data.map(d => d.profiles);
  }

  /**
   * Fetches all approved coaches for an athlete.
   */
  async getLinkedCoaches(athleteId: string) {
    const { data, error } = await this.supabase
      .from("connection_requests")
      .select(`
        coach_id,
        profiles!coach_id (
          id,
          full_name,
          user_type,
          avatar_url
        )
      `)
      .eq("athlete_id", athleteId)
      .eq("status", "approved");

    if (error) {
      console.error("[RELATIONSHIP_ENGINE] Error fetching coaches:", error);
      return [];
    }

    return data.map(d => d.profiles);
  }

  /**
   * Real-time status for Coach Dashboard
   * In a real implementation, this would aggregate readiness scores from multiple athletes.
   */
  async getTeamStatus(coachId: string) {
    // To be implemented as the intelligence layer expands
    return {
      high_risk_count: 0,
      moderate_risk_count: 0,
      optimal_count: 0,
    };
  }
}

export const relationshipEngine = new RelationshipEngine();
