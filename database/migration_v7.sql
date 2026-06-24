-- KIS v7: admin operations, auditing, sessions, permission templates, import batches

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(80),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);

CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_id UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    ip_address VARCHAR(80),
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token_id);

CREATE TABLE IF NOT EXISTS permission_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    role VARCHAR(100) NOT NULL,
    dashboard_access TEXT[] DEFAULT '{}',
    notification_access TEXT[] DEFAULT '{}',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS import_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    file_name VARCHAR(255),
    total_rows INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    errors JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO permission_templates (name, role, dashboard_access, notification_access)
SELECT 'Security Desk', 'security',
       ARRAY['/', '/lookup', '/scan/gate', '/scan/lunch', '/notifications', '/messages', '/visitors', '/staff'],
       ARRAY['gate_in', 'gate_out', 'late_arrival', 'early_departure', 'visitor_in', 'visitor_out', 'staff_in', 'staff_out']
WHERE NOT EXISTS (SELECT 1 FROM permission_templates WHERE name = 'Security Desk');

INSERT INTO permission_templates (name, role, dashboard_access, notification_access)
SELECT 'Class Staff', 'staff',
       ARRAY['/', '/lookup', '/notifications', '/messages'],
       ARRAY['gate_in', 'gate_out', 'late_arrival', 'early_departure', 'lunch', 'library_in', 'library_out']
WHERE NOT EXISTS (SELECT 1 FROM permission_templates WHERE name = 'Class Staff');
