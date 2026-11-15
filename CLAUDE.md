# CLAUDE.md

## Project
- Flutter + Firebase (Auth, Firestore) booking app, Android only.
- Test device: Huawei phone running Android 8.1, connected over USB (`adb devices` / `flutter devices`).

## Definition of done
Before saying a task is "done":
1. Run `flutter analyze`. Report the issue count.
2. Run `flutter test`. Report pass/fail counts.
3. If `integration_test/` exists, run the integration tests on the phone
   (`flutter test integration_test -d <device-id>`). Report pass/fail counts.
4. If anything fails, say so plainly with the relevant output. Do not call it done.

## Evidence
- Screenshots: `adb exec-out screencap -p > evidence/<YYYY-MM-DD>/<name>.png`.
  Open and look at every screenshot you save; describe what it shows.
- Screen recordings: `scrcpy --record evidence/<YYYY-MM-DD>/<name>.mp4 --no-audio --time-limit 60`.
  Video only (Android 8.1 has no audio capture). Max 60 seconds per recording.

## Git
- Create a new branch for each task (`git switch -c <type>/<short-name>`) before changing code.
- Never push, merge, or force-push without asking me first.

## Secrets
- Never read, print, or commit secrets: `.env`, `key.properties`, keystores
  (`*.jks`, `*.keystore`), service-account JSON files, or similar credentials.
- If a task seems to need one, stop and ask me.

## Firebase
- Never deploy Firebase rules, indexes, or functions.
- Prepare the changes (e.g. edit `firestore.rules`), explain them, and ask me to deploy.

## Demo recordings and screenshots
- Use demo accounts and fake data only.
- No real names, emails, notifications, or Wi-Fi names visible on screen.
  Check the status bar and notification shade before recording.

## When stuck
- After 3 failed attempts on the same error, stop and ask me. Summarize what was tried.
