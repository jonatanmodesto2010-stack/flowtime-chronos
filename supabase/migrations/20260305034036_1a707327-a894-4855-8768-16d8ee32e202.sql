
-- Temporarily disable the audit trigger that causes issues
ALTER TABLE timeline_events DISABLE TRIGGER update_timeline_audit_on_event_delete;

-- Delete all events
DELETE FROM timeline_events;

-- Re-enable the trigger
ALTER TABLE timeline_events ENABLE TRIGGER update_timeline_audit_on_event_delete;
