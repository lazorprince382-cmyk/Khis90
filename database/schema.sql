-- Kabojja International School (KIS) Management System
-- PostgreSQL Database Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Offices / Staff departments that receive notifications
CREATE TABLE offices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Learners
CREATE TABLE learners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_id VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    class_name VARCHAR(50) NOT NULL,
    date_of_birth DATE,
    parent_phone VARCHAR(20),
    parent_email VARCHAR(255),
    photo_url VARCHAR(500),
    qr_code_data TEXT NOT NULL,
    barcode_data VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Current learner status (location tracking)
CREATE TYPE location_status AS ENUM (
    'out_of_school',
    'in_school',
    'in_library',
    'at_lunch'
);

CREATE TABLE learner_status (
    learner_id UUID PRIMARY KEY REFERENCES learners(id) ON DELETE CASCADE,
    current_location location_status DEFAULT 'out_of_school',
    last_scan_at TIMESTAMP,
    lunch_today BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Scan event types
CREATE TYPE scan_type AS ENUM (
    'gate_in',
    'gate_out',
    'lunch',
    'library_in',
    'library_out'
);

-- All scan events (audit trail)
CREATE TABLE scan_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    learner_id UUID NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
    scan_type scan_type NOT NULL,
    scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    scanner_location VARCHAR(100),
    notes TEXT
);

CREATE INDEX idx_scan_events_learner ON scan_events(learner_id);
CREATE INDEX idx_scan_events_date ON scan_events(scanned_at);
CREATE INDEX idx_scan_events_type ON scan_events(scan_type);

-- Notifications for offices
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    office_id UUID REFERENCES offices(id) ON DELETE SET NULL,
    learner_id UUID REFERENCES learners(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_unread ON notifications(is_read) WHERE is_read = FALSE;

-- Staff users for login (optional)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    role VARCHAR(50) DEFAULT 'staff',
    office_id UUID REFERENCES offices(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed default offices
INSERT INTO offices (name, department, email) VALUES
    ('Main Office', 'Administration', 'admin@kabojja.ac.ug'),
    ('Security Office', 'Security', 'security@kabojja.ac.ug'),
    ('Library Office', 'Library', 'library@kabojja.ac.ug'),
    ('Cafeteria Office', 'Cafeteria', 'cafeteria@kabojja.ac.ug');

-- Function to update learner status timestamp
CREATE OR REPLACE FUNCTION update_learner_status_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER learner_status_updated
    BEFORE UPDATE ON learner_status
    FOR EACH ROW EXECUTE FUNCTION update_learner_status_timestamp();
