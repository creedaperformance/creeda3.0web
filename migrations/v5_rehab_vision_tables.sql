-- CREEDA V5: rehab_history table
-- Tracks rehab stage progression per athlete per injury
-- Do NOT use JSONB in daily_load_logs — this is a dedicated table.

CREATE TABLE IF NOT EXISTS rehab_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  injury_type TEXT, -- HAMSTRING, ACL, ANKLE, SHOULDER, KNEE, LOWER_BACK, GROIN, CALF
  stage INTEGER NOT NULL DEFAULT 1 CHECK (stage >= 1 AND stage <= 5),
  pain_score NUMERIC(3,1) NOT NULL DEFAULT 0 CHECK (pain_score >= 0 AND pain_score <= 10),
  load_tolerance NUMERIC(3,2) DEFAULT 0.5 CHECK (load_tolerance >= 0 AND load_tolerance <= 1),
  progression_flag TEXT NOT NULL DEFAULT 'started' CHECK (progression_flag IN ('progressed', 'regressed', 'held', 'started')),
  movement_quality INTEGER DEFAULT 75 CHECK (movement_quality >= 0 AND movement_quality <= 100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, date, injury_type)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rehab_history_user_date ON rehab_history(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_rehab_history_user_injury ON rehab_history(user_id, injury_type);

-- V5: vision_faults table — store last 3-5 scan session results
CREATE TABLE IF NOT EXISTS vision_faults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_date TIMESTAMPTZ DEFAULT NOW(),
  sport TEXT NOT NULL,
  fault TEXT NOT NULL,
  risk_mapping TEXT NOT NULL,
  corrective_drills TEXT[] NOT NULL DEFAULT '{}',
  severity TEXT NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'moderate', 'high')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vision_faults_user ON vision_faults(user_id, session_date DESC);

-- RLS policies
ALTER TABLE rehab_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE vision_faults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rehab history" ON rehab_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rehab history" ON rehab_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rehab history" ON rehab_history
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own vision faults" ON vision_faults
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vision faults" ON vision_faults
  FOR INSERT WITH CHECK (auth.uid() = user_id);
