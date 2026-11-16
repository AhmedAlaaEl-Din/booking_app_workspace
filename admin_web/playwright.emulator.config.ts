// End-to-end tests of the dashboard against the LOCAL Firebase emulators,
// signed in for real with the seeded demo accounts.
//
//   npm run emulators                       (second terminal)
//   $env:FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080"
//   $env:FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099"
//   npm run test:e2e:emulator
import { defineConfig, devices } from "@playwright/test";

const FIRESTORE = process.env.FIRESTORE_EMULATOR_HOST;
const AUTH = process.env.FIREBASE_AUTH_EMULATOR_HOST;
const local = (h?: string) => !!h && /^(127\.0\.0\.1|localhost):\d+$/.test(h);
if (!local(FIRESTORE) || !local(AUTH)) {
  throw new Error(
    "Refusing to run: set FIRESTORE_EMULATOR_HOST and FIREBASE_AUTH_EMULATOR_HOST to the local emulators.",
  );
}

const PORT = 3200;
const PROJECT_ID = process.env.SEED_PROJECT_ID ?? "demo-booking";

export default defineConfig({
  testDir: "./tests/emulator",
  outputDir: "./evidence/emulator-results",
  timeout: 90_000,
  workers: 1, // One shared emulator: tests reseed it, so run them in order.
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: `http://localhost:${PORT}`,
    locale: "en-GB",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `npx next dev --port ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: false,
    timeout: 180_000,
    // Fake config + the local emulators. Overrides .env.local.
    env: {
      NEXT_DIST_DIR: ".next-emulator",
      NEXT_PUBLIC_FIREBASE_API_KEY: "demo-api-key",
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: `${PROJECT_ID}.firebaseapp.com`,
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: PROJECT_ID,
      NEXT_PUBLIC_FIREBASE_APP_ID: "1:000000000000:web:demo",
      NEXT_PUBLIC_AUTH_EMULATOR_URL: `http://${AUTH}`,
      NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST: FIRESTORE!,
    },
  },
});
