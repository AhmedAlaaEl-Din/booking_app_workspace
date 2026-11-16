# Phase 4 log

## Summary

**Done**
- Emulator-only setup: rules in CLAUDE.md, `firebase deploy`/delete commands
  denied, emulator ports in `firebase.json`, Glow Salon seed script with
  safety checks. The emulators are still running.
- 22 security rules tests: 22/22 on `firestore.rules` and on
  `firestore.rules.proposed`. Three gaps were found and fixed **in the
  proposal only** (`docs/phase4-security.md`).
- Dashboard: lint clean, `tsc` 0 errors, unit tests 39/39, smoke 6/6, and 4/4
  new end-to-end tests signed in on the emulator.
- App: fixed a real double-tap bug (the booking was saved twice), plus guards
  on every navigation and action button, a debug-only emulator switch, and 9 new
  widget tests. `flutter analyze` finds no issues; `flutter test` passes 53/53.
- Dashboard video recorded on the emulator and edited: 8 long pauses
  shortened, plus a 2.5 s title card and end card (45.6 s).
- README rewritten for clients; old setup guide moved to `docs/setup.md`.
  New `docs/phase4-explained.md`.
- Secrets scan: no keys, credentials or real emails in tracked files.

**Blocked**
- Phone recording and screenshots (C8–C10): the phone shows as
  **unauthorized** for USB debugging. The prompt must be accepted on the phone.
- OCR privacy scan: **tesseract isn't installed**. NOT SCANNED, needs manual
  review. As a stand-in, I looked at 15 frames of the edited video myself (see
  D13).
