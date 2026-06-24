-- KIS v4: learner registration numbers, card expiry, and richer student management

ALTER TABLE learners ADD COLUMN IF NOT EXISTS registration_number VARCHAR(80);
ALTER TABLE learners ADD COLUMN IF NOT EXISTS card_expires_at DATE;

CREATE UNIQUE INDEX IF NOT EXISTS learners_registration_number_unique
ON learners (LOWER(registration_number))
WHERE registration_number IS NOT NULL AND registration_number <> '';
