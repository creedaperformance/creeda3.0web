import { processAthleticIntelligence, AthleteContext } from '../src/lib/intelligence_engine';

async function runUXAudit() {
  console.log('🧠 CREEDA UX-Intelligence Refinement Audit\n');

  const athletes = [
    {
      name: 'Strong-Day Athlete', // Score > 85
      context: { fullName: 'Alex Peak', sport: 'Football', position: 'Wide Receiver', goal: 'Performance' },
      log: { sleep_quality: 'Excellent', energy_level: 'Peak', muscle_soreness: 'Light/Fresh', stress_level: 'None', current_pain_level: 0, focus_level: 'Combat-ready' }
    },
    {
      name: 'Cumulative Strain', // Mixed-Signal
      context: { fullName: 'Jordan Mix', sport: 'Football', position: 'Linebacker', goal: 'Recovery' },
      log: { sleep_quality: 'Okay', energy_level: 'Moderate', muscle_soreness: 'Normal', stress_level: 'Moderate', current_pain_level: 0 }
    },
    {
      name: 'Felt-Reality Mismatch', // Subjective Peak but Bio Low
      context: { fullName: 'Sam Mask', sport: 'Football', position: 'Quarterback', goal: 'Performance' },
      log: { sleep_quality: 'Poor', energy_level: 'Peak', muscle_soreness: 'Heavy', stress_level: 'High', current_pain_level: 2, pain_location: ['Shoulder'] }
    },
    {
      name: 'Pain Override', // High Pain
      context: { fullName: 'Casey Hurt', sport: 'Football', position: 'Running Back', goal: 'Prevention' },
      log: { sleep_quality: 'Good', energy_level: 'High', muscle_soreness: 'Normal', stress_level: 'Low', current_pain_level: 5, pain_location: ['Knee'] }
    },
    {
      name: 'Luteal Phase', // Female Physiology
      context: { fullName: 'Taylor Cycle', sport: 'Football', position: 'Safety', goal: 'Performance' },
      log: { sleep_quality: 'Good', energy_level: 'Moderate', muscle_soreness: 'Normal', stress_level: 'Low', current_pain_level: 0, menstrual_status: 'Luteal' }
    }
  ];

  athletes.forEach(a => {
    const res = processAthleticIntelligence(a.context as AthleteContext, a.log, []);
    
    console.log(`👤 Athlete: ${a.name} (${a.context.fullName})`);
    console.log(`   Confidence: ${res.confidenceLevel}`);
    console.log(`   Coach Decision: ${res.coachDecision.athleteName} | ${res.coachDecision.limiter} | ${res.coachDecision.action} | ${res.coachDecision.confidence}`);
    console.log(`   Win By Today: PROTECT [${res.athleteWinBy.protect}] | PUSH [${res.athleteWinBy.push}] | WATCH [${res.athleteWinBy.watch}]`);
    
    if (res.feltRealityBridge) {
      console.log(`   🌁 Felt-Reality Bridge: ${res.feltRealityBridge}`);
    }
    
    if (res.strongDayIntelligence) {
      console.log(`   🚀 Strong-Day Intel: MAXIMIZE [${res.strongDayIntelligence.maximize}] | ADAPT [${res.strongDayIntelligence.adaptation}] | MONITOR [${res.strongDayIntelligence.monitor}]`);
    }
    
    console.log('---\n');
  });

  console.log('✅ UX-Intelligence Audit Complete.');
}

runUXAudit();
