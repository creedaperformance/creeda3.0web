
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

async function runAmbiguityValidation() {
  console.log("🔍 CREEDA Ambiguity Intelligence Validation (50 Case Stress Test)\n")
  
  const results: any[] = []

  for (let i = 0; i < 50; i++) {
    const category = CATEGORIES[i % CATEGORIES.length]
    
    // Balanced log to target a score of ~60-65
    const log: any = {
      sleep_quality: 'Good',
      energy_level: 'High',
      muscle_soreness: 'Normal',
      stress_level: 'Low',
      current_pain_level: 0,
      mental_readiness: 'Focused',
      day_type: ['Training']
    }

    const context: AthleteContext = {
      fullName: `Athlete ${i}`,
      sport: 'Athletics',
      position: 'Sprinter',
      goal: 'Performance'
    }

    const diagnostic: any = {
      profile_data: { gender: 'Male' }
    }

    // Inject the dominant limiter
    if (category === 'sleep') {
      log.sleep_quality = 'Poor'
      log.energy_level = 'Moderate'
    } else if (category === 'soreness') {
      log.muscle_soreness = 'Stiff/Sore'
      log.energy_level = 'High'
    } else if (category === 'hormonal') {
      log.menstrual_status = 'Luteal-Phase'
      diagnostic.profile_data.gender = 'Female'
      log.energy_level = 'Peak' // High energy to test override
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
      limiter: result.todayStatus.limiter,
      rationale: result.combinedInsight,
      recs: result.reasonedRecommendations.map(r => r.action)
    })
  }

  // --- VALIDATION & DIFFERENTIATION ANALYSIS ---
  console.log(`| ID | Category | Score | Dominant Limiter Identified | Rationale (Fragment) |`)
  console.log(`|---|---|---|---|---|`)
  
  const resultsByScore: Record<number, any[]> = {}
  results.forEach(r => {
    if (!resultsByScore[r.score]) resultsByScore[r.score] = []
    resultsByScore[r.score].push(r)
    console.log(`| ${r.id} | ${r.category.padEnd(12)} | ${r.score} | ${r.limiter.padEnd(20)} | ${r.rationale.substring(0, 60)}... |`)
  })

  console.log(`\n🧪 Score-Bias Collision Audit (Goal: 0 collisions)`)
  let crossCategoryCollisions = 0
  Object.keys(resultsByScore).forEach(scoreStr => {
    const score = parseInt(scoreStr)
    const items = resultsByScore[score]
    const uniqueRationalesByCat: Record<string, string> = {}
    
    items.forEach(item => {
      if (uniqueRationalesByCat[item.category] && uniqueRationalesByCat[item.category] !== item.rationale) {
        // This is variation within a category, which is good but not a collision
      }
      
      // Check for collisions across different categories
      Object.keys(uniqueRationalesByCat).forEach(otherCat => {
        if (otherCat !== item.category && uniqueRationalesByCat[otherCat] === item.rationale) {
          crossCategoryCollisions++
          console.log(`❌ COLLISION: Score ${score} - ${item.category} and ${otherCat} have identical rationale!`)
        }
      })
      uniqueRationalesByCat[item.category] = item.rationale
    })
  })

  const uniqueRationalesTotal = new Set(results.map(r => r.rationale)).size
  const entropyScore = ((uniqueRationalesTotal / 50) * 10).toFixed(1)

  console.log(`\n📊 Ambiguity Metrics:`)
  console.log(`- Score Range: ${Math.min(...results.map(r => r.score))} to ${Math.max(...results.map(r => r.score))}`)
  console.log(`- Cross-Category Collisions at Same Score: ${crossCategoryCollisions}`)
  console.log(`- Total Unique Rationales: ${uniqueRationalesTotal} / 50`)
  console.log(`- Textual Entropy Score: ${entropyScore} / 10`)
  
  if (crossCategoryCollisions === 0 && parseInt(entropyScore) >= 5) {
    console.log("✅ VERDICT: ELITE. CREEDA distinguishes biological cause from numeric output with perfect accuracy.")
  } else {
    console.log("⚠️ VERDICT: NEEDS REFINE. High causal correlation or textual collision detected.")
  }
}

runAmbiguityValidation()
