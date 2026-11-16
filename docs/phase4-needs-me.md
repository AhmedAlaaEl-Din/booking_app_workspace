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

## 3. Phone recording (Phase C, steps 7–10): skipped, the phone isn't authorized

`adb devices` shows the Huawei (`58K6R19924012174`) as **unauthorized**. The
"Allow USB debugging?" prompt has to be accepted on the phone itself. I
restarted adb three times; it stayed unauthorized. So there's no customer-app
recording and no phone screenshots.

The app is ready for it. When you're back:

1. Unlock the phone and accept **Allow USB debugging** (tick "Always allow").
2. Start the emulators and seed the namespace the app uses. The debug app keeps
   its own project ID (see decision 4), so pass it to the seed script:
   ```
   cd admin_web
   npm run emulators                                  # terminal 1
   $env:FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080"    # terminal 2
   $env:FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099"
   $env:SEED_PROJECT_ID = "<your-firebase-project-id>"
   npm run seed:emulator
   ```
3. Connect the phone to the emulators and run the debug app on them:
   ```
   adb shell svc power stayon usb
   adb reverse tcp:8080 tcp:8080
   adb reverse tcp:9099 tcp:9099
   flutter run -d 58K6R19924012174 --debug --dart-define=USE_EMULATOR=true
   ```
   The log line `Using the Firebase emulators on 127.0.0.1 (debug only).`
   confirms it. Demo login: `lina.youssef@example.com` / `demo-only-password`
   (emulator only).
4. Before recording, check the status bar: no notifications, Wi-Fi name or
   real account. Then record:
   `scrcpy --no-audio --show-touches --max-size 1280 --time-limit 60 --record demo_videos/raw/customer.mp4`
