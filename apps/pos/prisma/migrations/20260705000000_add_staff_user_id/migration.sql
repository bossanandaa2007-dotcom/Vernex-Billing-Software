ALTER TABLE "StaffProfile"
ADD COLUMN "userId" TEXT;

UPDATE "StaffProfile"
SET "userId" =
  COALESCE(
    NULLIF(
      regexp_replace(
        lower(split_part("email", '@', 1)),
        '[^a-z0-9_-]+',
        '',
        'g'
      ),
      ''
    ),
    'user'
  ) || '-' || substr(md5("id"), 1, 6);

ALTER TABLE "StaffProfile"
ALTER COLUMN "userId" SET NOT NULL;

CREATE UNIQUE INDEX "StaffProfile_userId_key"
ON "StaffProfile"("userId");

CREATE OR REPLACE FUNCTION set_vernex_staff_user_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  base_user_id TEXT;
BEGIN
  IF NEW."userId" IS NULL OR btrim(NEW."userId") = '' THEN
    base_user_id := NULLIF(
      regexp_replace(
        lower(split_part(NEW."email", '@', 1)),
        '[^a-z0-9_-]+',
        '',
        'g'
      ),
      ''
    );
    NEW."userId" :=
      COALESCE(base_user_id, 'user') || '-' || substr(md5(NEW."id"), 1, 6);
  ELSE
    NEW."userId" := lower(btrim(NEW."userId"));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "StaffProfile_set_userId"
BEFORE INSERT OR UPDATE OF "userId"
ON "StaffProfile"
FOR EACH ROW
EXECUTE FUNCTION set_vernex_staff_user_id();
