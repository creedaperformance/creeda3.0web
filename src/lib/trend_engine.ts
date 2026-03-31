/**
 * CREEDA TREND ENGINE
 * Time-series analysis and predictive performance insights.
 */

import { eventEngine } from "./event_engine";

export interface DashboardTrend {
  id: string;
  type: "DECLINE" | "IMPROVEMENT" | "PLATEAU" | "FATIGUE";
  label: string;
  magnitude: number; // Percentage change
  durationDays: number;
  message: string;
}

export class TrendEngine {
  /**
   * Analyzes history and emits critical trend events.
   */
  async analyzeHistory(history: any[]): Promise<DashboardTrend[]> {
    const trends: DashboardTrend[] = [];
    
    if (history.length < 3) return trends;

    // 1. Readiness Decline Detection (3-day)
    const recentScores = history.slice(-3).map(h => h.readiness_score);
    const isDeclining = recentScores.every((s, i) => i === 0 || s < recentScores[i-1]);
    
    if (isDeclining) {
      const drop = recentScores[0] - recentScores[2];
      trends.push({
        id: "trend-decline-3d",
        type: "DECLINE",
        label: "Readiness Trend",
        magnitude: drop,
        durationDays: 3,
        message: `Your readiness has declined by ${drop}% over the last 3 days. Focus on active recovery.`
      });
      eventEngine.emit("READINESS_DROP", { diff: drop });
    }

    // 2. Chronic Fatigue Pattern (High Load + Low Recovery)
    // To be implemented as engine scales

    // 3. Performance Plateau
    // ...

    return trends;
  }
}

export const trendEngine = new TrendEngine();
