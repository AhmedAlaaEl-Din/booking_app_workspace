# Phase 2 explained

Phase 2 adds services, bookings, and reminders. This document explains how
they work, in plain terms. It builds on [phase1-explained.md](phase1-explained.md).

## 1. What's new in the folder structure

```
lib/
  core/
    constants/booking_constants.dart  Opening hours, slot length, 14-day window, reminder time
    utils/formatters.dart             Dates, times, prices, durations for display
    utils/firebase_error_messages.dart  (moved here from auth/, now shared by all features)
    widgets/state_views.dart          LoadingView, EmptyView, ErrorView
  features/
    home/screens/home_screen.dart     Now the bottom navigation bar (3 tabs)
    services/
      data/service.dart               Service model
      data/services_repository.dart   Reads `services` from Firestore
      screens/services_screen.dart    Tab 1: the list of services
    bookings/
      data/booking.dart               Booking model
      data/booking_repository.dart    Creates, cancels, and lists bookings; reads taken slots
      data/booking_reminders.dart     Local notifications
      utils/slot_calculator.dart      Which days and times can be booked (pure logic)
      screens/choose_time_screen.dart Pick a date, then a time
      screens/confirm_booking_screen.dart  Review and save
      screens/my_bookings_screen.dart Tab 2: upcoming and past bookings
      widgets/booking_card.dart       One booking, with its Cancel button
    profile/screens/profile_screen.dart  Tab 3: name, email, logout
```

The same layering as Phase 1: **screens** never talk to Firebase directly.
They go through a **repository** in `data/`. Repositories are made available
to every screen in `app.dart` with `Provider`, and screens get them with
`context.read<BookingRepository>()`.

## 2. Navigation

`AuthGate` still decides between Login and Home. `HomeScreen` is now a
`Scaffold` with a Material 3 `NavigationBar` and an `IndexedStack` holding
the three tabs. `IndexedStack` is like a `QStackedWidget`: all tabs stay
alive, only one is visible, so switching tabs doesn't reload data.

The booking flow is pushed on top of the tabs with `Navigator.push`:

```
Services tab ──tap a service──▶ ChooseTimeScreen ──Continue──▶ ConfirmBookingScreen
     ▲                                                              │
     └──────────────── popUntil(first route) after saving ◀─────────┘
```

## 3. Days and time slots

All rules live in `core/constants/booking_constants.dart`: open 09:00–17:00,
a slot every 30 minutes, 14 days ahead. `SlotCalculator` turns those into
real dates:

- `bookableDays(now)`: today plus the next 13 days, each at midnight.
- `slotsForDay(day, durationMinutes, now)`: 09:00, 09:30, ... but only times
  where the service **ends by 17:00** (a 90-minute coloring can start at
  15:30 at the latest) and that are **after `now`** (no past times today).

`SlotCalculator` has no Firebase or Flutter code, so it's tested with plain
unit tests (`test/features/bookings/slot_calculator_test.dart`).

**Time zones:** slots are built in the phone's local time (`DateTime(...)`
without `.utc`). Firestore stores a `Timestamp`, which is an exact moment, not
a "wall-clock time". `Timestamp.toDate()` converts it back to local time, so
times always display in the user's time zone.

## 4. Preventing double booking

### The problem

Two customers must not book the same service at the same time. The usual
approach is "query the bookings for that day and grey out the taken times",
but the security rules only let customers read **their own** bookings. So the
app can't see other people's bookings, and shouldn't: they contain who booked.

### The design: a separate `slots` collection

Every booking also creates one small document in `slots`:

```
slots/haircut_1894010400000   { serviceId: "haircut",
                                startAt:   7 Jan 2030 10:00,
                                bookingId: "Xy12..." }
```

- **No personal data.** No name, email or user ID, so every signed-in user may
  read it. The `bookingId` points to a booking only its owner can open; the
  rules need it to check who may free the slot.
- **Deterministic document ID**: `{serviceId}_{startAt in milliseconds}`.
  The same service and time *always* produce the same ID.

### Why that stops double booking

A Firestore document ID can exist only once. The rules allow **creating** a
slot but never **overwriting** one. If two customers tap Confirm for the same
time at the same moment:

