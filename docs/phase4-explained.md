# Phase 4 explained: hardening, testing and demos

Phase 4 added no new features. It made the project safer to work on, proved
the security with tests, fixed a real bug, and prepared demos. This page
explains each part in plain English, the way you could in an interview.

## 1. A safe playground: the Firebase Emulator Suite

**Problem:** testing against the real Firebase project is risky. One wrong
script could change or delete real customer data.

**What we did:** all development, tests and demos now run on the **Firebase
Emulator Suite**, a local copy of Firebase Auth and Firestore that runs on
your computer (ports 9099 and 8080).

- The emulators use the project ID `demo-booking`. Firebase treats any
  `demo-` project as fake and refuses to contact the real servers.
- The seed script (`admin_web/scripts/seed-emulator.ts`) fills the emulator
  with a made-up "Glow Salon": 5 services, an admin, 8 customers and 12
  bookings. Dates are relative to today, so the demo always looks current.
- **Guard rails:** the seed script, the rules tests and the end-to-end tests
  **refuse to run** unless `FIRESTORE_EMULATOR_HOST` and
  `FIREBASE_AUTH_EMULATOR_HOST` point at this computer. A typo like
  `firestore.googleapis.com` is rejected (tested).
- The Flutter app has a **debug-only switch**:
  `--dart-define=USE_EMULATOR=true`. It's combined with Flutter's `kDebugMode`,
  so a release build can never accidentally point at the emulator, or the other
  way round.

> Interview line: "I treat production data as untouchable. Everything that
> writes data runs against the emulator, and the scripts check that before
> they do anything."

## 2. Proving the security rules with tests

Firestore security rules are the backend in this project. There is no server,
so the rules decide who can read and write what. Phase 4 adds **22 automated
rules tests** (`admin_web/tests/rules/`) using Google's
`@firebase/rules-unit-testing` library. They check, for example:

- A guest can't read or write anything.
- A customer can't read another customer's booking, can't make themselves
  admin, can't edit services, and can't cancel someone else's booking.
- A customer can't double-book a taken time, or cancel without freeing the slot.
- An admin can see all bookings, cancel any of them (and must free the slot in
  the same write), and edit services, but only with valid data.

Writing the tests revealed **three gaps**, for example "a customer could book
60 days ahead even though the app only offers 14". The fixes are in
`firestore.rules.proposed`, *not* in the live rules. The same tests run
against both files: the "hardening" tests show each gap is open in the current
rules and closed in the proposal. Deploying is a human decision
([phase4-security.md](phase4-security.md)).

> Interview line: "Tests didn't just confirm the rules, they found holes in
> them. I proposed the fixes with tests rather than changing production rules
> directly."

## 3. A real bug: the double tap

**The bug:** "Confirm booking" shows a spinner and disables itself while
saving. But Flutter only redraws the button on the **next frame**. Two very
fast taps (in the same frame) both reached the save code, so the booking was
**saved twice**. On the real database, the slot lock stops the second save, and
the customer saw a confusing "that time was just booked by someone else" error
right after their own booking succeeded. Without the slot lock (as in the test
fake), it would have been two bookings.

**The fix:** each action now checks a "busy" flag at the very start:
`if (_isSaving) return;`. The same guard was added to opening a service,
"Continue", the cancel dialog, and login/register.

**How we know:** a widget test taps twice in the same frame and checks only
the save runs only once. Removing the guard makes the test fail (*2 saves
instead of 1*), so the test really guards the fix.

> Interview line: "A disabled button isn't enough; the state change happens a
> frame later. Guard the handler, and write a test that fails without the fix."

## 4. Widget tests for the whole booking flow

`test/features/bookings/booking_flow_test.dart` runs the real screens with
**fake** repositories (in-memory, no Firebase):

- Book a slot → see it in My bookings → cancel it (with double-tap checks)
- "That time was just booked by someone else" message
- Taken times are disabled
- Loading, empty and error states, with **no raw error text** shown to users
- A small phone (360×640) at **text scale 1.3**, in **light and dark** mode:
  every screen lays out without overflow

Result: `flutter analyze` finds no issues; `flutter test` passes 53 of 53.

## 5. The dashboard, tested in a real browser

Playwright now signs in to the dashboard on the emulator with the demo
accounts (`admin_web/tests/emulator/`):

- A customer account sees a clear "Access denied… not an admin" message
- A wrong password shows a friendly message, not a Firebase code
- The admin filters bookings, cancels one, and the test then checks in
  Firestore that the booking is `cancelled` **and its slot is free again**
- Editing a service price is saved; signing out works
- Empty states when there is no data

Together with lint, type checking (`tsc --noEmit`), 39 unit tests and 6 smoke
tests, everything is green.

## 6. Demo videos and privacy

- The dashboard demo is recorded by a Playwright script on emulator data, with
  a visible cursor and calm pauses. Long still stretches are shortened
  automatically (by comparing frames), and a title card and end card are added.
- Videos are stored in `demo_videos/` and `admin_web/evidence/`, which git
  ignores, so they never end up in the repository.
- A secrets scan over every tracked file found no API keys, private keys, real
  emails or credential files.

## Words worth knowing

| Term | Meaning |
| ---- | ------- |
| Emulator Suite | Local fake Firebase for safe development and tests |
| Security rules | Firestore's server-side "who can do what" checks |
| Rules unit test | A test that tries a read or write as a given user and expects allow or deny |
| Widget test | A Flutter test that builds screens in memory and taps them, without a phone |
| Fake repository | An in-memory stand-in for the database code, used in tests |
| Double-tap guard | A busy flag that makes a second tap do nothing while the first is running |
| `kDebugMode` | A Flutter constant that is `false` in release builds; code behind it is removed |
