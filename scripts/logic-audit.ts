
import { processAthleticIntelligence } from '../src/lib/intelligence_engine'

const SCENARIOS = [
  {
    name: "Perfect Readiness (Data Key Unification)",
    log: { 
      sleep_quality: 'Excellent', energy_level: 'Peak', body_feel: 'Light/Fresh', 
      stress_level: 'None', mental_readiness: 'Combat-ready', focus_level: 'Elite', confidence_level: 'Elite', current_pain_level: 0,
      yesterday_load_demand: 'Moderate'
    },
    diagnostic: { primary_goal: 'Performance' },
    expectedScoreRange: [90, 100]
  },
  {
    name: "High Fatigue - Female Luteal (Module Integration)",
    log: { 
      sleep_quality: 'Poor', energy_level: 'Low', muscle_soreness: 'Heavy', 
      stress_level: 'High', mental_readiness: 'Distracted', current_pain_level: 0,
      menstrual_status: 'Luteal'
    },
    diagnostic: { primary_goal: 'Prevention', profile_data: { gender: 'Female' } },
    expectedScoreRange: [30, 65]
  },
  {
    name: "Manual Labor Risk (Lifestyle Integration)",
    log: { 
      sleep_quality: 'Good', energy_level: 'Moderate', muscle_soreness: 'Normal', 
      stress_level: 'Moderate', mental_readiness: 'Focused', current_pain_level: 0
    },
    diagnostic: { primary_goal: 'Performance', daily_living: { occupation: 'Physical/Manual' } },
    expectedScoreRange: [60, 85]
  },
  {
    name: "Post-Game Recovery (Load Integration)",
    log: { 
      sleep_quality: 'Poor', energy_level: 'Low', muscle_soreness: 'Stiff/Sore', 
      stress_level: 'Low', mental_readiness: 'Focused', current_pain_level: 2,
      competition_yesterday: true
    },
    diagnostic: { primary_goal: 'Recovery' },
    expectedScoreRange: [30, 50]
  }
]

async function runAudit() {
    console.log('🚀 Starting Intelligence Engine Unification Audit...\n')
    const successes = []

    for (const scenario of SCENARIOS) {
        console.log(`Testing: ${scenario.name}...`)
        const context = {
            fullName: "Test Athlete",
            sport: "Football",
            position: "Striker",
            goal: (scenario.diagnostic?.primary_goal || "Performance") as "Performance" | "Prevention" | "Recovery"
        }

        const result = processAthleticIntelligence(context, scenario.log, [], scenario.diagnostic)

        // 1. Score Validation
        const score = result.readinessScore
        const scoreOk = score >= scenario.expectedScoreRange[0] && score <= scenario.expectedScoreRange[1]
        
        // 2. Unification Check (Did constraints influence reasoning?)
        const reasoningIncludesContext = 
            (scenario.log.menstrual_status ? result.combinedInsight.toLowerCase().includes('cycle') : true) &&
            (scenario.diagnostic?.daily_living?.occupation ? result.combinedInsight.toLowerCase().includes('occupation') : true);
            
        const explanationExists = result.explanation && result.explanation.rationale.length > 0;

        if (scoreOk && explanationExists) {
            console.log(`✅ Passed: Score=${score}, Rationale=${result.explanation?.rationale[0]}`)
            successes.push(result)
        } else {
            console.log(`❌ Failed: Score=${score}, ContextCheck=${reasoningIncludesContext}, ExplExists=${explanationExists}`)
            console.log(`   Insight: ${result.combinedInsight}`)
        }
    }

    // Detect Intelligence Variety (The "Static Intelligence" Fix)
    console.log('\n🔍 Detecting Reasoning Variety...')
    const judgements = successes.map(s => s.combinedInsight || '')
    const uniqueJudgements = new Set(judgements)
    
    console.log(`   Unique Judgements Produced: ${uniqueJudgements.size} / ${successes.length}`)
    
    if (uniqueJudgements.size > 1) {
        console.log('✅ Variety Check Passed: Reasoning Engine is dynamic.')
    } else {
        console.log('❌ Variety Check Failed: Outputs are repetitive.')
    }

    console.log('\nAudit Complete.')
}

runAudit()