1. Both try to create `slots/haircut_1894010400000`.
2. Firestore processes the writes one after the other. The first one creates
   the document.
3. For the second one, the document now exists, so its write counts as an
   *update*, which the rules forbid. It is rejected, along with its booking.

The guarantee is enforced by the database, not by the app, so even a modified
app can't double book.

### Why also a transaction?

`createBooking()` uses `runTransaction`:

```dart
final slot = await transaction.get(slotRef);
if (slot.exists) return false;          // → "Sorry, that time was just booked"
transaction.set(bookingRef, {...});     // the booking
transaction.set(slotRef, {...});        // its slot
```

- **All-or-nothing:** the booking and its slot are saved together or not at
  all. There's never a booking without a slot, or a slot without a booking.
- **Friendly error:** the transaction reads the slot first, so in the normal
  case the app shows a clear message instead of a generic permission error.
  If someone else claims the slot between the read and the write, Firestore
  re-runs the transaction, which then sees the slot as taken.

So: the **deterministic ID** is the actual protection, and the **transaction**
keeps the two writes consistent and the error messages clear.

### Showing taken slots

`watchTakenSlots()` listens to all `slots` documents of the selected day and
keeps those for the chosen service. The screen shows those times as
disabled (greyed-out) chips. It's a live stream, so if someone books a time
while you're looking at the screen, that chip greys out right away.

(The service filter is applied in Dart, not in the query: filtering on
`serviceId` plus a date range in one query would need a composite index.
One day has at most a few dozen slots, so this is cheap.)

### Cancelling frees the slot

`cancelBooking()` runs a transaction that sets the booking's `status` to
`cancelled` **and deletes its slot**. The rules require both to happen
together, so a cancelled booking never keeps blocking its time.

### Known limitation

A slot is a *start time*. A 90-minute coloring at 09:00 doesn't block another
coloring at 09:30 (think of a salon with more than one chair). Blocking
overlapping times would need more complex data and rules; it's a possible
later improvement.

## 5. The security rules, line by line

The full file is [`firestore.rules`](../firestore.rules). Rules are checked by
Google's servers on every read and write; anything not explicitly allowed is
denied.

Terms used below:

- `request.auth`: who is making the request (`null` if signed out).
- `resource.data`: the document **as it is now** in the database.
- `request.resource.data`: the document **as it would be after** the write.
- `get(path)` / `getAfter(path)`: read another document before / after the
  write (the whole batch or transaction counts as one write).
- `request.time`: the server's current time.

### Helpers

```
function signedIn() { return request.auth != null; }
```
Short name for "a user is logged in".

```
function bookingDoc(bookingId) { return /databases/$(database)/documents/bookings/$(bookingId); }
```
Builds the path of a booking document, for use with `get()`/`getAfter()`.

```
function slotDoc(serviceId, startAt) {
  return /databases/$(database)/documents/slots/$(serviceId + '_' + string(startAt.toMillis()));
}
```
Builds a slot's path **exactly like** `SlotCalculator.slotId()` in the app:
service ID, underscore, start time in milliseconds.

### `users/{uid}` (unchanged from Phase 1)

```
allow read: if signedIn() && request.auth.uid == uid;
```
You can read only your own profile.

```
allow create: if signedIn() && request.auth.uid == uid && request.resource.data.role == 'customer';
```
You can create only your own profile, and only with the role `customer`, so
nobody can register as an admin.

```
allow update, delete: if false;
```
Profiles can't be changed or deleted from the app (not part of this phase).

### `services/{serviceId}`

```
allow read: if signedIn();
```
Any logged-in user can see the services.

```
allow write: if false;
```
Nobody can change services from the app. You manage them in the Firebase
console, which acts as an admin and isn't limited by these rules.

### `bookings/{bookingId}`

