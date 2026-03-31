/**
 * Master mapping of physiological demands and injury risks for various sports and positions.
 * Pillars are scored 1-10.
 */

export interface PhysiologicalPillar {
  endurance: number;     // Cardiovascular capacity
  power: number;         // Explosive movement
  agility: number;       // Directional change
  strength: number;      // Force production
  neural: number;        // CNS / Concentration requirement
  recovery: number;      // Recovery Efficiency
  fatigue: number;       // Fatigue Resistance
  load: number;          // Load Tolerance
  robustness: number;    // Movement Robustness
  coordination: number;  // Coordination Control
}

export interface SportDemandProfile {
  pillars: PhysiologicalPillar;
  injuryRisks: string[];
  peakDescription: string;
}

export const PHYSIOLOGICAL_MAPPING: Record<string, Record<string, SportDemandProfile>> = {
  "Athletics": {
    "Sprints": {
      pillars: { endurance: 4, power: 10, agility: 7, strength: 8, neural: 10, recovery: 8, fatigue: 7, load: 8, robustness: 9, coordination: 9 },
      injuryRisks: ["Hamstring", "Achilles", "Hip Flexor"],
      peakDescription: "Explosive block starts and maximal velocity maintenance."
    },
    "Middle Distance": {
      pillars: { endurance: 9, power: 7, agility: 5, strength: 6, neural: 8, recovery: 9, fatigue: 10, load: 9, robustness: 8, coordination: 7 },
      injuryRisks: ["Stress Fractures", "Calf/Shin"],
      peakDescription: "Sustained high-velocity aerobic effort with a strong kick finish."
    },
    "Long Distance": {
      pillars: { endurance: 10, power: 4, agility: 2, strength: 5, neural: 7, recovery: 9, fatigue: 10, load: 10, robustness: 7, coordination: 6 },
      injuryRisks: ["Plantar Fasciitis", "Knee (IT Band)", "Stress Fractures"],
      peakDescription: "Exceptional aerobic efficiency and mental pacing."
    },
    "Jumps": {
      pillars: { endurance: 3, power: 10, agility: 8, strength: 9, neural: 10, recovery: 8, fatigue: 6, load: 8, robustness: 10, coordination: 10 },
      injuryRisks: ["Patellar Tendon", "Ankle", "Lower Back"],
      peakDescription: "Maximal vertical/horizontal displacement through elite plyometric force."
    }
  },
  "Basketball": {
    "Point Guard": {
      pillars: { endurance: 8, power: 8, agility: 10, strength: 6, neural: 10, recovery: 8, fatigue: 8, load: 8, robustness: 8, coordination: 10 },
      injuryRisks: ["Ankle", "Knee (ACL)", "Finger"],
      peakDescription: "Elite court vision combined with rapid multi-directional bursts."
    },
    "Forward": {
      pillars: { endurance: 8, power: 9, agility: 9, strength: 8, neural: 9, recovery: 8, fatigue: 9, load: 9, robustness: 9, coordination: 9 },
      injuryRisks: ["Knee (ACL)", "Ankle", "Hamstring"],
      peakDescription: "Versatile explosive verticality and transitional speed."
    },
    "Center": {
      pillars: { endurance: 7, power: 9, agility: 6, strength: 10, neural: 8, recovery: 9, fatigue: 8, load: 9, robustness: 10, coordination: 8 },
      injuryRisks: ["Knee", "Lower Back", "Stress Fractures"],
      peakDescription: "Dominant vertical presence and high-force physical contact."
    }
  },
  "Cricket": {
    "Fast Bowler": {
      pillars: { endurance: 6, power: 10, agility: 6, strength: 9, neural: 9, recovery: 10, fatigue: 8, load: 10, robustness: 10, coordination: 8 },
      injuryRisks: ["Lower Back (Stress)", "Side Strain", "Ankle (Lead Leg)"],
      peakDescription: "Maximal repeatable force in the delivery stride."
    },
    "Batter": {
      pillars: { endurance: 7, power: 7, agility: 9, strength: 6, neural: 10, recovery: 8, fatigue: 9, load: 8, robustness: 8, coordination: 10 },
      injuryRisks: ["Hamstring", "Lower Back", "Wrist"],
      peakDescription: "Extreme hand-eye coordination and high-speed decision making."
    },
    "Wicketkeeper": {
      pillars: { endurance: 8, power: 7, agility: 10, strength: 7, neural: 10, recovery: 8, fatigue: 9, load: 9, robustness: 9, coordination: 10 },
      injuryRisks: ["Lower Back", "Knee", "Finger"],
      peakDescription: "Prolonged isometric crouching and instant reaction speeds."
    },
    "Spin Bowler": {
      pillars: { endurance: 7, power: 5, agility: 7, strength: 6, neural: 10, recovery: 8, fatigue: 8, load: 7, robustness: 8, coordination: 10 },
      injuryRisks: ["Shoulder", "Finger", "Hip"],
      peakDescription: "High-precision rotary force and consistent neural focus."
    }
  },
  "Football": {
    "Midfielder": {
      pillars: { endurance: 10, power: 7, agility: 9, strength: 7, neural: 9, recovery: 9, fatigue: 10, load: 10, robustness: 9, coordination: 9 },
      injuryRisks: ["Knee (ACL/MCL)", "Ankle", "Groin"],
      peakDescription: "Unmatched work rate and rapid transition between play phases."
    },
    "Forward": {
      pillars: { endurance: 7, power: 10, agility: 10, strength: 8, neural: 9, recovery: 8, fatigue: 9, load: 9, robustness: 9, coordination: 10 },
      injuryRisks: ["Hamstring", "Groin", "Ankle"],
      peakDescription: "Explosive acceleration and elite change-of-direction in the final third."
    },
    "Defender": {
      pillars: { endurance: 8, power: 8, agility: 8, strength: 9, neural: 9, recovery: 8, fatigue: 8, load: 9, robustness: 10, coordination: 8 },
      injuryRisks: ["Knee", "Ankle", "Head"],
      peakDescription: "Aerial dominance and high-stakes physical tackling."
    },
    "Goalkeeper": {
      pillars: { endurance: 5, power: 10, agility: 10, strength: 8, neural: 10, recovery: 9, fatigue: 7, load: 8, robustness: 9, coordination: 10 },
      injuryRisks: ["Shoulder", "Hip", "Finger"],
      peakDescription: "Instantaneous reactive power and elite aerial handling."
    }
  },
  "Combat Sports": {
    "MMA": {
      pillars: { endurance: 9, power: 9, agility: 9, strength: 9, neural: 10, recovery: 10, fatigue: 10, load: 10, robustness: 9, coordination: 10 },
      injuryRisks: ["Knee", "Shoulder", "Head"],
      peakDescription: "Near-unmatched anaerobic capacity across striking and grappling."
    },
    "Boxing": {
      pillars: { endurance: 9, power: 9, agility: 9, strength: 8, neural: 10, recovery: 9, fatigue: 9, load: 9, robustness: 8, coordination: 10 },
      injuryRisks: ["Hand/Wrist", "Shoulder", "Head"],
      peakDescription: "Perfect integration of anaerobic output and cognitive reactivity."
    }
  },
  "Special": {
    "Kabaddi": {
      pillars: { endurance: 8, power: 10, agility: 10, strength: 9, neural: 9, recovery: 9, fatigue: 9, load: 10, robustness: 10, coordination: 10 },
      injuryRisks: ["Knee (ACL)", "Ankle", "Shoulder"],
      peakDescription: "Explosive multi-directional lunging and rapid escape capacity."
    }
  }
};

