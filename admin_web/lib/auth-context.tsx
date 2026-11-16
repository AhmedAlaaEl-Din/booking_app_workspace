"use client";

// Who is signed in, and are they an admin? Shared with every page through
// React context (like a Provider in the Flutter app).
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { createContext, useContext, useEffect, useState } from "react";

import { configError, db, firebaseAuth } from "./firebase";

/**
 * - "loading": Firebase hasn't said yet who is signed in, or the role check runs
 * - "signedOut": nobody (or a non-admin, who was signed out right away)
 * - "admin": signed in with users/{uid}.role == "admin"
 */
export type AuthStatus = "loading" | "signedOut" | "admin";

type AuthContextValue = {
  status: AuthStatus;
  user: User | null;
  /** Shown on the login page, e.g. "Access denied". */
  notice: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const ACCESS_DENIED =
  "Access denied. This account is not an admin, so it was signed out.";
const ROLE_CHECK_FAILED =
  "Could not check your access. Check your connection and try again.";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(
    configError ? "signedOut" : "loading",
  );
  const [user, setUser] = useState<User | null>(null);
  const [notice, setNotice] = useState<string | null>(configError);

  useEffect(() => {
    if (configError) return; // Nothing to connect to.
    const auth = firebaseAuth();

    // Firebase calls this on page load (with the remembered user, or null)
    // and after every sign-in and sign-out.
    return onAuthStateChanged(auth, async (signedInUser) => {
      if (!signedInUser) {
        setUser(null);
        setStatus("signedOut");
        return;
      }

      setStatus("loading");
      let message = ACCESS_DENIED;
      try {
        // Everyone may read their own profile (firestore.rules), so this
        // works for customers too; they just aren't let in.
        const profile = await getDoc(doc(db(), "users", signedInUser.uid));
        if (auth.currentUser?.uid !== signedInUser.uid) return; // Changed meanwhile.
        if (profile.data()?.role === "admin") {
          setUser(signedInUser);
          setStatus("admin");
          return;
        }
      } catch {
        message = ROLE_CHECK_FAILED;
      }
      // Not an admin: show why, and sign out. Signing out calls this
      // function again with null, which sets "signedOut".
      setNotice(message);
      await firebaseSignOut(auth);
    });
  }, []);

  async function signIn(email: string, password: string) {
    setNotice(null);
    // Throws on a wrong password etc.; the login page shows the error.
    // On success, onAuthStateChanged above runs the role check.
    await signInWithEmailAndPassword(firebaseAuth(), email.trim(), password);
  }

  async function signOut() {
    setNotice(null);
    await firebaseSignOut(firebaseAuth());
  }

  return (
    <AuthContext.Provider value={{ status, user, notice, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

/** Use inside any client component: const { status, user } = useAuth(); */
export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth() must be used inside <AuthProvider>.");
  return value;
}
