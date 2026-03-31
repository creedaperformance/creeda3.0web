
import { processAthleticIntelligence, AthleteContext } from '../src/lib/intelligence_engine'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

async function runIdentityMemoryAudit() {
  console.log("🧠 CREEDA Identity Memory & Pattern Evolution Audit (30-Day Simulation)\n")

  const archetypes = [
    { name: "Soreness Underreporter", id: "underreporter" },
    { name: "Delayed Fatigue (48h)", id: "delayed" },
    { name: "Psychologically Volatile", id: "volatile" },
    { name: "Resilient Elite", id: "resilient" }
  ]

  for (const arch of archetypes) {
    console.log(`\n👤 Testing Archetype: ${arch.name}`)
    let history: any[] = []
    
    // Simulate 30 days
    for (let day = 1; day <= 30; day++) {
      const date = `2026-03-${day.toString().padStart(2, '0')}`
      let currentLog: any = {
        date,
        sleep_quality: 'Good',
        energy_level: 'High',
        muscle_soreness: 'Normal',
        stress_level: 'Low',
        mental_readiness: 'Focused',
        day_type: ['Training'],
        load: 5,
        rpe: 5
      }

      // Inject Archetype Behavior
      if (arch.id === 'underreporter') {
        // High load sessions, but always reports "Normal" soreness
        if (day % 3 === 0) { currentLog.load = 9; currentLog.rpe = 9; }
        currentLog.muscle_soreness = 'Normal'
        // Energy drops as systemic fatigue builds
        if (day > 10) currentLog.energy_level = 'Moderate';
        if (day > 20) currentLog.energy_level = 'Low';
      } 
      else if (arch.id === 'delayed') {
        // Match on day 1, 8, 15, 22
        const isMatch = (day - 1) % 7 === 0;
        if (isMatch) {
          currentLog.day_type = ['COMPETITION'];
          currentLog.load = 10;
          currentLog.rpe = 10;
        }
        // 48h after match (day 3, 10, 17, 24), soreness spikes
        const is48hPostMatch = (day - 3) % 7 === 0;
        if (is48hPostMatch) {
          currentLog.muscle_soreness = 'Stiff/Sore';
        }
      }
      else if (arch.id === 'volatile') {
        // Mental state flips frequently regardless of load
        const mentalStates = ['Combat-ready', 'Not ready', 'Focused', 'Distracted'];
        currentLog.mental_readiness = mentalStates[day % 4];
      }
      else if (arch.id === 'resilient') {
        // Chronic high load, but maintains status
        currentLog.load = 9;
        currentLog.rpe = 9;
        currentLog.sleep_quality = 'Excellent';
        currentLog.muscle_soreness = 'Normal';
        currentLog.energy_level = 'Peak';
        currentLog.mental_readiness = 'Combat-ready';
      }

      const context: AthleteContext = {
        fullName: arch.name,
        sport: 'Rugby',
        position: 'Flanker',
        goal: 'Performance'
      }

      const result = processAthleticIntelligence(context, currentLog, history, { profile_data: { gender: 'Male' } })
      // CRITICAL: history logs MUST include the readinessScore for identity memory to work!
      history.unshift({ ...currentLog, readinessScore: result.readinessScore });

      // Output specific "evolution" markers at Key Days
      const isKeyDay = day === 3 || day === 4 || day === 5 || day === 15 || day === 30;
      const hasPatternText = result.athleteJudgement.includes('48h') || result.athleteJudgement.includes('resilience') || result.athleteJudgement.includes('underreport');

      if (isKeyDay || hasPatternText) {
        console.log(`> Day ${day} Judgement:`)
        console.log(`  ${result.athleteJudgement.substring(0, 250)}...`)
      }
    }
  }

  console.log("\n📊 Identity Memory Audit Summary:")
  console.log("- Underreporter Detection: Manual verification required (look for 'underreport' in judgements).")
  console.log("- Delayed Fatigue Memory: Manual verification required (look for '48h delayed-onset' in judgements).")
  console.log("- Volatility Awareness: Manual verification required (look for 'volatility' in judgements).")
  console.log("- Resilience Documentation: Manual verification required (look for 'resilience' in judgements).")
}

runIdentityMemoryAudit()
