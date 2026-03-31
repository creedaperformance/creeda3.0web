/**
 * CREEDA BENCHMARK ENGINE
 * Comparative insights and sport-specific standards.
 */

export interface Benchmark {
  id: string;
  metric: string;
  value: number;
  comparisonPct: number; // +10 means 10% above average
  status: "ELITE" | "ABOVE_AVERAGE" | "AVERAGE" | "BELOW_AVERAGE";
  label: string;
}

export class BenchmarkEngine {
  /**
   * Compares user metric against benchmark standards.
   */
  getBenchmark(metric: string, value: number, sport: string): Benchmark {
    // This will be backed by a larger dataset in production
    // For Gold Standard, we provide a robust logic structure
    
    const standards: any = {
      endurance: { elite: 85, average: 65 },
      recovery: { elite: 80, average: 60 },
      readiness: { elite: 90, average: 75 }
    };

    const std = standards[metric] || standards.readiness;
    let status: Benchmark["status"] = "AVERAGE";
    
    if (value >= std.elite) status = "ELITE";
    else if (value > std.average) status = "ABOVE_AVERAGE";
    else if (value < std.average - 10) status = "BELOW_AVERAGE";

    const comparisonPct = Math.round(((value - std.average) / std.average) * 100);

    return {
      id: `bench-${metric}`,
      metric,
      value,
      comparisonPct,
      status,
      label: `You are ${comparisonPct > 0 ? 'above' : 'below'} average for ${sport}`
    };
  }
}

export const benchmarkEngine = new BenchmarkEngine();
