# Phase 4 log

## Summary

_(Written at the end of the run.)_

## Task list

- [x] A1 CLAUDE.md emulator-only rules, `.claude/settings.json` deny list
- [x] A2 Emulator config in `firebase.json`, `admin_web/scripts/seed-emulator.ts`
- [x] A3 Emulators running in the background
- [x] B4 Rules unit tests (`@firebase/rules-unit-testing`)
- [x] B5 Admin dashboard states, lint, typecheck, unit tests, Playwright on the emulator
- [x] B6 Flutter: states, double-tap guards, booking-flow widget tests, analyze, test
- [ ] C7–C12 Device run, recordings, screenshots, video edit
- [ ] D13 Privacy check (OCR)
- [ ] D14 README rewrite, `docs/phase4-explained.md`
- [x] D15 Secrets scan

## Progress

| Time (local) | Finished |
| ------------ | -------- |
| 2026-11-16 10:48 | A1: branch `phase4-polish`, emulator-only rules in CLAUDE.md, firebase deploy/delete commands denied in `.claude/settings.json` |
| 2026-11-16 10:49 | A2/A3: emulator ports in `firebase.json`, `admin_web/scripts/seed-emulator.ts` (5 services, admin Mona, 8 customers, 12 bookings; refuses to run without loopback emulator hosts, tested). Emulators running (Auth 9099, Firestore 8080). |
| 2026-11-16 10:52 | B4: 22 rules tests (`npm run test:rules`, `test:rules:proposed`) on the emulator. 22/22 pass on both files. 3 gaps found and fixed in `firestore.rules.proposed`. See `docs/phase4-security.md`. |
| 2026-11-16 10:54 | B5: dashboard already had loading/empty/error views and the 'Access denied… not an admin' message. Added 4 Playwright tests on the emulator (non-admin message, wrong password, admin cancel frees the slot + service edit + sign out, empty states). Lint clean, `tsc --noEmit` 0 errors, unit 39/39, smoke 6/6, emulator e2e 4/4. |
| 2026-11-16 10:59 | B6: fixed a real double-tap bug (two taps in one frame created **two bookings**; proven by a test that fails without the fix). Guards on the service card, Continue, Confirm, Cancel dialog, and login/register. Debug-only `USE_EMULATOR` switch in `main.dart`. 9 new widget tests (booking flow, slot taken, taken times, loading/empty/error, 360×640 at text scale 1.3 in light + dark). `flutter analyze`: no issues. `flutter test`: 53/53. |
| 2026-11-16 11:00 | C7: phone `58K6R19924012174` is **unauthorized** (USB debugging prompt not accepted). Tried 3 times. Skipped C8–C10, see `phase4-needs-me.md` §3. Continuing with C11/C12 (dashboard video). |

### D15 Secrets scan (tracked files, 134)

| Check | Result |
| ----- | ------ |
| Credential files tracked (`.env*`, `google-services.json`, `firebase_options.dart`, `key.properties`, keystores, service accounts, `.pem`/`.p12`) | Only the templates `admin_web/.env.example` and `.env.e2e.example`, which have **0 filled-in values** |
| `AIza…` API keys, `private_key`, PEM private keys, `apiKey: "…"` with a value | **None** |
| Emails outside example domains | **None** (one placeholder `something@something.something` in a code comment) |
| Your name, gmail/hotmail/yahoo, Valeo | **None** |
| Real Firebase project ID and Android app ID | **Found in `firebase.json`** (the `flutter` block written by `flutterfire configure`). These are public identifiers, not secrets, and they're also in git history. See `phase4-needs-me.md` §4. |
