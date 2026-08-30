-- ClassPlannedSession is created by 20260825090000_class_planned_sessions.
-- Keep this dependency after that migration so attendance can be deployed
-- in chronological order on a fresh database. The guard also makes the
-- one-time recovery safe if a partial repair already added this constraint.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'StudentAttendance_classPlannedSessionId_fkey'
      AND conrelid = '"StudentAttendance"'::regclass
  ) THEN
    ALTER TABLE "StudentAttendance"
    ADD CONSTRAINT "StudentAttendance_classPlannedSessionId_fkey"
    FOREIGN KEY ("classPlannedSessionId")
    REFERENCES "ClassPlannedSession"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
