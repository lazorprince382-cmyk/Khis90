-- KIS v5: Account-based dashboard visibility and notification routing

ALTER TABLE users ADD COLUMN IF NOT EXISTS dashboard_access TEXT[] DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_access TEXT[] DEFAULT '{}';

UPDATE users
SET dashboard_access = CASE
    WHEN role = 'admin' THEN ARRAY['*']
    WHEN role = 'security' THEN ARRAY['/', '/lookup', '/scan/gate', '/scan/lunch', '/notifications', '/visitors', '/staff']
    WHEN role = 'librarian' THEN ARRAY['/', '/lookup', '/scan/library', '/notifications']
    WHEN role = 'cafeteria' THEN ARRAY['/', '/lookup', '/scan/lunch', '/notifications']
    ELSE ARRAY['/', '/lookup', '/notifications']
  END
WHERE dashboard_access IS NULL OR dashboard_access = '{}';

UPDATE users
SET notification_access = CASE
    WHEN role = 'admin' THEN ARRAY['*']
    WHEN role = 'security' THEN ARRAY['gate_in', 'gate_out', 'late_arrival', 'early_departure', 'visitor_in', 'visitor_out', 'staff_in', 'staff_out']
    WHEN role = 'librarian' THEN ARRAY['library_in', 'library_out']
    WHEN role = 'cafeteria' THEN ARRAY['lunch']
    ELSE ARRAY['gate_in', 'gate_out', 'late_arrival', 'early_departure', 'lunch', 'library_in', 'library_out', 'visitor_in', 'visitor_out', 'staff_in', 'staff_out', 'exeat_authorized']
  END
WHERE notification_access IS NULL OR notification_access = '{}';
