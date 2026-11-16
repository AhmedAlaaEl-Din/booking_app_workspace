# Phase 3 explained

Phase 3 adds a **web admin dashboard** for the business owner, in the folder
`admin_web/`. It uses the same Firebase project and data as the Flutter app.
This document explains how it works, in plain terms, with comparisons to the
Flutter code where that helps. It builds on [phase2-explained.md](phase2-explained.md).

## 1. The building blocks

| Piece                | What it is                                                         | Flutter equivalent                    |
| -------------------- | ------------------------------------------------------------------ | ------------------------------------- |
| **React**            | A library for building UIs out of *components* (functions that return what to show) | Widgets                 |
| **Next.js**          | A framework around React: folders become URLs, plus build and dev server | `MaterialApp` + routes + `flutter run` |
| **TypeScript**       | JavaScript with types, checked by `tsc`                            | Dart's type system                    |
| **Tailwind CSS**     | Styling with small class names: `p-4` = padding, `text-slate-500` = grey text | `Padding`, `TextStyle`     |
| **Firebase Web SDK** | The browser version of `firebase_auth` / `cloud_firestore`         | The FlutterFire packages              |

A few React words used below:

- **Component**: a function that returns JSX (HTML-like markup), e.g. `function LoginPage() { return <form>…</form> }`.
- **State** (`useState`): a value that, when changed, makes React redraw the component. Like `setState` in a `StatefulWidget`.
- **Effect** (`useEffect`): code that runs after the component appears, e.g. to start a Firestore listener. The function it returns runs when the component disappears (like `dispose()`).
- **Context**: a way to share a value with every component below it, without passing it down by hand. Like `Provider`.
- **`"use client"`**: Next.js renders components on the server by default. This line at the top of a file says "this runs in the browser", which is needed for state, effects and Firebase. Almost every file in this dashboard is a client component, because all data comes from Firebase in the browser.

## 2. Folder structure

```
admin_web/
  app/                      Pages. In Next.js, each folder under app/ is a URL.
    layout.tsx              Wraps every page: the <html> shell and the AuthProvider
    globals.css             Tailwind plus shared classes (.btn-primary, .input, ...)
    login/page.tsx          The page at /login
    (dashboard)/            A "route group": brackets mean it is NOT part of the URL.
      layout.tsx            Wraps the three pages below in the AdminGate
      page.tsx              /           Overview
      bookings/page.tsx     /bookings
      services/page.tsx     /services
  components/               Reusable pieces of UI
    admin-gate.tsx          Lets only admins through (see section 3)
    app-shell.tsx           Sidebar on desktop, top bar with a Menu button on phones
    modal.tsx               A dialog box, and ConfirmDialog ("Cancel this booking?")
    service-form.tsx        The add/edit service form
    state-views.tsx         Spinner, EmptyView, ErrorView
    status-badge.tsx        The "confirmed" / "cancelled" pill
  lib/                      Logic, no page layout
    firebase.ts             Connects to Firebase using the values in .env.local
    auth-context.tsx        Who is signed in, and the admin check
    data-context.tsx        Live bookings, services and users for the pages
    firestore.ts            Every Firestore read and write (like a repository)
    bookings.ts             Pure logic: filters, counts, "can cancel?"
    dates.ts                Pure logic: date keys and formatting
    validation.ts           Pure logic: login and service form checks
    errors.ts               Firebase error codes -> friendly messages
    types.ts                The shapes of Booking, Service, AppUser
  tests/unit/               Vitest tests for the pure logic
  tests/e2e/                Playwright tests that open the pages in Chromium
  .env.example              The empty template for .env.local
  package.json              Dependencies and scripts (like pubspec.yaml)
```

The same layering as the app: **pages never call Firebase directly**. They use
`lib/firestore.ts` (writes) and `lib/data-context.tsx` (live reads), just like
screens use a repository.

`@/lib/...` in imports means "from the `admin_web/` folder", so imports don't
need `../../..`.

## 3. Login and the role check

There are two layers, and both matter:

