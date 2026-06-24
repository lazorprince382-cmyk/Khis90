-- KIS v6: Internal account messaging

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    attachment_url TEXT,
    attachment_name TEXT,
    attachment_mime VARCHAR(120),
    attachment_size INTEGER,
    is_voice_note BOOLEAN DEFAULT FALSE,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_name TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_mime VARCHAR(120);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_size INTEGER;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_voice_note BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_pair_created ON messages(sender_id, recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(recipient_id, is_read) WHERE is_read = FALSE;

UPDATE users
SET dashboard_access = array_append(dashboard_access, '/messages')
WHERE dashboard_access IS NOT NULL
  AND NOT dashboard_access @> ARRAY['*']
  AND NOT dashboard_access @> ARRAY['/messages'];
