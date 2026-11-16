// Portfolio demo video, recorded against LOCAL Firebase emulators with
// made-up data. Never touches the real Firebase project.
// Run with: npm run demo:video   (see demo/README.md)
import { existsSync } from "node:fs";
import path from "node:path";

import { defineConfig, devices } from "@playwright/test";

import { AUTH_URL, FIRESTORE_HOST, PROJECT_ID } from "./seed";

const ROOT = path.resolve(__dirname, "..");
const PORT = 3300;

// The Firestore emulator needs Java. Use JAVA_HOME if set, otherwise the Java
// that ships with Android Studio.
const javaHome =
  process.env.JAVA_HOME ?? "C:\\Program Files\\Android\\Android Studio\\jbr";
if (existsSync(path.join(javaHome, "bin"))) {
  process.env.PATH = `${path.join(javaHome, "bin")}${path.delimiter}${process.env.PATH}`;
}

export default defineConfig({
  testDir: ".",
  testMatch: "*.demo.ts",
  outputDir: path.join(ROOT, "evidence", "demo-results"),
  timeout: 240_000,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: `http://localhost:${PORT}`,
    locale: "en-GB",
    colorScheme: "light",
  },
  webServer: [
    {
      command: `firebase emulators:start --only auth,firestore --project ${PROJECT_ID} --config firebase.demo.json`,
      cwd: path.resolve(ROOT, ".."), // Repo root, next to firestore.rules.
      url: `http://${FIRESTORE_HOST}/`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      // A production build: no dev badge or "Compiling..." toast in the video.
      command: `npx next build && npx next start --port ${PORT}`,
      cwd: ROOT,
      url: `http://localhost:${PORT}/login`,
      reuseExistingServer: false,
      timeout: 300_000,
      env: {
        NEXT_DIST_DIR: ".next-demo",
        // Overrides .env.local: fake config + the local emulators.
        NEXT_PUBLIC_FIREBASE_API_KEY: "demo-api-key",
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: `${PROJECT_ID}.firebaseapp.com`,
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: PROJECT_ID,
        NEXT_PUBLIC_FIREBASE_APP_ID: "1:000000000000:web:demo",
        NEXT_PUBLIC_AUTH_EMULATOR_URL: AUTH_URL,
        NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST: FIRESTORE_HOST,
      },
    },
  ],
});
