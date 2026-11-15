# Booking admin (web dashboard)

A web dashboard for the business owner. It uses the **same Firebase project and
data** as the Flutter app in the parent folder.

- **Overview**: today's bookings, upcoming confirmed bookings, cancelled
  bookings, and today's appointments
- **Bookings**: all bookings (latest 200) with customer name and email, filters
  by date, status and service, live updates, and cancel (frees the time slot,
  exactly like a cancel in the app)
- **Services**: add, edit, activate and deactivate (services are never deleted)
- Only users with `role: "admin"` in `users/{uid}` can sign in

Built with Next.js (App Router), TypeScript, Tailwind CSS and the Firebase Web
SDK. There is no server code, no Firebase Admin SDK and no service account: the
browser talks to Firebase directly, and `firestore.rules` decides what each
user may do.

A beginner-friendly walkthrough: [../docs/phase3-explained.md](../docs/phase3-explained.md).

## Setup

You need **Node.js 20.9 or newer** (developed with Node 26).

### 1. Install the packages

```
cd admin_web
npm install
```

### 2. Add a Web app to your Firebase project

The Flutter app is registered as an *Android* app; the dashboard needs a *Web*
app in the same project:

1. [Firebase console](https://console.firebase.google.com) → your project →
   **Project settings** (gear icon) → **General**.
2. Under **Your apps**, click **Add app** → the **Web** icon (`</>`).
   Nickname: `admin_web`. Leave Firebase Hosting unchecked. Click **Register app**.
3. Firebase shows a `firebaseConfig` object. Keep that page open.

### 3. Create `.env.local`

Copy the template and fill in four values from that `firebaseConfig`:

```
copy .env.example .env.local      (Windows)
cp .env.example .env.local        (macOS/Linux)
```

| In `.env.local`                    | From `firebaseConfig` |
| ---------------------------------- | --------------------- |
| `NEXT_PUBLIC_FIREBASE_API_KEY`     | `apiKey`              |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `authDomain`          |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`  | `projectId`           |
| `NEXT_PUBLIC_FIREBASE_APP_ID`      | `appId`               |

Write the values without quotes, for example `NEXT_PUBLIC_FIREBASE_PROJECT_ID=my-project`.
`.env.local` is git-ignored. These values identify the project and end up in
the browser anyway; they are not secret. The data is protected by Firebase Auth
and the Firestore rules.

### 4. Deploy the Firestore rules

The dashboard needs the Phase 3 rules (admins may read all bookings, cancel,
edit services). From the **repository root**:

```
firebase deploy --only firestore:rules --project <your-firebase-project-id>
```

### 5. Create the first admin

Nobody can become admin from an app; you set the role by hand:

1. Register a normal account in the **mobile app** (use a demo email).
2. Firebase console → **Firestore Database** → `users` → the document for that
   account (its ID is the user's UID; check the `email` field).
3. Click the `role` field, change `customer` to `admin`, and save.
4. Sign in to the dashboard with that email and password.

Any other account sees "Access denied" and is signed out.

### 6. Run

```
npm run dev
```

Open <http://localhost:3000>. After editing `.env.local`, stop and restart
`npm run dev`.

## Checks and tests

| Command             | What it does                                                  |
| ------------------- | ------------------------------------------------------------- |
| `npm run typecheck` | TypeScript type check                                         |
| `npm run lint`      | ESLint                                                        |
| `npm test`          | Vitest unit tests (filters, counts, dates, validation)        |
| `npm run test:e2e`  | Playwright smoke tests in Chromium (see below)                |
| `npm run build`     | Production build                                              |

The Playwright tests need **no real account**. They start their own dev server
on port 3100 with fake Firebase values (your `.env.local` is not used) and only
check the login page, the redirect to `/login`, and the form validation. The
first time, install the browser with `npx playwright install chromium`.

Screenshots of every test go to `evidence/screenshots/`, and videos of failed
tests to `evidence/test-results/`. The `evidence/` folder is git-ignored.

## Manual test checklist

Use demo accounts and demo data only. You need one admin account and one
customer account.

- [ ] Logged out, open `/bookings`: you land on `/login`.
- [ ] Submit the empty form: "Enter your email." and "Enter your password.".
- [ ] Wrong password: "Wrong email or password.".
- [ ] Sign in as the **customer**: "Access denied…", and you stay on `/login`.
- [ ] Sign in as the **admin**: the Overview opens with three counts and today's list.
- [ ] Reload the page: you stay signed in.
- [ ] Bookings: customer names and emails show; each filter (date, status,
      service) narrows the table; "Clear filters" resets it.
- [ ] Book a time in the mobile app: it appears in the table without reloading.
- [ ] Cancel that booking in the dashboard, then **Keep booking** in the
      dialog: nothing changes. Cancel again and confirm: the status becomes
      `cancelled`, and in the app the same time is free again (Choose time screen).
- [ ] The app's My bookings shows the booking under Past, as cancelled.
- [ ] Services: add one (try empty fields and a price like `1.234` first to see
      the errors), edit it, deactivate it: it disappears from the app's list;
      activate it: it comes back.
- [ ] Narrow the browser window (or use a phone): the sidebar becomes a Menu button.
- [ ] Sign out: you're back on `/login`.

## Folder structure

```
app/                      Pages. Each folder is a URL.
  layout.tsx              Wraps every page (HTML shell + AuthProvider)
  globals.css             Tailwind and a few shared classes (buttons, inputs)
  login/page.tsx          /login
  (dashboard)/            Pages behind the admin check; "(...)" is not in the URL
    layout.tsx            Puts AdminGate around the pages below
    page.tsx              /          Overview
    bookings/page.tsx     /bookings
    services/page.tsx     /services
components/               Reusable UI: AdminGate, AppShell (sidebar/menu),
                          Modal + ConfirmDialog, ServiceForm, state views
lib/                      Logic
  firebase.ts             Firebase setup from .env.local
  auth-context.tsx        Sign in/out and the admin role check
  data-context.tsx        Live data (onSnapshot) shared by the pages
  firestore.ts            All Firestore reads and writes (incl. cancelBooking)
  bookings.ts, dates.ts,  Pure logic: filters, counts, date formatting,
  validation.ts, errors.ts  form checks, friendly error messages
  types.ts                Booking, Service, AppUser
tests/unit/               Vitest tests for the pure logic
tests/e2e/                Playwright smoke tests
```

## Notes

- **No composite indexes needed.** Bookings are loaded with one
  `orderBy("startAt")` + `limit(200)`; every filter runs in the browser.
- **Only the latest 200 bookings** (by appointment time) are loaded, so the
  counts on the Overview cover those 200.
- **Cancel** is allowed for confirmed bookings that haven't started yet, the
  same rule as in the app. It changes the booking to `cancelled` and deletes the
  slot document in one transaction, so the time becomes free again.
- **Times** are shown in the browser's local time zone.
