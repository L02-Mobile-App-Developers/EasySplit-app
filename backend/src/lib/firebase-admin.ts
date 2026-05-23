import admin from "firebase-admin";
import { config } from "../config";

let initialized = false;

function parseServiceAccount(): admin.ServiceAccount | undefined {
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

  return undefined;
}

export function getFirebaseAdminAuth(): admin.auth.Auth {
  if (!initialized) {
    const serviceAccount = parseServiceAccount();

    if (admin.apps.length === 0) {
      admin.initializeApp(
        serviceAccount
          ? { credential: admin.credential.cert(serviceAccount) }
          : { credential: admin.credential.applicationDefault() },
      );
    }
    initialized = true;
  }

  return admin.auth();
}

export async function verifyFirebaseIdToken(token: string) {
  return getFirebaseAdminAuth().verifyIdToken(token);
}
