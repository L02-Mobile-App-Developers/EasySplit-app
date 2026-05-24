import admin from "firebase-admin";
import { Firestore, getFirestore } from "firebase-admin/firestore";
import { config } from "../config";

function parseServiceAccount(): admin.ServiceAccount | undefined {
  try {
    if (config.firebase.serviceAccountBase64) {
      return JSON.parse(
        Buffer.from(config.firebase.serviceAccountBase64, "base64").toString("utf8"),
      ) as admin.ServiceAccount;
    }

    if (config.firebase.serviceAccountJson) {
      return JSON.parse(config.firebase.serviceAccountJson) as admin.ServiceAccount;
    }

    if (
      config.firebase.projectId &&
      config.firebase.clientEmail &&
      config.firebase.privateKey
    ) {
      return {
        projectId: config.firebase.projectId,
        clientEmail: config.firebase.clientEmail,
        privateKey: config.firebase.privateKey,
      };
    }
  } catch (error) {
    throw new Error(
      `Invalid Firebase service account configuration: ${
        error instanceof Error ? error.message : "unknown parse error"
      }`,
    );
  }

  return undefined;
}

export function initializeFirebaseAdmin(): admin.app.App {
  if (admin.apps.length === 0) {
    const serviceAccount = parseServiceAccount();

    return admin.initializeApp(
      serviceAccount
        ? { credential: admin.credential.cert(serviceAccount) }
        : { credential: admin.credential.applicationDefault() },
    );
  }

  const app = admin.apps[0];
  if (!app) {
    throw new Error("Firebase Admin failed to initialize");
  }

  return app;
}

export function getFirebaseAdminAuth(): admin.auth.Auth {
  return admin.auth(initializeFirebaseAdmin());
}

export function getFirestoreDb(): Firestore {
  const app = initializeFirebaseAdmin();

  if (
    config.firebase.firestoreDatabaseId &&
    config.firebase.firestoreDatabaseId !== "(default)"
  ) {
    return getFirestore(app, config.firebase.firestoreDatabaseId);
  }

  return getFirestore(app);
}

export async function checkFirestoreConnection(): Promise<void> {
  await getFirestoreDb().doc("_health/backend").get();
}

export async function verifyFirebaseIdToken(token: string) {
  return getFirebaseAdminAuth().verifyIdToken(token);
}
