-- KIS v3: Day/Boarding access + Dynamic Office Dashboards

-- Learner type: day scholar vs boarding scholar
DO $$ BEGIN
  CREATE TYPE learner_type AS ENUM ('day', 'boarding');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE learners ADD COLUMN IF NOT EXISTS learner_type learner_type DEFAULT 'day';
ALTER TABLE learners ADD COLUMN IF NOT EXISTS section VARCHAR(50);
ALTER TABLE learners ADD COLUMN IF NOT EXISTS boarding_house VARCHAR(100);
ALTER TABLE learners ADD COLUMN IF NOT EXISTS exeat_authorized BOOLEAN DEFAULT FALSE;
ALTER TABLE learners ADD COLUMN IF NOT EXISTS exeat_authorized_until TIMESTAMP;
ALTER TABLE learners ADD COLUMN IF NOT EXISTS exeat_reason TEXT;

-- Enhance offices for admin-created dashboards
ALTER TABLE offices ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE offices ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE offices ADD COLUMN IF NOT EXISTS monitor_classes TEXT[] DEFAULT '{}';
ALTER TABLE offices ADD COLUMN IF NOT EXISTS monitor_sections TEXT[] DEFAULT '{}';
ALTER TABLE offices ADD COLUMN IF NOT EXISTS monitor_learner_types TEXT[] DEFAULT '{day,boarding}';
ALTER TABLE offices ADD COLUMN IF NOT EXISTS dashboard_color VARCHAR(20) DEFAULT '#7B1E3A';
ALTER TABLE offices ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

-- Link notifications to specific office (already has office_id)
-- Office user assignments (users can belong to an office)
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Exeat authorization log
CREATE TABLE IF NOT EXISTS exeat_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    learner_id UUID NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
    authorized_by UUID REFERENCES users(id),
    office_id UUID REFERENCES offices(id),
    reason TEXT,
    authorized_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP,
    used_at TIMESTAMP,
    revoked BOOLEAN DEFAULT FALSE
);

-- Boarding-specific scan type for weekend/exeat exit
DO $$ BEGIN
  ALTER TYPE scan_type ADD VALUE IF NOT EXISTS 'boarding_exeat_out';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE scan_type ADD VALUE IF NOT EXISTS 'boarding_exeat_in';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Seed KIS-style offices if only defaults exist
INSERT INTO offices (name, department, email, description, monitor_classes, monitor_sections, monitor_learner_types, dashboard_color)
SELECT 'Boarding Office', 'Boarding', 'boarding@kabojja.ac.ug',
       'Monitors boarding scholars in houses and campus',
       '{}', '{High School,Primary,Early Years}', '{boarding}', '#2E8BC0'
WHERE NOT EXISTS (SELECT 1 FROM offices WHERE name = 'Boarding Office');

INSERT INTO offices (name, department, email, description, monitor_classes, monitor_sections, monitor_learner_types, dashboard_color)
SELECT 'Day Scholars Office', 'Day Scholars', 'dayscholars@kabojja.ac.ug',
       'Monitors day scholars arrival, departure and transport',
       '{}', '{High School,Primary,Early Years}', '{day}', '#F5C518'
WHERE NOT EXISTS (SELECT 1 FROM offices WHERE name = 'Day Scholars Office');