1. **The dashboard** decides what to *show* (this section).
2. **The Firestore rules** decide what data anyone can *get* (section 5). Even
   if someone bypassed the dashboard's code, the rules still refuse.

### `lib/auth-context.tsx`

`AuthProvider` wraps every page (in `app/layout.tsx`) and keeps one value,
`status`:

| `status`    | Meaning                                                                 |
| ----------- | ----------------------------------------------------------------------- |
| `loading`   | Firebase hasn't said yet who is signed in, or the role is being checked |
| `signedOut` | Nobody is signed in                                                     |
| `admin`     | Signed in, and `users/{uid}.role == "admin"`                            |

It listens with `onAuthStateChanged`, which Firebase calls when the page loads
(with the remembered user, or nobody) and after every sign-in and sign-out:

```
someone signs in
  -> onAuthStateChanged(user)
  -> status = "loading"
  -> read users/{uid}
       role == "admin"  -> status = "admin"
       anything else    -> notice = "Access denied ..." and signOut()
                              -> onAuthStateChanged(null) -> status = "signedOut"
       read failed      -> notice = "Could not check your access ..." and signOut()
```

A customer can read their own `users/{uid}` (that rule exists since Phase 1),
so the check works for them; they are simply not let in.

### `app/login/page.tsx`

The form checks the input first (`validateLogin` in `lib/validation.ts`: "Enter
your email.", "Enter a valid email address.", "Enter your password."). Only then
does it call `signIn()`. Wrong passwords etc. come back as Firebase error codes,
which `friendlyError()` turns into messages like "Wrong email or password.". The
"Access denied" notice from the role check is shown in the same place. When
`status` becomes `admin`, the page moves on to `/`.

### `components/admin-gate.tsx`

Every dashboard page is wrapped in `AdminGate` (through
`app/(dashboard)/layout.tsx`):

- `loading` -> a spinner ("Checking your access…")
- `signedOut` -> redirect to `/login`
- `admin` -> start the live data (`DataProvider`) and show the page

The data listeners are created **only** inside `DataProvider`, which only
exists for an admin. A non-admin never starts a single bookings or users query.

## 4. How real-time data flows

`lib/data-context.tsx` starts three Firestore listeners with `onSnapshot`, the
web version of `.snapshots()` in Flutter:

| Listener   | Query                                                  | Why                     |
| ---------- | ------------------------------------------------------ | ----------------------- |
| bookings   | `orderBy("startAt", "desc")`, `limit(200)`             | The latest 200 bookings |
| services   | the whole `services` collection                        | Names for filters, and the Services page |
| users      | the whole `users` collection                           | Customer names and emails |

```
Firestore ──(onSnapshot: first the current data, then every change)──▶ DataProvider state
                                                                           │
                         useData() in Overview / Bookings / Services ◀────┘
                                                                           │
                         filterBookings(), countBookings(), ... (pure) ───▶ what you see
```

Each list is in one of three states: `loading` (before the first answer),
`error` (e.g. permission denied) or `ready` (with the data). Every page shows a
spinner, an error box, an empty message, or the data accordingly.

When a customer books or cancels in the app, Firestore sends the change to the
dashboard within a second or so, and React redraws. The same happens after the
admin cancels a booking: the code doesn't update the table itself, the
listener does.

**Why no composite index?** Firestore needs a special index for queries that
combine `where()` on one field with `orderBy()`/range on another. The
dashboard only orders by one field and does all filtering (date, status,
service) in the browser, in `filterBookings()`. Same trick as the app.

**"Today" and "upcoming"** are calculated with `useNow()`, which refreshes the
current time every minute. All dates are JavaScript `Date`s, which show in the
browser's local time zone.

### Joining customers

A booking stores only `userId`. The Bookings page looks up
`users.get(booking.userId)` in the users map to show the name and email. If a
profile is missing, it shows "Unknown customer".

### Cancelling a booking

`cancelBooking()` in `lib/firestore.ts` is a copy of `cancelBooking()` in the
app's `BookingRepository`, so the rules see exactly the same two writes:

```
transaction:
  read bookings/{id}
  if status is not "confirmed": stop (someone already cancelled it)
  read slots/{serviceId}_{startAtMillis}
  update bookings/{id}: status = "cancelled"   (only this field)
  if the slot exists and its bookingId is this booking: delete it
```

Deleting the slot is what makes the time bookable again in the app. The
**Cancel** button only appears for confirmed bookings that haven't started,
the same rule as `Booking.canCancel()` in the app, and a dialog asks for
confirmation first.

### Services

Add and edit use the same form; `validateServiceForm()` checks the fields and
turns the text inputs into numbers. Activate/Deactivate changes only `active`.
There is **no delete**: old bookings refer to their service, so a service is
deactivated instead. Customers no longer see an inactive service in the app;
their existing bookings stay as they are.

## 5. How the rules protect the data

All Phase 2 rules are unchanged. Phase 3 only **adds** rules. In Firestore
rules, when there are several `allow` lines for the same action, the request is
allowed if **any** of them is true. So the new admin lines can't make customers'
limits looser: for a customer, `isAdmin()` is false and those lines never
allow anything.

### The helper

```
function isAdmin() {
  return signedIn()
    && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}
```

`get()` reads the signed-in user's profile and checks its role. The role is
stored in Firestore, and nobody can change it from an app (`users`: `allow
update, delete: if false`, and a new profile must have `role == 'customer'`).
Only the Firebase console can make someone an admin.

### The new lines

| Where      | Rule                                    | Meaning                                                                                       |
| ---------- | --------------------------------------- | --------------------------------------------------------------------------------------------- |
| `users`    | `allow read: if isAdmin()`              | Admins can read every profile (names and emails)                                              |
| `services` | `allow create, update: if isAdmin() && validService(...)` | Admins add/edit services, but only with exactly the 5 fields, of the right types and within limits |
| `services` | `allow delete: if false`                | Nobody deletes a service                                                                      |
| `bookings` | `allow read: if isAdmin()`              | Admins can read every booking                                                                 |
| `bookings` | `allow update: if isAdmin() && ...`     | Admins can change `confirmed` to `cancelled`, **only** that field, only before it starts, and only if the slot is deleted in the same write |
| `slots`    | `allow delete: if isAdmin() && ...`     | Admins can delete a slot only if its booking is `cancelled` after the write                   |

The last two work as a pair, exactly like the customer rules: the booking
update needs the slot gone (`!existsAfter(slot)`), and the slot delete needs
the booking cancelled (`getAfter(booking).status == 'cancelled'`). So an admin
can't cancel without freeing the slot, or free a slot without cancelling.

### Costs and risks

- **Extra reads.** Each `get()` counts as one document read, every time a rule
  calls it. Admin requests pay one extra read. Some customer requests that are
  checked against the admin lines (for example a request the customer lines
  refuse) may also pay one. For a small business this is a tiny cost, but it's
  not free.
- **Admins can read every customer's name and email.** That's the point of the
  dashboard, but keep the number of admin accounts small.
- **A removed admin keeps their session**, but every request is checked again,
  so as soon as their role changes, the rules refuse their reads and writes.
- **A service edited while a customer is booking** can make that booking fail
  once ("You do not have permission"), because the rules compare the booking's
  service name and duration with the service. Restarting the app fixes it.

## 6. Tests

- **Unit tests** (`npm test`, Vitest): the pure functions in `lib/`: filters,
  counts, today's list, "can cancel?", slot IDs, date formatting, and form
  validation. They use no browser and no Firebase.
- **Smoke tests** (`npm run test:e2e`, Playwright): open the real pages in
  Chromium. The login page renders; visiting `/`, `/bookings` or `/services`
  while logged out ends on `/login`; empty and invalid input shows the
  validation messages. They start their own server with **fake** Firebase
  values and never sign in, so they need no account and touch no real data.
  Screenshots are saved to `admin_web/evidence/` (git-ignored).
- The admin flows that need a real admin account (sign in, cancel, edit
  services) are checked by hand; see the checklist in `admin_web/README.md`.
