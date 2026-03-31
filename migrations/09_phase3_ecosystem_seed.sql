-- Phase 3 CREEDA Ecosystem & Assisted Discovery
-- Safely creates standalone platform_practitioners and platform_events tables.
-- Seeds initial real-world data specifically targeted for the Indian market to ensure relevance.

-- platform_practitioners removed

CREATE TABLE IF NOT EXISTS platform_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_name TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    location TEXT NOT NULL,
    skill_level TEXT NOT NULL,
    registration_link TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ecosystem tables are now initialized empty for production readiness.
