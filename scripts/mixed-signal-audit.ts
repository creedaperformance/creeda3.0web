
import { processAthleticIntelligence, AthleteContext } from '../src/lib/intelligence_engine'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

async function runMixedSignalAudit() {
  console.log("🧠 CREEDA Mixed-Signal Confidence Audit (50 Scenario Simulation)\n")

  const scenarios = Array.from({ length: 50 }).map((_, i) => ({
    name: `Athlete ${i + 1}`,
    log: {
      date: '2026-03-18',
      sleep_quality: i % 2 === 0 ? 'Okay' : 'Good',
      energy_level: 'Moderate',
      muscle_soreness: i % 3 === 0 ? 'Heavy' : 'Normal',
      stress_level: 'Moderate',
      mental_readiness: 'Focused',
      day_type: ['Training'],
      load: 7,
      rpe: 7
    }
  }))

  let falseCertaintyCount = 0;
  let cumulativeLanguageCount = 0;

  for (const scenario of scenarios) {
    const context: AthleteContext = {
      fullName: scenario.name,
      sport: 'Football',
      position: 'Midfielder',
      goal: 'Performance'
    }

    const result = processAthleticIntelligence(context, scenario.log, [], { profile_data: { gender: 'Male' } })

    const judgement = result.athleteJudgement;
    
    // Check for "False Certainty" (Picking one when multiple exist)
    const isSleepDominant = judgement.includes('sleep');
    const isSorenessDominant = judgement.includes('soreness') || judgement.includes('tension');
    const isStressDominant = judgement.includes('stress');
    
    // If it only mentions one and sounds absolutely sure
    const specificTerms = ['is the reason', 'primary limiter', 'solely due to'];
    const hasFalseCertainty = specificTerms.some(term => judgement.includes(term));
    
    if (hasFalseCertainty) falseCertaintyCount++;
    
    // Check for "Cumulative" or "Mixed" language
    const mixedTerms = ['cumulative', 'multiple factors', 'combination of', 'systemic demand', 'aggregate'];
    const hasCumulativeLanguage = mixedTerms.some(term => judgement.toLowerCase().includes(term));
    
    if (hasCumulativeLanguage) cumulativeLanguageCount++;

    if (scenario.name === 'Athlete 1' || scenario.name === 'Athlete 25' || scenario.name === 'Athlete 50') {
      console.log(`👤 ${scenario.name} Judgement:`)
      console.log(`   ${judgement}\n`)
    }
  }

  console.log("📊 Mixed-Signal Audit Results:")
  console.log(`- Scenarios Tested: ${scenarios.length}`)
  console.log(`- False Certainty Cases: ${falseCertaintyCount}`)
  console.log(`- Cumulative Language Cases: ${cumulativeLanguageCount}`)
  
  const passRate = (scenarios.length - falseCertaintyCount) / scenarios.length * 100;
  console.log(`- Confidence Accuracy Score: ${passRate}%`)
}

runMixedSignalAudit()
