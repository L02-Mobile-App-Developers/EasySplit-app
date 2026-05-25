import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { useEffect, useState } from "react";

import { getFirebaseAuth } from "@/lib/firebase";

WebBrowser.maybeCompleteAuthSession();

export function useGoogleSignIn() {
  const [loading, setLoading] = useState(false);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  });

  useEffect(() => {
    if (!response) return;

    async function completeGoogleSignIn() {
      if (response?.type !== "success") {
        if (response?.type === "error") {
          setError(new Error(response.error?.message || "Google sign-in failed"));
        }
        setLoading(false);
        return;
      }

      try {
        const googleIdToken = response.params.id_token;
        if (!googleIdToken) {
          throw new Error("Google did not return an ID token");
        }

        const credential = GoogleAuthProvider.credential(googleIdToken);
        const userCredential = await signInWithCredential(
          getFirebaseAuth(),
          credential,
        );
        const firebaseIdToken = await userCredential.user.getIdToken();

        setIdToken(firebaseIdToken);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Google sign-in failed"));
      } finally {
        setLoading(false);
      }
    }

    completeGoogleSignIn();
  }, [response]);

  async function signIn() {
    setError(null);
    setLoading(true);
    await promptAsync();
  }

  return {
    idToken,
    loading,
    error,
    disabled: !request || loading,
    signIn,
  };
}
