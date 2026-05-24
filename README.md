<p align="center">
  <img src="frontend/assets/images/logo-removebg.png" width="80"/>
</p>

<h1 align="center">EasySplit App</h1>

<p align="center">
  Simple expense splitting app built with React Native & Expo
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React%20Native-0.81x-blue?logo=react" />
  <img src="https://img.shields.io/badge/Expo-SDK%2054-black?logo=expo" />
  <img src="https://img.shields.io/github/actions/workflow/status/L02-Mobile-App-Developers/EasySplit-app/frontend-test.yml?label=Frontend%20CI" />
</p>

## Backend Auth

Production and staging API authentication uses Firebase Authentication. Clients sign in with Firebase, including Google Sign-In, then call protected backend endpoints with:

```http
Authorization: Bearer <firebase_id_token>
```

The Express backend verifies the Firebase ID token with Firebase Admin SDK, syncs the Firebase user into Cloud Firestore, and stores groups, expenses, balances, settlements, entitlements, idempotency keys, reminders, and audit logs in Firestore.

Local JWT endpoints and `X-User-Id` dev auth are development/test conveniences only. `DEV_AUTH_ENABLED=true` is rejected at startup when `NODE_ENV=production`.

### Backend Database + Firebase Setup

1. Create a Firebase project in Firebase Console, then enable Authentication providers you need, such as Email/Password or Google.
2. Enable Cloud Firestore. The backend now uses Firestore as the primary app database.
3. In Firebase Console, open Project settings > Service accounts > Generate new private key.
4. Copy `backend/.env.example` to `backend/.env`.
5. Add Firebase Admin credentials using one of these options:
   - `GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\service-account.json`
   - `FIREBASE_SERVICE_ACCOUNT_JSON='{"project_id":"..."}'`
   - `FIREBASE_SERVICE_ACCOUNT_BASE64="<base64-service-account-json>"`
   - `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY`
6. Leave `FIREBASE_FIRESTORE_DATABASE_ID="(default)"` unless you use a named Firestore database.
7. From `backend/`, run `npm install`, then `npm run dev`.
8. Client apps should sign in with Firebase and call protected backend APIs with `Authorization: Bearer <firebase_id_token>`.

## API Documentation

- OpenAPI: [docs/openapi.yaml](docs/openapi.yaml)
- Postman collection: [postman/easysplit.postman_collection.json](postman/easysplit.postman_collection.json)

To use the Postman collection, import the JSON file and set collection variables:

- `baseUrl`: for example `http://localhost:8080/api/v1`
- `firebaseIdToken`: Firebase Authentication ID token from the client
- `groupId`, `userId`, `memberUserId`, `payerUserId`, and resource ids as you create data
- `idempotencyKey`: a unique value for financial POST requests

Financial POST endpoints require `Idempotency-Key`: create expense, create settlement, and group settlement commit.
