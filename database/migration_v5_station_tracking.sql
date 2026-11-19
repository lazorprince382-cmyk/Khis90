-- KIS v5: independent station movement tracking
-- Gate attendance remains the learner's school-presence status. Every other
-- station is recorded as an independent event/session in scan_events.
DO $$ BEGIN
  ALTER TYPE scan_type ADD VALUE IF NOT EXISTS 'meal_break';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE scan_type ADD VALUE IF NOT EXISTS 'meal_lunch';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE scan_type ADD VALUE IF NOT EXISTS 'meal_supper';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE scan_type ADD VALUE IF NOT EXISTS 'dormitory_in';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE scan_type ADD VALUE IF NOT EXISTS 'dormitory_out';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_scan_events_learner_type_time
ON scan_events (learner_id, scan_type, scanned_at DESC);
