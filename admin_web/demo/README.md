# Portfolio demo video

`npm run demo:video` records a clean video of the dashboard to
`evidence/demo/admin-dashboard-demo.webm` (1280×720, about 45 seconds).

It runs entirely on your computer, against the **Firebase emulators** (a local
fake Firebase). It never touches the real Firebase project:

- the project ID is `demo-booking`; the emulators refuse to contact real
  Firebase for any `demo-` project
- the dashboard is built with fake config and pointed at `127.0.0.1`
- the data is made up (`seed.ts`): a salon admin "Mona Hassan", customers such
  as "Sara Ahmed", and services such as "Haircut". It's recreated on every run,
  with dates around today.

The emulators use the same `firestore.rules` as the real project, so the video
also shows the rules working.

## What the video shows

1. Sign in as the demo admin
2. Overview: today's counts and appointments
3. Bookings: all bookings, then filter by tomorrow's date and "Confirmed"
4. Cancel Sara Ahmed's haircut, then show it under "Cancelled"
5. Services: change the Haircut price to $175, deactivate Kids haircut
6. Sign out

A teal circle shows the cursor and a ripple shows each click.

## Requirements

- The Firebase CLI (`npm install -g firebase-tools`). No login is needed for
  the emulators.
- Java 21 or newer for the Firestore emulator. If `JAVA_HOME` isn't set, the
  config uses the Java that ships with Android Studio.
- Free ports 3300, 4399, 4599, 8399, 9398 and 9399.

## Files

| File                          | What it is                                             |
| ----------------------------- | ------------------------------------------------------ |
| `portfolio.demo.ts`           | The script: clicks, typing, pauses, cursor, saves video |
| `seed.ts`                     | The made-up data, written to the emulators             |
| `playwright.demo.config.ts`   | Starts the emulators and a production build of the app |
| `../../firebase.demo.json`    | Emulator ports (at the repo root, next to the rules)   |
