import { calculateV4Intelligence } from './core_engine';

const testCases = [
  {
    name: 'Perfect Recovery',
    log: { sleep_quality: 'Excellent', energy_level: 'High', muscle_soreness: 'None', stress_level: 'None', current_pain_level: 0 },
    diag: { physiology_profile: { recovery_efficiency: 90, load_tolerance: 90 } },
    expected: 'TRAIN'
  },
  {
    name: 'High Fatigue & Pain (Physio Referral)',
    log: { sleep_quality: 'Poor', energy_level: 'Low', muscle_soreness: 'High', stress_level: 'High', current_pain_level: 7, pain_location: ['Knee'] },
    diag: { physiology_profile: { recovery_efficiency: 30, load_tolerance: 30 } },
    expected: 'REST'
  }
];

testCases.forEach(tc => {
  const result = calculateV4Intelligence(tc.log, tc.diag, [], { sport: 'cricket', role: 'athlete' });
  console.log(`\nTest Case: ${tc.name}`);
  console.log(`Score: ${result.score} | Status: ${result.status} | Priority: ${result.priority}`);
  console.log(`Reason: ${result.reason}`);
  console.log(`Action: ${result.action}`);
  if (result.referral) {
    console.log(`Referral: ${result.referral.type} (${result.referral.urgency}) - ${result.referral.reason}`);
  }
  console.log(`Trace: ACWR ${result.trace.acwr} | Recovery ${result.trace.recoveryCapacity}`);
});
