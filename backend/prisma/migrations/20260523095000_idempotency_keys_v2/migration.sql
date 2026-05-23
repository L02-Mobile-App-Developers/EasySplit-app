DROP TABLE IF EXISTS "idempotency_keys";

CREATE TABLE "idempotency_keys" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "key" VARCHAR(255) NOT NULL,
  "method" VARCHAR(10) NOT NULL,
  "path" VARCHAR(500) NOT NULL,
  "request_hash" VARCHAR(64) NOT NULL,
  "response_body" JSONB,
  "status_code" INTEGER,
  "state" VARCHAR(20) NOT NULL DEFAULT 'processing',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "idempotency_keys_user_id_key_key" ON "idempotency_keys"("user_id", "key");
CREATE INDEX "idempotency_keys_expires_at_idx" ON "idempotency_keys"("expires_at");
CREATE INDEX "idempotency_keys_state_expires_at_idx" ON "idempotency_keys"("state", "expires_at");
