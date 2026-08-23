-- At most one active inspector may own an inspection district.
-- Partial index keeps inactive historical accounts assignable again.
CREATE UNIQUE INDEX IF NOT EXISTS "User_active_inspector_district_key"
  ON "User" ("districtId")
  WHERE "role" = 'inspector' AND "status" = 'active' AND "districtId" <> '';
