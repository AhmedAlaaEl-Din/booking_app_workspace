// Firestore security rules tests. Needs the local Firestore emulator running
// and FIRESTORE_EMULATOR_HOST set (the tests refuse to run otherwise).
//   npm run test:rules            -> ../firestore.rules
//   npm run test:rules:proposed   -> ../firestore.rules.proposed
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => ({
  test: {
    include: ["tests/rules/**/*.test.ts"],
    environment: "node",
    fileParallelism: false,
    testTimeout: 20_000,
    env: {
      RULES_FILE: mode === "proposed" ? "../firestore.rules.proposed" : "../firestore.rules",
    },
  },
}));
