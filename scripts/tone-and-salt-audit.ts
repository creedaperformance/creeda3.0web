
import { processAthleticIntelligence, AthleteContext } from '../src/lib/intelligence_engine'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

async function runToneAndSaltAudit() {
  console.log("⚖️ CREEDA Tone & Salting Influence Audit\n")

  const auditResults: any[] = []

  // --- PART 1: SALTING DRIFT TEST ---
  console.log("🧪 TEST 1: Contextual Salting Drift (Same Physiology, Different Identity/Time)")
  const physLog = {
    sleep_quality: 'Okay',
    energy_level: 'Moderate',
    muscle_soreness: 'Normal',
    stress_level: 'Moderate',
    current_pain_level: 0,
    day_type: ['Training']
  }

  const identities = [
    { fullName: "Athlete A", date: "2026-03-01" },
    { fullName: "Athlete B", date: "2026-03-01" },
    { fullName: "Athlete A", date: "2026-03-02" }
  ]

  identities.forEach(id => {
    const context: AthleteContext = { ...id, sport: 'Football', position: 'Midfielder', goal: 'Performance' }
    const result = processAthleticIntelligence(context, { ...physLog, date: id.date }, [], { profile_data: { gender: 'Male' } })
    console.log(`> [${id.fullName} | ${id.date}] Score: ${result.readinessScore} | Limiter: ${result.todayStatus.limiter}`)
    console.log(`  Judgement: ${result.combinedInsight}\n`)
  })

  // --- PART 2: TONE CALIBRATION TEST ---
  console.log("🧪 TEST 2: Tone Calibration (Scaling Severity for 'Pain' Signal)")
  const severityLevels = [
    { label: 'Mild', pain: 2, energy: 'Peak' },     // ~80 score
    { label: 'Moderate', pain: 5, energy: 'High' }, // ~60 score
    { label: 'Critical', pain: 9, energy: 'Low' }   // ~30 score
  ]

  severityLevels.forEach(level => {
    const log: any = {
      current_pain_level: level.pain,
      pain_location: ['Knee'],
      energy_level: level.energy,
      sleep_quality: 'Good',
      muscle_soreness: 'Normal',
      stress_level: 'Low',
      day_type: ['Training']
    }
    const context: AthleteContext = { fullName: "Test Athlete", sport: 'Basketball', position: 'Guard', goal: 'Performance' }
    const result = processAthleticIntelligence(context, log, [], { profile_data: { gender: 'Male' } })
    
    console.log(`--- [${level.label} Severity] ---`)
    console.log(`Readiness: ${result.readinessScore} | Status: ${result.status}`)
    console.log(`Athlete Tone: ${result.athleteJudgement}`)
    console.log(`Coach Tone: ${result.coachJudgement}`)
    console.log(`Rec Priority: ${result.reasonedRecommendations[0]?.priority}\n`)

    auditResults.push({
      level: level.label,
      athleteTone: result.athleteJudgement,
      coachTone: result.coachJudgement,
      priority: result.reasonedRecommendations[0]?.priority,
      score: result.readinessScore
    })
  })

  // --- ANALYSIS ---
  console.log("📊 Audit Analysis:")
  
  // Validate Urgency Scaling
  const priorities = auditResults.map(r => r.priority)
  const isUrgencyCorrect = priorities[0] !== 'high' && priorities[2] === 'high'
  console.log(`- Urgency Scaling: ${isUrgencyCorrect ? '✅ PASS' : '❌ FAIL'}`)

  // Validate Tone Seriousness
  const criticalTone = auditResults.find(r => r.level === 'Critical')?.coachTone
  const isToneSerious = criticalTone?.includes('CRITICAL') || criticalTone?.includes('SYSTEMIC') || criticalTone?.includes('CLINICAL')
  console.log(`- Tone Seriousness (Critical): ${isToneSerious ? '✅ PASS' : '❌ FAIL'}`)

  // Validate Role Differentiation
  const coachVsAthleteDiff = auditResults[1].coachTone !== auditResults[1].athleteTone
  console.log(`- Role Differentiation: ${coachVsAthleteDiff ? '✅ PASS' : '❌ FAIL'}`)

  console.log("\n✅ AUDIT COMPLETE")
}

runToneAndSaltAudit()
