
import { processAthleticIntelligence } from '../src/lib/intelligence_engine'

async function runEdgeCaseFuzzing() {
  console.log('🔥 Starting Edge Case & Intelligence Integrity Fuzzing...')

  const EDGE_CASES = [
    {
      name: "Impossible Energy/Sleep Paradox",
      log: { sleep_quality: 'Poor', energy_level: 'Peak', current_pain_level: 0 },
      diagnostic: { primary_goal: 'Performance' }
    },
    {
      name: "Total System Crash Attempt (All Zero/Min)",
      log: { sleep_quality: 'Poor', energy_level: 'Drained', muscle_soreness: 'Stiff/Sore', stress_level: 'High', current_pain_level: 10 },
      diagnostic: { primary_goal: 'Performance' }
    },
    {
      name: "Contradictory Goal/Status",
      log: { sleep_quality: 'Excellent', energy_level: 'Peak', current_pain_level: 0 },
      diagnostic: { primary_goal: 'Recovery' } 
    }
  ]

  for (const scenario of EDGE_CASES) {
    console.log(`\nTesting: ${scenario.name}`)
    const context = {
        fullName: "Fuzz Test",
        sport: "Boxing",
        position: "Heavyweight",
        goal: scenario.diagnostic.primary_goal as "Recovery" | "Performance" | "Prevention"
    }
    const result = processAthleticIntelligence(context, scenario.log, [], scenario.diagnostic)
    console.log(`   Result Score: ${result.readinessScore}`)
    console.log(`   Judgement: ${result.combinedInsight}`)
    
    // Integrity Safeguard: Ensure score isn't "Fake Green" under high pain
    if (scenario.log.current_pain_level >= 8 && result.readinessScore > 40) {
        console.log("❌ CRITICAL FAILURE: Fake Green score produced for high pain.")
    } else {
        console.log("✅ Integrity Passed.")
    }
  }

  console.log('\n🔥 Fuzzing Complete.')
}

runEdgeCaseFuzzing()
