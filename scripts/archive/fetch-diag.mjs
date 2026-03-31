import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function testFetch() {
  const { data: { session }, error: authError } = await supabase.auth.signInWithPassword({
    email: 'kunalv.physio@gmail.com',
    password: 'kunalvarma'
  })

  if (authError) {
    console.error("Auth failed:", authError)
    return
  }

  const user = session.user

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  
  const { data: logs, error: logsError } = await supabase
    .from('daily_load_logs')
    .select('*')
    .eq('athlete_id', user.id)
    .gte('log_date', sevenDaysAgo.toISOString().split('T')[0])
    .order('log_date', { ascending: true })

  console.log("LOGS_ERROR:", logsError); console.log("LOGS:", JSON.stringify(logs, null, 2))
  
  if (logs && logs.length > 0) {
    console.log("typeof log_date:", typeof logs[0].log_date)
    console.log("typeof pain_location:", typeof logs[0].pain_location)
  }
}
testFetch()