/**
 * Returns a profile for a given sport and position.
 * If exact position is not found, returns a generic/default for the sport.
 */
export function getDemandProfile(sport: string, position: string): SportDemandProfile {
  const sportEntries = Object.entries(PHYSIOLOGICAL_MAPPING);
  let sportProfile = PHYSIOLOGICAL_MAPPING[sport];
  
  // Fuzzy match for sport
  if (!sportProfile) {
    const matched = sportEntries.find(([name]) => name.toLowerCase().includes(sport.toLowerCase()) || sport.toLowerCase().includes(name.toLowerCase()));
    if (matched) sportProfile = matched[1];
  }

  if (!sportProfile) {
    // Return a balanced default for unknown sports
    return {
      pillars: { endurance: 7, power: 7, agility: 7, strength: 7, neural: 7, recovery: 7, fatigue: 7, load: 7, robustness: 7, coordination: 7 },
      injuryRisks: ["General Strain"],
      peakDescription: "Balanced athletic baseline."
    };
  }

  // Exact match for position
  if (sportProfile[position]) {
    return sportProfile[position];
  }

  // Fuzzy match for position
  const positionEntries = Object.entries(sportProfile);
  const matchedPos = positionEntries.find(([name]) => name.toLowerCase().includes(position.toLowerCase()) || position.toLowerCase().includes(name.toLowerCase()));
  if (matchedPos) return matchedPos[1];

  // Try to find a 'General' or the first available
  return sportProfile["General"] || Object.values(sportProfile)[0];
}

/**
 * Suggests new data points based on sport and primary gap
 */
export function suggestNewDataPoints(sport: string, position: string): string[] {
  const suggestions: string[] = ["Heart Rate Variability (HRV)"];

  if (sport.toLowerCase().includes("cricket") && position.toLowerCase().includes("bowler")) {
    suggestions.push("Daily Grip Strength (Neural Readiness)");
    suggestions.push("Landing Force (Plyometric Readiness)");
  }

  return suggestions;
}
