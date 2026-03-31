
import { processAthleticIntelligence, AthleteContext } from '../src/lib/intelligence_engine'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const CATEGORIES = [
  'sleep',
  'soreness',
  'hormonal',
  'psychological',
  'illness',
  'pain'
]

async function runLinguisticAudit() {
  console.log("🧬 CREEDA Linguistic Entropy Audit (100 Case Stress Test)\n")
  
  const results: any[] = []

  // Simulate 100 unique athlete encounters with similar scores
  for (let i = 0; i < 100; i++) {
    const category = CATEGORIES[i % CATEGORIES.length]
    const dayOffset = Math.floor(i / CATEGORIES.length)
    const simulatedDate = new Date(2026, 2, 1 + dayOffset).toISOString().split('T')[0]
    
    const log: any = {
      date: simulatedDate,
      sleep_quality: 'Good',
      energy_level: 'High',
      muscle_soreness: 'Normal',
      stress_level: 'Low',
      current_pain_level: 0,
      mental_readiness: 'Focused',
      day_type: ['Training']
    }

    const context: AthleteContext = {
      fullName: `Athlete Alpha-${i}`,
      sport: 'Athletics',
      position: 'Sprinter',
      goal: 'Performance'
    }

    const diagnostic: any = {
      profile_data: { gender: 'Male' }
    }

    // Inject the dominant limiter (targeting score ~60-75)
    if (category === 'sleep') {
      log.sleep_quality = 'Poor'
      log.energy_level = 'Moderate'
    } else if (category === 'soreness') {
      log.muscle_soreness = 'Stiff/Sore'
      log.energy_level = 'High'
    } else if (category === 'hormonal') {
      log.menstrual_status = 'Luteal-Phase'
      diagnostic.profile_data.gender = 'Female'
      log.energy_level = 'Peak'
    } else if (category === 'psychological') {
      log.mental_readiness = 'Not ready'
      log.energy_level = 'High'
    } else if (category === 'illness') {
      log.health_status = 'Marginal'
      log.energy_level = 'Peak'
    } else if (category === 'pain') {
      log.current_pain_level = 3
      log.pain_location = ['Hamstring']
      log.energy_level = 'Peak'
    }

    const result = processAthleticIntelligence(context, log, [], diagnostic)
    
    results.push({
      id: i,
      category,
      score: result.readinessScore,
      judgement: result.combinedInsight,
    })
  }

  // --- ENTROPY ANALYSIS ---
  const uniqueJudgements = new Set(results.map(r => r.judgement)).size
  const entropyScore = ((uniqueJudgements / 100) * 10).toFixed(1)

  console.log(`| ID | Category | Score | Rationale (Fragment) |`)
  console.log(`|---|---|---|---|`)
  
  // Show first 15 for sample
  results.slice(0, 15).forEach(r => {
    console.log(`| ${r.id} | ${r.category.padEnd(12)} | ${r.score} | ${r.judgement.substring(0, 80)}... |`)
  })
  console.log(`... [Showing 15 of 100 cases] ...`)

  console.log(`\n📊 Linguistic Audit Metrics:`)
  console.log(`- Total Simulated Encounters: 100`)
  console.log(`- Unique Linguistic Judgements: ${uniqueJudgements} / 100`)
  console.log(`- Textual Entropy Score: ${entropyScore} / 10`)
  
  if (parseFloat(entropyScore) >= 7.5) {
    console.log("✅ VERDICT: ELITE REASONING. Linguistic variety exceeds the requirement of 7.5.")
  } else {
    console.log("⚠️ VERDICT: REPETITIVE. Needs more phrase variety or salt factors.")
  }
}

runLinguisticAudit()