- MP4 output: the only ffmpeg available (Playwright's) writes WebM/VP9 only.
  YouTube accepts WebM.

**Needs you** (`docs/phase4-needs-me.md`)
1. Delete the leftover `9b8fea` E2E data in the live project (listed there; not touched).
2. Review and deploy `firestore.rules.proposed`.
3. Accept USB debugging on the phone, then record the customer app (commands are there).
4. Decide whether to remove the real project ID from `firebase.json`.

**Where things are**
- Edited dashboard video: `demo_videos/admin-dashboard-demo-edited.webm` (git-ignored)
- Raw recording: `admin_web/evidence/demo/admin-dashboard-demo.webm` (git-ignored)
- Phone screenshots: none (phone unauthorized)

**Risks noticed**
- The proposed 30-minute start-time rule assumes whole half-hour UTC offsets
  (not true for Nepal or the Chatham Islands).
- The debug app talks to the emulators under the **real** project ID string
  (decision 4). It's safe, because every request goes to 127.0.0.1, but the
  seed for the phone must use `SEED_PROJECT_ID`.
- In emulator mode the app signs out at startup, so the phone's saved
  real-account login is cleared after a demo run.
- The commit message of `2e7ca38` overstates the bug as "created two
  bookings". The log and docs give the accurate description.
- Nothing is pushed. Branch `phase4-polish` is local only.

## Task list

- [x] A1 CLAUDE.md emulator-only rules, `.claude/settings.json` deny list
- [x] A2 Emulator config in `firebase.json`, `admin_web/scripts/seed-emulator.ts`
- [x] A3 Emulators running in the background
- [x] B4 Rules unit tests (`@firebase/rules-unit-testing`)
- [x] B5 Admin dashboard states, lint, typecheck, unit tests, Playwright on the emulator
- [x] B6 Flutter: states, double-tap guards, booking-flow widget tests, analyze, test
- [ ] C7–C10 Device run, phone recording, screenshots: **blocked** (phone unauthorized)
- [x] C11–C12 Dashboard recording on the emulator, edited with title and end cards
- [x] D13 Privacy check: OCR **NOT SCANNED** (no tesseract); 15 frames checked by eye
- [x] D14 README rewrite, `docs/phase4-explained.md`
- [x] D15 Secrets scan

## Progress

| Time (local) | Finished |
| ------------ | -------- |
| 2026-11-16 10:48 | A1: branch `phase4-polish`, emulator-only rules in CLAUDE.md, firebase deploy/delete commands denied in `.claude/settings.json` |
| 2026-11-16 10:49 | A2/A3: emulator ports in `firebase.json`, `admin_web/scripts/seed-emulator.ts` (5 services, admin Mona, 8 customers, 12 bookings; refuses to run without loopback emulator hosts, tested). Emulators running (Auth 9099, Firestore 8080). |
| 2026-11-16 10:52 | B4: 22 rules tests (`npm run test:rules`, `test:rules:proposed`) on the emulator. 22/22 pass on both files. 3 gaps found and fixed in `firestore.rules.proposed`. See `docs/phase4-security.md`. |
| 2026-11-16 10:54 | B5: dashboard already had loading/empty/error views and the 'Access denied… not an admin' message. Added 4 Playwright tests on the emulator (non-admin message, wrong password, admin cancel frees the slot + service edit + sign out, empty states). Lint clean, `tsc --noEmit` 0 errors, unit 39/39, smoke 6/6, emulator e2e 4/4. |
| 2026-11-16 10:59 | B6: fixed a real double-tap bug: two taps in one frame ran the save **twice**. On real Firestore the slot lock turns the second save into a confusing "slot taken" error right after a successful booking; in the test fake it makes 2 bookings. Proven by a test that fails without the fix. (Correction: an earlier commit message says "created two bookings", which is only true without the slot lock.). Guards on the service card, Continue, Confirm, Cancel dialog, and login/register. Debug-only `USE_EMULATOR` switch in `main.dart`. 9 new widget tests (booking flow, slot taken, taken times, loading/empty/error, 360×640 at text scale 1.3 in light + dark). `flutter analyze`: no issues. `flutter test`: 53/53. |
| 2026-11-16 11:00 | C7: phone `58K6R19924012174` is **unauthorized** (USB debugging prompt not accepted). Tried 3 times. Skipped C8–C10, see `phase4-needs-me.md` §3. Continuing with C11/C12 (dashboard video). |
| 2026-11-16 11:01 | C11: `npm run demo:video`. The existing Playwright demo runs on its own emulator ports with made-up data and covers login, overview, bookings filter, cancel, service edit, deactivate and sign out. 46.6 s raw. |
| 2026-11-16 11:16 | C12: edited to `demo_videos/admin-dashboard-demo-edited.webm` (45.6 s, 1280×720 VP9). 8 still stretches over 1.8 s cut to 1.8 s (found by comparing frames); 2.5 s title and end cards. Built with Playwright's ffmpeg (WebM only) and Chromium for the cards. |
| 2026-11-16 11:20 | D14: README rewritten for clients (features, mermaid diagram, stack, security, emulator quick start, video and screenshot placeholders, no real IDs or emails). Old README moved to `docs/setup.md`. Added `docs/phase4-explained.md`. |
| 2026-11-16 11:25 | D13: see below. |

### D13 Privacy check

**OCR: NOT SCANNED, needs manual review.** `tesseract` isn't installed, and
installing it means downloading software, which this unattended run didn't do.

Manual stand-in: I looked at 15 frames of
`demo_videos/admin-dashboard-demo-edited.webm`: one every 4 s, plus the title
card at 1.5 s and the end card at 44.5 s. They show the login, overview,
bookings, the filter, the cancel dialog, the cancelled filter, the services
page, the edit dialog and deactivate. Only demo data is visible
(`mona@glow-salon.example`, customers `@example.com`, "Glow Salon"). There's
no browser address bar, no OS notifications, no Wi-Fi names, no gmail/yahoo
addresses, no API keys, no Firebase console and no real names. The raw
recording has the same content without the cards. There are no phone videos
or screenshots to check.

### D15 Secrets scan (tracked files, 134)

| Check | Result |
| ----- | ------ |
| Credential files tracked (`.env*`, `google-services.json`, `firebase_options.dart`, `key.properties`, keystores, service accounts, `.pem`/`.p12`) | Only the templates `admin_web/.env.example` and `.env.e2e.example`, which have **0 filled-in values** |
| `AIza…` API keys, `private_key`, PEM private keys, `apiKey: "…"` with a value | **None** |
| Emails outside example domains | **None** (one placeholder `something@something.something` in a code comment) |
| Your name, gmail/hotmail/yahoo, Valeo | **None** |
| Real Firebase project ID and Android app ID | **Found in `firebase.json`** (the `flutter` block written by `flutterfire configure`). These are public identifiers, not secrets, and they're also in git history. See `phase4-needs-me.md` §4. |
