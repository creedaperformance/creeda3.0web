/**
 * CREEDA PROGRESS ENGINE
 * Motivation loop, streaks, and milestone tracking.
 */

export interface UserStats {
  streak_days: number;
  total_logs: number;
  last_log_date: string;
  milestones: string[];
  cumulative_improvement_pct: number;
}

export class ProgressEngine {
  /**
   * Updates stats and returns newly reached milestones.
   */
  processStats(currentStats: UserStats, newLogDate: string): UserStats & { new_milestones: string[] } {
    const today = new Date(newLogDate).toDateString();
    const last = new Date(currentStats.last_log_date).toDateString();
    
    let nextStreak = currentStats.streak_days;
    const new_milestones: string[] = [];

    // 1. Streak Logic
    if (today !== last) {
      const diffIdx = Math.abs(new Date(today).getTime() - new Date(last).getTime()) / (1000 * 3600 * 24);
      if (diffIdx <= 1) {
        nextStreak += 1;
        if (nextStreak % 7 === 0) new_milestones.push(`${nextStreak} Day Consistency Streak`);
      } else {
        nextStreak = 1;
      }
    }

    // 2. Volume Milestones
    const nextTotal = currentStats.total_logs + 1;
    if (nextTotal === 10) new_milestones.push("First 10 Readiness Logs Complete");
    if (nextTotal === 50) new_milestones.push("Performance Baseline Established");

    return {
      ...currentStats,
      streak_days: nextStreak,
      total_logs: nextTotal,
      last_log_date: newLogDate,
      milestones: [...currentStats.milestones, ...new_milestones],
      new_milestones
    };
  }
}

export const progressEngine = new ProgressEngine();
