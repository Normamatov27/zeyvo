-- V7 — Allow 'appointment' as a ticket source (check-in from scheduled appointment)
ALTER TABLE app.ticket
  DROP CONSTRAINT IF EXISTS ticket_source_check;
ALTER TABLE app.ticket
  ADD CONSTRAINT ticket_source_check
  CHECK (source IN ('remote','walk_in','kiosk','telegram','agent','legacy_bridge','appointment'));
