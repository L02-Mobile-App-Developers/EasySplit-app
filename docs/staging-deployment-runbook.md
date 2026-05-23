# EasySplit Backend Staging Deployment Runbook

## 1. Staging Architecture

Staging should mirror production behavior as closely as possible while remaining isolated from production data.

- Backend host: deploy the Express backend as a Node.js service on the staging platform, for example Render, Railway, Fly.io, AWS, GCP, Azure, or an internal VM/container host.
- PostgreSQL cloud database: use a dedicated staging PostgreSQL database, for example Neon or Supabase. PostgreSQL remains the source of truth for users, groups, expenses, balances, settlements, entitlements, audit logs, activities, and idempotency records.
- Firebase Auth: clients authenticate with Firebase Authentication, including Google Sign-In. The backend verifies Firebase ID tokens with Firebase Admin SDK.
- Prisma migrations: schema changes are applied with `npx prisma migrate deploy` during deployment. Do not use `prisma migrate dev` in staging.

Firebase must not be used as the main financial database.

## 2. Required Environment Variables

Set these variables on the staging backend host.

```bash
NODE_ENV=staging
DEV_AUTH_ENABLED=false
PORT=8080
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB_NAME?schema=public&sslmode=require"
```

Firebase Admin credentials: provide exactly one safe credential strategy.

```bash
FIREBASE_PROJECT_ID="your-staging-firebase-project-id"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-...@your-project.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Alternative Firebase credential strategies supported by the backend:

```bash
FIREBASE_SERVICE_ACCOUNT_JSON='{"project_id":"..."}'
FIREBASE_SERVICE_ACCOUNT_BASE64="base64-encoded-service-account-json"
GOOGLE_APPLICATION_CREDENTIALS="/secure/runtime/path/service-account.json"
```

Idempotency configuration:

```bash
IDEMPOTENCY_WINDOW_HOURS=24
IDEMPOTENCY_PROCESSING_TIMEOUT_SECONDS=30
```

Free tier quota configuration:

```bash
FREE_MAX_GROUPS=3
FREE_SMART_SETTLE_PER_MONTH=3
FREE_HISTORY_DAYS=90
```

CORS configuration:

```bash
CORS_ORIGIN="https://staging-web.example.com,capacitor://localhost,http://localhost:19006"
```

Current code should be checked before relying on CORS allowlisting, because the backend currently uses Express CORS middleware. If the staging host requires strict CORS allowlisting, verify that the deployed build reads the intended CORS variable before exposing the API broadly.

Local JWT variables may remain configured for development compatibility, but staging authentication must use Firebase ID tokens:

```bash
JWT_SECRET="staging-only-random-secret"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_EXPIRES_IN="30d"
```

## 3. Firebase Setup

1. Create a dedicated Firebase project for staging.
2. Enable Authentication.
3. Enable Google Sign-In under Authentication providers.
4. Add the staging web domain, Android package, and iOS bundle identifiers as needed by the frontend/mobile clients.
5. Create a Firebase Admin service account for the backend.
6. Store credentials only in the deployment platform secret manager or environment variable store.
7. Never commit service account JSON, private keys, or generated `.env` files.

Recommended credential handling:

- Prefer platform-managed secrets over checked-in files.
- If using `FIREBASE_PRIVATE_KEY`, preserve newline characters as `\n`.
- If the platform makes multiline secrets awkward, use `FIREBASE_SERVICE_ACCOUNT_BASE64`.
- Rotate the service account key if it is ever exposed.

## 4. PostgreSQL Setup

1. Create a dedicated staging PostgreSQL database on Neon, Supabase, or another managed PostgreSQL provider.
2. Create a staging database user with the permissions required for Prisma migrations and application queries.
3. Set `DATABASE_URL` on the backend host.
4. Include `sslmode=require` if required by the provider.
5. Confirm connectivity from the deployment environment.
6. Run Prisma migration deploy:

```bash
cd backend
npx prisma generate
npx prisma migrate deploy
```

Do not point staging at a local Docker database or production database.

## 5. Deployment Steps

From the backend directory:

```bash
cd backend
npm install
npx prisma generate
npm run build
npx prisma migrate deploy
npm run start
```

Platform start command:

```bash
npm run start
```

The backend entrypoint runs `node dist/index.js`.

Recommended deployment order:

1. Configure environment variables and secrets.
2. Install dependencies.
3. Generate Prisma client.
4. Build TypeScript.
5. Deploy database migrations.
6. Start the service.
7. Run smoke tests.

## 6. Smoke Test Checklist

Use the staging base URL, for example:

```bash
BASE_URL="https://staging-api.example.com/api/v1"
```

Public endpoints:

```bash
curl "$BASE_URL/health"
curl "$BASE_URL/ready"
```

Expected health response:

```json
{
  "status": "ok",
  "timestamp": "2026-05-23T00:00:00.000Z"
}
```

Authenticated requests require:

```http
Authorization: Bearer <firebase_id_token>
```

Auth sync:

```bash
curl -X POST "$BASE_URL/auth/sync" \
  -H "Authorization: Bearer $FIREBASE_ID_TOKEN"
