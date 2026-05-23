ALTER TABLE "users"
  ADD COLUMN "firebase_uid" TEXT,
  ALTER COLUMN "email" DROP NOT NULL,
  ALTER COLUMN "password_hash" DROP NOT NULL;

CREATE UNIQUE INDEX "users_firebase_uid_key" ON "users"("firebase_uid");
