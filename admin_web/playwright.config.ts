// Browser smoke tests. They need NO real Firebase account: the dev server is
// started with fake Firebase values, and no test ever signs in.
import { defineConfig, devices } from "@playwright/test";

const PORT = 3100; // Not 3000, so it never reuses your own `npm run dev`.

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./evidence/test-results", // Videos of failed tests land here.
  timeout: 60_000,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    screenshot: "on", // A screenshot at the end of every test.
    video: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx next dev --port ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: false,
    timeout: 180_000,
    // Values from the environment win over .env.local, so your real config
    // is never used by the tests.
    env: {
      NEXT_PUBLIC_FIREBASE_API_KEY: "fake-api-key-for-tests",
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "demo-test.firebaseapp.com",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-test",
      NEXT_PUBLIC_FIREBASE_APP_ID: "1:000000000000:web:0000000000000000",
    },
  },
});
