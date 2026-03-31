import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.log("Missing ENV vars!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey)

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

  console.log("LOGS ERROR:", logsError)
  console.log("LOGS DATA:", logs ? logs.length : null)
  
  if (logs && logs.length > 0) {
    console.log("LOGS[0] log_date:", logs[0].log_date)
  }
}
testFetch()
