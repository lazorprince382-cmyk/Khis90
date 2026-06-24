-- KIS v2 Migration: auth, staff, visitors, settings, holidays, terms, card management

-- School settings (single row)
CREATE TABLE IF NOT EXISTS school_settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    late_arrival_time TIME DEFAULT '08:00',
    early_departure_time TIME DEFAULT '14:00',
    school_open_time TIME DEFAULT '07:00',
    school_close_time TIME DEFAULT '17:00',
    scan_cooldown_seconds INTEGER DEFAULT 30,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO school_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Academic terms
CREATE TABLE IF NOT EXISTS academic_terms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Holidays / closed days
CREATE TABLE IF NOT EXISTS holidays (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    holiday_date DATE NOT NULL UNIQUE,
    is_closed BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Card history (deactivate / reissue)
CREATE TABLE IF NOT EXISTS card_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    learner_id UUID NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
    old_card_id VARCHAR(20) NOT NULL,
    new_card_id VARCHAR(20),
    action VARCHAR(50) NOT NULL,
    reason TEXT,
    performed_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Learner columns for card management & terms
ALTER TABLE learners ADD COLUMN IF NOT EXISTS term_id UUID REFERENCES academic_terms(id);
ALTER TABLE learners ADD COLUMN IF NOT EXISTS card_deactivated_at TIMESTAMP;
ALTER TABLE learners ADD COLUMN IF NOT EXISTS deactivation_reason TEXT;

-- Staff members
CREATE TABLE IF NOT EXISTS staff_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_id VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    department VARCHAR(100),
    job_title VARCHAR(100),
    qr_code_data TEXT,
    barcode_data VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    is_in_school BOOLEAN DEFAULT FALSE,
    last_scan_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS staff_scan_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
    scan_type VARCHAR(20) NOT NULL,
    scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    scanner_location VARCHAR(100),
    notes TEXT
);

-- Visitors
CREATE TABLE IF NOT EXISTS visitors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(200) NOT NULL,
    phone VARCHAR(20),
    purpose VARCHAR(300),
    host_name VARCHAR(200),
    id_number VARCHAR(50),
    check_in_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    check_out_at TIMESTAMP,
    checked_in_by UUID REFERENCES users(id),
    notes TEXT
);

-- Extend scan_events with alert flags
ALTER TABLE scan_events ADD COLUMN IF NOT EXISTS is_late_arrival BOOLEAN DEFAULT FALSE;
ALTER TABLE scan_events ADD COLUMN IF NOT EXISTS is_early_departure BOOLEAN DEFAULT FALSE;
ALTER TABLE scan_events ADD COLUMN IF NOT EXISTS alert_message TEXT;

-- Seed current term if none exists
INSERT INTO academic_terms (name, year, start_date, end_date, is_current)
SELECT 'Term 1', EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, DATE_TRUNC('year', CURRENT_DATE)::DATE, (DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year' - INTERVAL '1 day')::DATE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM academic_terms);

-- Default admin seeded by setupDb.js (username: admin, password: admin123)
