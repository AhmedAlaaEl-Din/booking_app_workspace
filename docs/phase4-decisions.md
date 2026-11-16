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
