import { PHYSIOLOGICAL_MAPPING, getDemandProfile, type SportDemandProfile, type PhysiologicalPillar } from '../physiological_demands';

export interface PillarDetail {
  name: string;
  current: number;
  target: number;
  gap: number;
  matchPct: number;
  impact: string;       // How this affects the specific sport
  improvement: string;  // Actionable protocol to increase this
}

export interface CompatibilityResult {
  score: number;
  pillars: PillarDetail[];
  primaryGap: string;
  recommendations: string[];
  peakDescription: string;
  injuryRisks: string[];
}

export function calculateSportCompatibility(
  userPillars: PhysiologicalPillar,
  sportName: string,
  positionName: string = "General"
): CompatibilityResult {
  const sportProfile = getDemandProfile(sportName, positionName);
  const targetPillars = sportProfile.pillars;
  
  const results = Object.keys(targetPillars).map((key) => {
    const k = key as keyof PhysiologicalPillar;
    const current = userPillars[k] || 0;
    const target = targetPillars[k];
    
    const gap = Math.max(0, target - current);
    const matchPct = target === 0 ? 100 : Math.min(100, Math.round((current / target) * 100));
    
    return {
      name: k.charAt(0).toUpperCase() + k.slice(1),
      current,
      target,
      gap,
      matchPct,
      ...getPillarContext(k, sportName)
    };
  });

  const sumMatch = results.reduce((acc, r) => acc + r.matchPct, 0);
  const finalScore = Math.round(sumMatch / results.length);

  const primaryGapItem = [...results].sort((a, b) => b.gap - a.gap)[0];
  
  return {
    score: finalScore,
    pillars: results,
    primaryGap: primaryGapItem.name,
    recommendations: [primaryGapItem.improvement, "Maintain high-quality sleep (8.5h+)", "Monitor sport-specific load daily"],
    peakDescription: sportProfile.peakDescription,
    injuryRisks: sportProfile.injuryRisks
  };
}

function getPillarContext(pillar: keyof PhysiologicalPillar, sport: string): { impact: string; improvement: string } {
  const contexts: Record<keyof PhysiologicalPillar, { impact: string; improvement: string }> = {
    endurance: {
      impact: `Determines your ability to maintain high intensity in the final stages of ${sport}.`,
      improvement: "Zone 2 aerobic base building (45-60 min) + Threshold intervals."
    },
    power: {
      impact: `Crucial for explosive starts, jumps, and rapid acceleration in ${sport}.`,
      improvement: "Plyometric depth jumps and maximal intent ballistics (3-5 reps)."
    },
    agility: {
      impact: `Limits your change-of-direction speed and defensive reactivity in ${sport}.`,
      improvement: "Reactive deceleration drills and multi-directional cutting patterns."
    },
    strength: {
      impact: `Provides the force foundation for all ${sport} movements and injury resilience.`,
      improvement: "Compound lifts (Squat/TrapBar) at 80-90% 1RM for structural force."
    },
    neural: {
      impact: `Directly affects your reaction time and decision-making speed under pressure.`,
      improvement: "Cognitive load training and extreme high-quality CNS recovery (Sleep)."
    },
    recovery: {
      impact: `Governs how quickly you can return to peak performance after a ${sport} session.`,
      improvement: "Parasympathetic downregulation (Breathwork) and targeted nutrition timing."
    },
    fatigue: {
      impact: `Your resistance to performance drop-off during repeated high-intensity efforts.`,
      improvement: "Repeat Sprint Ability (RSA) blocks and high-volume metabolic conditioning."
    },
    load: {
      impact: `Your structural capacity to handle high weekly volumes of ${sport} training.`,
      improvement: "Progressive Chronic Load building and specific eccentric strengthening."
    },
    robustness: {
      impact: `The 'Integrity' of your movement patterns under fatigue to prevent ${sport} injuries.`,
      improvement: "Mobility reset flows and end-range isometric joint stability."
    },
    coordination: {
      impact: `The efficiency of your kinetic chain when executing complex ${sport} skills.`,
      improvement: "High-repetition technical drills under varied constraint levels."
    }
  };

  return contexts[pillar];
}