```

Create group:

```bash
curl -X POST "$BASE_URL/groups" \
  -H "Authorization: Bearer $FIREBASE_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Staging Trip","currency":"VND"}'
```

Create expense with idempotency:

```bash
curl -X POST "$BASE_URL/groups/$GROUP_ID/expenses" \
  -H "Authorization: Bearer $FIREBASE_ID_TOKEN" \
  -H "Idempotency-Key: staging-expense-001" \
  -H "Content-Type: application/json" \
  -d '{
    "description":"Dinner",
    "amount":300000,
    "paidByUserId":"USER_ID",
    "splitMode":"EQUAL",
    "participants":[
      {"userId":"USER_ID"},
      {"userId":"MEMBER_USER_ID"}
    ]
  }'
```

Retry the same expense request with the same `Idempotency-Key` and same body. Expected result: same stored response body and original status code, without creating a duplicate expense.

Create settlement:

```bash
curl -X POST "$BASE_URL/groups/$GROUP_ID/settlements" \
  -H "Authorization: Bearer $FIREBASE_ID_TOKEN" \
  -H "Idempotency-Key: staging-settlement-001" \
  -H "Content-Type: application/json" \
  -d '{
    "fromUserId":"DEBTOR_USER_ID",
    "toUserId":"CREDITOR_USER_ID",
    "amount":100000
  }'
```

Group settlement simulate:

```bash
curl -X POST "$BASE_URL/groups/$GROUP_ID/group-settlement" \
  -H "Authorization: Bearer $FIREBASE_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mode":"simulate"}'
```

Expected simulate behavior:

- Returns suggested transfers.
- Does not create settlements.
- Does not update balances.

Group settlement commit:

```bash
curl -X POST "$BASE_URL/groups/$GROUP_ID/group-settlement" \
  -H "Authorization: Bearer $FIREBASE_ID_TOKEN" \
  -H "Idempotency-Key: staging-group-settlement-001" \
  -H "Content-Type: application/json" \
  -d '{"mode":"commit"}'
```

Expected commit behavior:

- Requires premium entitlement based on group owner.
- Creates settlement rows.
- Updates balances transactionally.
- Preserves group zero-sum balance invariant.
- Writes audit logs.

## 7. Rollback Plan

Application rollback:

1. Revert the backend deployment to the previous known-good build.
2. Keep the staging database online unless there is a confirmed data integrity incident.
3. Re-run smoke tests after rollback.

Database rollback:

- Do not blindly rollback database migrations.
- Prisma migrations may contain irreversible data or schema changes.
- Only rollback a migration if there is a documented down plan or a manually reviewed recovery script.
- Prefer forward-fix migrations when possible.

Financial flow failure response:

1. Stop or disable the affected endpoint if the platform supports traffic controls.
2. Check `AuditLog` rows for the impacted group/entity.
3. Check `IdempotencyKey` rows for stuck `processing`, failed, or duplicate request records.
4. Check `Settlement`, `Expense`, `ExpenseParticipant`, and `Balance` rows for the impacted group.
5. Preserve logs before redeploying.

## 8. Troubleshooting

### Firebase token invalid

Symptoms:

- Protected endpoints return `UNAUTHORIZED`.
- `/auth/sync` fails.

Checks:

- Confirm the client sends `Authorization: Bearer <firebase_id_token>`.
- Confirm the token is from the staging Firebase project.
- Confirm Firebase Admin credentials are for the same Firebase project.
- Confirm Google Sign-In is enabled.
- Confirm the service account private key is formatted correctly.

### DATABASE_URL invalid

Symptoms:

- `/api/v1/ready` fails.
- Prisma startup or migrations fail.
- Runtime database queries fail.

Checks:

- Confirm host, port, database name, username, and password.
- Confirm `sslmode=require` if required by Neon/Supabase.
- Confirm the staging database exists.
- Confirm the deployment platform allows outbound connections to the database.

### Prisma migration failure

Symptoms:

- `npx prisma migrate deploy` exits with an error.
- Backend starts with schema mismatch errors.

Checks:

- Review the migration error output before retrying.
- Confirm `DATABASE_URL` points to staging, not production.
- Confirm the database user has migration permissions.
- Do not run `prisma migrate dev` in staging.
- Do not manually edit applied migration files.

### DEV_AUTH_ENABLED accidentally true

Symptoms:

- Startup fails if `NODE_ENV=production`.
- Staging may unexpectedly allow local dev auth if misconfigured.

Checks:

- Set `DEV_AUTH_ENABLED=false` in staging.
- Keep `NODE_ENV=staging`.
- Do not enable `X-User-Id` auth outside local development/test.

### CORS issue from frontend/mobile

Symptoms:

- Browser requests fail before reaching the backend handler.
- Mobile/web clients see CORS or preflight errors.

Checks:

- Confirm frontend staging domain is included in the intended CORS allowlist.
- Confirm the backend deployment reads and applies CORS configuration.
- Confirm `Authorization`, `Content-Type`, and `Idempotency-Key` headers are allowed.
- Confirm preflight `OPTIONS` requests are not blocked by the platform.

