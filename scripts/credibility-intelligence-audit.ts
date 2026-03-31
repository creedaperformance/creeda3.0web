import { processAthleticIntelligence, AthleteContext } from '../src/lib/intelligence_engine';

async function runCredibilityAudit() {
  console.log('🛡️ CREEDA Input Credibility Intelligence Audit\n');

  const archetypes = [
    {
      name: 'Honest Athlete',
      context: { fullName: 'Clara Real', sport: 'Football', position: 'QB', goal: 'Performance' },
      log: { sleep_quality: 'Good', energy_level: 'High', muscle_soreness: 'Normal', stress_level: 'Low', current_pain_level: 1 },
      recent: [{ sleep_quality: 'Okay', energy_level: 'Moderate', muscle_soreness: 'Heavy', stress_level: 'Moderate' }]
    },
    {
      name: 'Habitual Tap-Through',
      context: { fullName: 'Harry Habit', sport: 'Football', position: 'WR', goal: 'Maintenance' },
      log: { sleep_quality: 'Good', energy_level: 'High', muscle_soreness: 'Normal', stress_level: 'Low', current_pain_level: 0 },
      recent: [{ sleep_quality: 'Good', energy_level: 'High', muscle_soreness: 'Normal', stress_level: 'Low' }]
    },
    {
      name: 'Zero Variance (Rushed)',
      context: { fullName: 'Zoe Zero', sport: 'Football', position: 'LB', goal: 'Recovery' },
      log: { sleep_quality: 'Moderate', energy_level: 'Moderate', muscle_soreness: 'Moderate', stress_level: 'Moderate', current_pain_level: 0 },
      recent: []
    },
    {
      name: 'Biological Contradiction',
      context: { fullName: 'Ben Bio', sport: 'Football', position: 'RB', goal: 'Prevention' },
      log: { sleep_quality: 'Excellent', energy_level: 'Peak', muscle_soreness: 'Light/Fresh', stress_level: 'None', current_pain_level: 10, focus_level: 'Combat-ready' },
      recent: []
    },
    {
      name: 'Rapid Submitter',
      context: { fullName: 'Ryan Rush', sport: 'Football', position: 'S', goal: 'Performance' },
      log: { sleep_quality: 'Good', energy_level: 'High', muscle_soreness: 'Normal', stress_level: 'Low', submission_duration_ms: 1500 },
      recent: []
    },
    {
      name: 'Delayed Honesty Disclosure',
      context: { fullName: 'Daisy Delay', sport: 'Football', position: 'TE', goal: 'Performance' },
      log: { sleep_quality: 'Poor', energy_level: 'Drained', muscle_soreness: 'Stiff/Sore', stress_level: 'High', current_pain_level: 8 },
      recent: [
        { sleep_quality: 'Excellent', energy_level: 'Peak', muscle_soreness: 'Light/Fresh', stress_level: 'None', current_pain_level: 0 },
        { sleep_quality: 'Excellent', energy_level: 'Peak', muscle_soreness: 'Light/Fresh', stress_level: 'None', current_pain_level: 0 },
        { sleep_quality: 'Excellent', energy_level: 'Peak', muscle_soreness: 'Light/Fresh', stress_level: 'None', current_pain_level: 0 }
      ]
    },
    {
      name: 'Strategic Submitter',
      context: { fullName: 'Steve Strategy', sport: 'Football', position: 'LS', goal: 'Maintenance' },
      log: { sleep_quality: 'Poor', energy_level: 'Low', muscle_soreness: 'Stiff/Sore', stress_level: 'High', current_pain_level: 5, planned_load: 'High' },
      recent: [
        { sleep_quality: 'Excellent', energy_level: 'Peak', muscle_soreness: 'Light/Fresh', stress_level: 'None', current_pain_level: 0, planned_load: 'Low' },
        { sleep_quality: 'Poor', energy_level: 'Low', muscle_soreness: 'Stiff/Sore', stress_level: 'High', current_pain_level: 5, planned_load: 'Very High' },
        { sleep_quality: 'Excellent', energy_level: 'Peak', muscle_soreness: 'Light/Fresh', stress_level: 'None', current_pain_level: 0, planned_load: 'Very Low' }
      ]
    },
    {
      name: 'Socially Biased',
      context: { fullName: 'Sam Social', sport: 'Football', position: 'K', goal: 'Performance' },
      log: { sleep_quality: 'Excellent', energy_level: 'Peak', muscle_soreness: 'Light/Fresh', stress_level: 'None', current_pain_level: 0 },
      recent: [
        { sleep_quality: 'Poor', energy_level: 'Drained', muscle_soreness: 'Stiff/Sore', stress_level: 'High', current_pain_level: 9 }
      ]
    },
    {
      name: 'Multi-Trigger (Priority Test)',
      context: { fullName: 'Max Multi', sport: 'Football', position: 'QB', goal: 'Performance' },
      log: { sleep_quality: 'Excellent', energy_level: 'Peak', muscle_soreness: 'Light/Fresh', stress_level: 'None', current_pain_level: 0, submission_duration_ms: 500 },
      recent: [
        { sleep_quality: 'Poor', energy_level: 'Drained', muscle_soreness: 'Stiff/Sore', stress_level: 'High', current_pain_level: 9 }
      ]
    }
  ];

  archetypes.forEach(a => {
    const res = processAthleticIntelligence(a.context as AthleteContext, a.log, a.recent);
    
    console.log(`👤 Archetype: ${a.name} (${a.context.fullName})`);
    console.log(`   Readiness Score: ${res.score}`);
    console.log(`   Credibility Score: ${res.inputCredibility.score} (${res.inputCredibility.level})`);
    console.log(`   Flags: ${res.inputCredibility.flags.join(', ') || 'None'}`);
    console.log(`   System Confidence: ${res.confidenceLevel}`);
    
    if (res.softPrompt) {
      console.log(`   💬 Soft Prompt: "${res.softPrompt}"`);
    }
    
    if (res.coachCredibilityInsight) {
      console.log(`   💡 Coach Insight: ${res.coachCredibilityInsight}`);
    }

    if (res.coachCredibilityFlag) {
      console.log(`   🚩 Coach Alert: Low Confidence Reporting Flag Triggered`);
    }
    
    console.log('---\n');
  });

  console.log('✅ Input Credibility Audit Complete.');
}

runCredibilityAudit();
