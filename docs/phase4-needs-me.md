# Phase 4: things that need you

These were left undone on purpose. Each one needs a real account or a live
deploy, or it failed three times.

## 1. Leftover E2E test data in the live Firebase project

The live test from Phase 3 left this data. It was found read-only on
2026-11-16 and has **not** been deleted.

| What | ID | Details |
| ---- | -- | ------- |
| Auth user | `zy9yE1hDHCbHNUtQo1Ws0wTTqnC3` | demo.admin.9b8fea@example.com |
| Auth user | `sFE6eumvecXYLfHB9vTP5NtTvp83` | demo.customer.9b8fea@example.com |
| Firestore `users/` | the same two UIDs | their profiles |
| Firestore `services/` | `3tzdBMX3u1qpGhQCKkKc` | "E2E test service" (inactive) |
| Firestore `bookings/` | `7RWLmvQpcjNcoLTx7aa0` | E2E test service, 28 Nov 12:30, cancelled (its slot is already gone) |

Delete these in the Firebase console: **Authentication → Users**, and
**Firestore → Data**. Afterwards, `admin_web/.env.e2e.local` points to accounts
that no longer exist. Delete it, or re-run `tests/live/create-demo-accounts.mjs`
before the next `npm run test:live`.

## 2. Review and deploy the proposed Firestore rules

`firestore.rules.proposed` closes three gaps: bookings too far ahead, start
times off the 30-minute grid, and loose profile documents. Details and the
access table are in `docs/phase4-security.md`. Rules tests pass against both
files (22/22 each). Deploying is your call.

## 3. Phone recording: done (2026-11-16, after you authorized USB debugging)

Recorded and checked; see the log (C7–C10). Two bugs in the Phase 4 emulator
switch only showed up on the real phone, and both are fixed (decisions 9–10).
To record again:

1. Start the emulators and seed the namespace the app's Firestore uses. The
   app keeps its own project ID (decision 4), so pass it to the seed script.
   Auth accounts always go to `demo-booking` (decision 10):
   ```
   cd admin_web
   npm run emulators                                  # terminal 1
   $env:FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080"    # terminal 2
   $env:FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099"
   $env:SEED_PROJECT_ID = "<your-firebase-project-id>"
   npm run seed:emulator
   ```
   Re-seed after running the dashboard emulator tests: they reset the
   `demo-booking` accounts, so the UIDs no longer match.
2. Connect the phone to the emulators and run the debug app on them:
   ```
   adb reverse tcp:8080 tcp:8080
   adb reverse tcp:9099 tcp:9099
   flutter run -d 58K6R19924012174 --debug --dart-define=USE_EMULATOR=true
   ```
   The log line `Using the Firebase emulators on 127.0.0.1 (debug only).`
   confirms it. Demo login: `lina.youssef@example.com` / `demo-only-password`
   (emulator only).
3. Typing on this phone: its keyboard adds a space after the first "." of a
   typed email and sometimes capitalizes it, even in an email field. Typing by
   hand is fine; with `adb shell input`, check the field before going on.
4. Before recording, check the status bar: no notifications, Wi-Fi name or
   real account. Then record:
   `scrcpy --no-audio --no-window --max-size 1280 --time-limit 55 --record demo_videos/raw/customer-app-demo.mp4`

## 4. Real project ID in `firebase.json`

The scan found the real Firebase project ID and Android app ID in the
`flutter` block of `firebase.json`. `flutterfire configure` wrote them there.
They aren't secrets (they ship inside every app build), but you asked for no
real project IDs in the README, and this file is public too. If you want it
gone, delete the `"flutter": { … }` block. It's only used by
`flutterfire configure` and will come back if you run it again. It's also in
earlier commits, so removing it now doesn't erase it from history. I left the
file as it is.
