# EasySplit Backend Staging Deployment Runbook

## 1. Staging Architecture

Staging should mirror production behavior as closely as possible while remaining isolated from production data.

- Backend host: deploy the Express backend as a Node.js service on Render, Railway, Fly.io, AWS, GCP, Azure, or an internal VM/container host.
- Firebase Auth: clients authenticate with Firebase Authentication. The backend verifies Firebase ID tokens with Firebase Admin SDK.
- Cloud Firestore: Firestore is the source of truth for users, groups, expenses, balances, settlements, subscriptions, reminders, audit logs, and idempotency keys.

## 2. Environment Variables

```bash
NODE_ENV=staging
DEV_AUTH_ENABLED=false
PORT=8080
FIREBASE_FIRESTORE_DATABASE_ID="(default)"
```

Provide exactly one Firebase Admin credential strategy:

```bash
FIREBASE_PROJECT_ID="your-staging-firebase-project-id"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-...@your-project.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Alternatives:

```bash
FIREBASE_SERVICE_ACCOUNT_JSON='{"project_id":"..."}'
FIREBASE_SERVICE_ACCOUNT_BASE64="base64-encoded-service-account-json"
GOOGLE_APPLICATION_CREDENTIALS="/secure/runtime/path/service-account.json"
```

Optional config:

```bash
IDEMPOTENCY_WINDOW_HOURS=24
IDEMPOTENCY_PROCESSING_TIMEOUT_SECONDS=30
FREE_MAX_GROUPS=3
FREE_SMART_SETTLE_PER_MONTH=3
FREE_HISTORY_DAYS=90
CORS_ORIGIN="https://staging-web.example.com"
JWT_SECRET="staging-only-random-secret"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_EXPIRES_IN="30d"
```

## 3. Firebase Setup

1. Create a dedicated Firebase project for staging.
2. Enable Authentication providers used by the app.
3. Enable Cloud Firestore in the Firebase project.
4. Create a Firebase Admin service account for the backend.
5. Store credentials only in the deployment platform secret manager.
6. Never commit service account JSON, private keys, or generated `.env` files.

## 4. Deployment Steps

From the backend directory:

```bash
cd backend
npm install
npm run build
npm run start
```

Recommended deployment order:

1. Configure environment variables and secrets.
2. Install dependencies.
3. Build TypeScript.
4. Start the service.
5. Run smoke tests.

## 5. Smoke Tests

```bash
BASE_URL="https://staging-api.example.com/api/v1"
curl "$BASE_URL/health"
curl "$BASE_URL/ready"
```

Expected ready response:

```json
{
  "status": "ok",
  "checks": {
    "database": "firestore",
    "firestore": "ok"
  },
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
  -d '{"name":"Staging Trip","category":"trip"}'
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
    "currency":"VND",
    "paidByUserId":"USER_ID",
    "splitMode":"equal",
    "participants":[
      {"userId":"USER_ID","value":0},
      {"userId":"MEMBER_USER_ID","value":0}
    ]
  }'
```

Retry the same request with the same `Idempotency-Key` and body. Expected result: same stored response body and status code, without creating a duplicate expense.

## 6. Rollback Plan

1. Revert the backend deployment to the previous known-good build.
2. Keep the staging Firebase project online unless there is a confirmed data integrity incident.
3. Preserve backend logs and relevant Firestore documents before redeploying.
4. Re-run smoke tests after rollback.

For financial flow incidents, inspect Firestore collections:

- `audit_logs`
- `idempotency_keys`
- `expenses`
- `settlements`
- `balances`
- `group_members`

## 7. Troubleshooting

### Firebase Token Invalid

- Confirm the client sends `Authorization: Bearer <firebase_id_token>`.
- Confirm the token is from the staging Firebase project.
- Confirm Firebase Admin credentials are for the same Firebase project.
- Confirm the selected Authentication provider is enabled.
- Confirm the service account private key is formatted correctly.

### Firestore Connection Fails

- `/api/v1/ready` fails.
- Confirm Cloud Firestore is enabled.
- Confirm service account credentials have Firestore access.
- Confirm `FIREBASE_FIRESTORE_DATABASE_ID` is `(default)` unless you use a named database.
- Confirm the deployment platform can reach Google APIs.

### DEV_AUTH_ENABLED Accidentally True

- Startup fails if `NODE_ENV=production`.
- Set `DEV_AUTH_ENABLED=false` in staging.
- Keep `NODE_ENV=staging`.
- Do not enable `X-User-Id` auth outside local development/test.
