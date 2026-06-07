-- Fix participations.status CHECK constraint
-- Add 'pending' (for host-approval flow) and 'completed'
ALTER TABLE participations DROP CONSTRAINT IF EXISTS participations_status_check;
ALTER TABLE participations ADD CONSTRAINT participations_status_check
  CHECK (status IN ('pending', 'joined', 'cancelled', 'no_show', 'completed'));
