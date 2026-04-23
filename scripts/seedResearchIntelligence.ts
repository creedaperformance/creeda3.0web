import { seedResearchIntelligence } from '@/lib/research/seed'

async function main() {
  const result = await seedResearchIntelligence()
  console.info(JSON.stringify({ ok: true, ...result }))
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }))
  process.exitCode = 1
})
