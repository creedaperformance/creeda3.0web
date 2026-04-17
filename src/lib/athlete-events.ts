export interface AthleteEventPrepPlan {
  focus: string
  risk: string
  description: string
}

export function buildAthleteEventPrepPlan(eventType: string): AthleteEventPrepPlan {
  if (eventType.includes('Functional') || eventType.includes('CrossFit')) {
    return {
      focus: 'Threshold & Lactic Tolerance',
      risk: 'Shoulder Impingement / Lower Back Fatigue',
      description:
        'Prioritize intense interval work mixed with heavy compound lifts. Mobility is mandatory.',
    }
  }

  if (eventType.includes('Grappling') || eventType.includes('Boxing')) {
    return {
      focus: 'Anaerobic Output & Grip Endurance',
      risk: 'Joint Sprains / Concussion Protocols',
      description:
        'Simulate round timings. Increase neck strength and rotational core stability.',
    }
  }

  if (
    eventType.includes('Cycling') ||
    eventType.includes('Endurance') ||
    eventType.includes('Triathlon')
  ) {
    return {
      focus: 'Zone 2 Volume & Leg Power',
      risk: 'Knee Tracking / IT Band Friction',
      description:
        'Accumulate time in saddle or steady-state work. Layer in controlled leg strength to armor the knees.',
    }
  }

  return {
    focus: 'General Aerobic Base',
    risk: 'Calf & Achilles Over-Tension',
    description:
      'Build your aerobic capacity gradually and avoid massive weekly mileage or intensity spikes.',
  }
}
