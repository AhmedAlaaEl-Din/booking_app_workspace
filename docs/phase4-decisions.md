# Phase 4: decisions made during the unattended run

Each decision was made without being able to ask. The safest reasonable option
was chosen.

| # | Decision | Reason |
| - | -------- | ------ |
| 1 | The earlier request to delete the leftover `9b8fea` E2E data from the live Firebase project was **not** carried out. It is listed in `phase4-needs-me.md`. | Phase 4 forbids any write to live Firebase, and that deletion was never confirmed. |
| 2 | Branch `phase4-polish` was created from `feature/portfolio-demo` (which includes the README video link commit `ec7602f`). | That is where the latest work was. Nothing is pushed or merged. |
| 3 | The emulators run with project ID `demo-booking`. Firebase refuses to contact production for any `demo-` project. | This prevents accidental live access. |
| 4 | The emulators run with `singleProjectMode: false`. | On Android, the Flutter app's default Firebase app is created natively from `google-services.json`, so its project ID can't be swapped for `demo-booking` without a "duplicate app" error. In debug emulator mode the app therefore talks to the local emulators under its own project ID. The seed script can fill that namespace with `SEED_PROJECT_ID`. Every request still goes only to 127.0.0.1. |
| 5 | `npm run emulators` (in `admin_web/`) starts the emulators. | `firebase` commands stay under "ask" in `.claude/settings.json`. The npm script only runs `firebase emulators:start` for the `demo-booking` project. |
| 6 | The seed script also accepts `localhost` and `[::1]`, but only loopback hosts. | A typo like `firestore.googleapis.com` is refused (tested). |
| 7 | In emulator mode the app turns off the Firestore offline cache and signs out at startup. | A session or cached data from the real project on the phone must never show up in a demo, and must never be mixed with emulator data. It only affects the local session on the phone, not Firebase. |
| 8 | Double-tap guards are flags in each handler, not a shared widget. | They're small and easy to read, and each one is covered by a widget test. |
| 9 | The app connects to the emulators with `automaticHostMapping: false`. | Found on the phone: FlutterFire silently rewrites `127.0.0.1` to `10.0.2.2` on Android. That address only exists inside the Android *emulator*, so on a real phone every sign-in timed out after 10 s. With `adb reverse`, `127.0.0.1` is correct. |
| 10 | The seed script always creates Auth accounts in `demo-booking`; `SEED_PROJECT_ID` now only picks the Firestore namespace. | Found on the phone: the Android Auth SDK (like the web SDK) signs in without naming a project, so the Auth emulator uses its default project, `demo-booking`. Firestore uses the app's own ID (decision 4). Before the fix the UIDs didn't match: the profile name showed "—" and bookings were filed under the wrong UID. Passing `demo-booking` from Dart doesn't work, because Android ignores those options (tried). |
| 11 | The customer video is the raw scrcpy MP4, not trimmed or given title cards. | The flow was driven by a script with short, even pauses, so there's nothing long to cut. The only ffmpeg here can't decode H.264. |