```
allow read: if signedIn() && resource.data.userId == request.auth.uid;
```
You can read a booking only if it's yours. This also applies to queries:
the app's query must include `where('userId', isEqualTo: myUid)`, otherwise
Firestore rejects the whole query (it won't silently filter).

**Creating a booking.** Every condition must be true:

```
request.resource.data.keys().hasOnly([...7 fields...])
request.resource.data.keys().hasAll([...7 fields...])
```
The booking has exactly these fields: no missing ones, no extra ones.

```
request.resource.data.userId == request.auth.uid
```
You can only create bookings for yourself.

```
request.resource.data.status == 'confirmed'
```
New bookings start as confirmed.

```
request.resource.data.createdAt == request.time
```
`createdAt` must be the server's time (the app sends
`FieldValue.serverTimestamp()`), so it can't be faked.

```
request.resource.data.startAt > request.time
```
No bookings in the past.

```
get(.../services/$(serviceId)).data.active == true
get(.../services/$(serviceId)).data.name == request.resource.data.serviceName
get(.../services/$(serviceId)).data.durationMinutes == request.resource.data.durationMinutes
```
The service must exist and be active, and the copied name and duration must
match the real service, so nobody can book a 5-hour "Haircut".

```
getAfter(slotDoc(serviceId, startAt)).data.bookingId == bookingId
```
After this write, the slot for this service and time must exist **and point
to this booking**. This forces every booking to claim its slot in the same
write. Without it, someone could create a booking without a slot and skip the
double-booking protection.

**Cancelling (the only allowed update).** Every condition must be true:

```
resource.data.userId == request.auth.uid
```
It's your booking.

```
resource.data.status == 'confirmed' && request.resource.data.status == 'cancelled'
```
The only change allowed is confirmed → cancelled. A cancelled booking can't
be re-confirmed.

```
request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status'])
```
`status` is the only field that changes. You can't move the booking to
another time or service.

```
resource.data.startAt > request.time
```
Only upcoming bookings can be cancelled.

```
!existsAfter(slotDoc(resource.data.serviceId, resource.data.startAt))
```
After the write, the slot must be gone, so cancelling always frees the time.

```
allow delete: if false;
```
Bookings are never deleted; cancelled ones stay as history.

### `slots/{slotId}`

```
allow read: if signedIn();
```
Any logged-in user can see which times are taken. Safe, because slots hold
no personal data.

**Creating a slot.** Every condition must be true:

```
request.resource.data.keys().hasOnly(['serviceId', 'startAt', 'bookingId'])
request.resource.data.keys().hasAll(['serviceId', 'startAt', 'bookingId'])
```
Exactly these three fields, so nobody can sneak personal data into a slot.

```
slotId == request.resource.data.serviceId + '_' + string(request.resource.data.startAt.toMillis())
```
The document ID must match its content. Otherwise someone could store the
10:00 slot under a random ID and the uniqueness trick would fail.

```
getAfter(bookingDoc(bookingId)).data.userId == request.auth.uid
getAfter(bookingDoc(bookingId)).data.status == 'confirmed'
getAfter(bookingDoc(bookingId)).data.serviceId == request.resource.data.serviceId
getAfter(bookingDoc(bookingId)).data.startAt == request.resource.data.startAt
```
The slot must belong to **your own confirmed booking for the same service and
time**, written together with it. You can't block times without booking them.

```
allow update: if false;
```
**This line is what prevents double booking.** If the slot already exists, a
second "create" is really an update, and it's refused.

```
allow delete: if signedIn()
  && get(bookingDoc(resource.data.bookingId)).data.userId == request.auth.uid
  && getAfter(bookingDoc(resource.data.bookingId)).data.status == 'cancelled';
```
Only the owner of the booking can free its slot, and only while cancelling
that booking in the same write.

### How the rules were tested

The rules were run against the local **Firestore emulator** (offline, with a
`demo-` project, never touching the real project) with 23 scenarios, such as
"B books the same slot → refused", "B reads A's booking → refused",
"A cancels but keeps the slot → refused", and "B books the freed slot →
allowed". All passed.

## 6. Data flow: booking a slot

