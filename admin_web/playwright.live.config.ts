// LIVE end-to-end test against your real Firebase project (opt-in).
// Run with: npm run test:live
//
// Needs .env.local (Firebase config) and .env.e2e.local (demo logins, see
// .env.e2e.example). Both are git-ignored. They are loaded into the test
// process only; their values are never printed, and tracing is off because a
// trace would store what was typed (passwords).
import { defineConfig, devices } from "@playwright/test";

for (const file of [".env.local", ".env.e2e.local"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // Missing file: the test itself reports which values are missing.
  }
}

const PORT = 3200;

export default defineConfig({
  testDir: "./tests/live",
  outputDir: "./evidence/live-results", // The video lands here (git-ignored).
  timeout: 240_000,
  workers: 1,
  retries: 0, // Never retry: each run books and cancels real (demo) data.
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: `http://localhost:${PORT}`,
    locale: "en-GB", // Fixed, so the test can predict how times are shown.
    video: { mode: "on", size: { width: 1280, height: 720 } },
    screenshot: "on",
    trace: "off",
    launchOptions: { slowMo: 300 },
  },
  webServer: {
    // Uses your real .env.local, in its own build folder so it never clashes
    // with your `npm run dev`.
    command: `npx next dev --port ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: { NEXT_DIST_DIR: ".next-live" },
  },
});
