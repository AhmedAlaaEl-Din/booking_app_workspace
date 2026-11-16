// Connects to Firebase. The config is public (it identifies the project, like
// the Flutter app's firebase_options.dart); the data is protected by Firebase
// Auth and firestore.rules, not by hiding these values.
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from "firebase/firestore";

// Each value must be written out in full: Next.js replaces these exact
// expressions with the values from .env.local when it builds the app.
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** A message if .env.local is missing values, otherwise null. */
export const configError: string | null = Object.values(config).every(Boolean)
  ? null
  : "Firebase is not configured. Fill in admin_web/.env.local (see .env.example) and restart npm run dev.";

// Local Firebase emulators (only for the portfolio demo, see demo/README.md).
// Unset in normal use, so the app talks to the real project.
const authEmulatorUrl = process.env.NEXT_PUBLIC_AUTH_EMULATOR_URL;
const firestoreEmulatorHost = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST;

// Created on first use, in the browser only (not while Next.js builds pages).
function app(): FirebaseApp {
  if (getApps().length > 0) return getApp();
  const created = initializeApp(config);
  if (authEmulatorUrl) {
    connectAuthEmulator(getAuth(created), authEmulatorUrl, { disableWarnings: true });
  }
  if (firestoreEmulatorHost) {
    const [host, port] = firestoreEmulatorHost.split(":");
    connectFirestoreEmulator(getFirestore(created), host, Number(port));
  }
  return created;
}

export function firebaseAuth(): Auth {
  return getAuth(app());
}

export function db(): Firestore {
  return getFirestore(app());
}