```
ChooseTimeScreen        BookingRepository                Firestore
   | pick a date           |                               |
   |-- watchTakenSlots --->|-- listen slots of that day -->|
   |<-- {10:00, 14:30} ----|<------------------------------| (live)
   | grey out 10:00, 14:30
   | pick 11:00, Continue
ConfirmBookingScreen
   |-- createBooking ----->|-- transaction:                |
   |                       |     read slot   ------------->|
   |                       |     set booking + set slot -->| rules check both
   |<-- Booking -----------|<------------------------------|
   |-- BookingReminders.scheduleFor(booking)  (on the phone, no network)
   | popUntil(first) + snackbar "Booked Haircut on ..."
```

Errors follow the Phase 1 pattern: `SlotTakenException` → "Sorry, that time
was just booked by someone else", and Firebase errors → `firebaseErrorMessage()`
(for example, "No internet connection...").

## 7. Reminders (local notifications)

A reminder is scheduled **on the phone itself** with
`flutter_local_notifications`. Android's alarm system wakes the app's
receiver at the right time, even if the app is closed. No server, no Cloud
Functions, so it works on the free Spark plan.

- **When:** one hour before the booking (`BookingConstants.reminderBefore`).
  If the booking is less than an hour away, no reminder is scheduled.
- **Inexact timing:** it may fire a few minutes late. Exact alarms need an
  extra permission that the user must grant manually since Android 14; a
  reminder doesn't need to-the-second precision.
- **Android 13+ permission:** the first time you confirm a booking, Android
  shows the "Allow notifications?" dialog. If you refuse, the booking is
  still saved and the snackbar says there will be no reminder.
- **Android 8.0+ channels:** Android shows notifications only through a
  *channel*, which users can turn on/off in system settings. The app creates
  a "Booking reminders" channel at startup. On Android 8.1 there's no
  permission dialog; the app just checks that notifications aren't switched off.
- **IDs:** a notification is identified by an `int`, a booking by a string
  ID. `notificationId()` turns the booking ID into a stable number, so
  cancelling the booking can cancel exactly its reminder.
- **Reboot:** a boot receiver in `AndroidManifest.xml` re-schedules pending
  reminders after the phone restarts.

**Limitations:** reminders live on the phone where you booked. They aren't
recreated after reinstalling the app or on another phone, and a booking
cancelled on another device keeps its reminder here. Some brands (Huawei,
Xiaomi, ...) may block background alarms to save battery; see the README's
Troubleshooting.

## 8. Loading, empty and error states

Each data screen uses a `StreamBuilder` and handles three cases with the
shared widgets in `core/widgets/state_views.dart`:

| Situation      | Widget        | Example                                      |
| -------------- | ------------- | -------------------------------------------- |
| Still loading  | `LoadingView` | spinner                                      |
| Nothing to show| `EmptyView`   | "No bookings yet", "No times left on this day" |
| Failed         | `ErrorView`   | "No internet connection..."                  |

The streams are created once in the screen's `State` (not in `build()`), so
rebuilding the screen doesn't open a new Firestore listener every time.

## 9. Other changes

- **Privacy for demo recordings:** the name and email fields set
  `enableSuggestions: false` and `autocorrect: false`, so the keyboard
  doesn't show word suggestions or autocorrect them while you type. Emails
  and passwords are never logged.
- **Android build:** `compileSdk` is 37 (required by the notifications
  plugin; it doesn't change which phones can install the app), and *core
  library desugaring* is enabled, which lets the plugin use modern Java date
  APIs on older Android versions.

## 10. Adding the sample services

Services are added by hand in the Firebase console (Firestore Database →
Data → `services` collection). The README's
[step 4](../README.md#4-add-the-sample-services) has the four sample salon
services with every field and type. Use readable document IDs such as
`haircut`, because they become part of each slot's ID.

## 11. Tests

| File                                              | What it checks |
| ------------------------------------------------- | -------------- |
| `test/features/bookings/slot_calculator_test.dart`| 14-day window, month/year rollover, 16 slots for 30 min, closing time for long services, no past times today, slot ID format |
| `test/features/bookings/booking_test.dart`        | Reading from Firestore data, unknown status, round-trip, end time, who can cancel, stable reminder IDs |
| `test/features/services/service_test.dart`        | Numbers stored as int or double, safe defaults |
| Phase 1 tests                                     | Validators, error messages, login widget tests |
