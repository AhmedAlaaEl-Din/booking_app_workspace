# Phase 1 explained

This document explains how Phase 1 works, in plain terms. It assumes you know
programming (for example C++/Qt) but are new to Flutter.

## 1. Flutter in 60 seconds

- **Everything on screen is a widget.** A widget is a lightweight description
  of part of the UI, like a QML item. You don't change widgets; you *rebuild*
  them with new data, and Flutter updates only what changed.
- **StatelessWidget** has no state of its own: it draws from its inputs.
- **StatefulWidget** keeps mutable state in a separate `State` object that
  survives rebuilds. The login and register screens use it to own their form
  and text controllers.
- **`build()`** returns the widget tree. Flutter calls it whenever something
  the widget depends on changes.
- **`async` / `await` / `Future`**: a `Future<T>` is a value that arrives later
  (like `QFuture<T>`). `await` waits for it without blocking the UI thread.
- **`Stream<T>`**: a sequence of values over time, like a Qt signal you
  subscribe to with `listen()`.

## 2. Folder structure

The code is organized **by feature**, not by type. Everything about
authentication lives together in `features/auth/`. When the app grows
(bookings, services, admin), each feature gets its own folder.

```
lib/
  main.dart     Entry point: initializes Firebase, then runs the app
  app.dart      Creates AuthNotifier and the MaterialApp (theme + first screen)
  core/         Code shared by all features, no business logic
    constants/  AppSpacing: the spacing values used everywhere
    theme/      AppTheme: Material 3 colors and component styles
    utils/      Validators: rules for form fields
    widgets/    LoadingButton, CenteredScrollBody, showErrorSnackBar
  features/
    auth/
      data/       Talks to Firebase. Knows nothing about the UI.
      providers/  Holds auth state. Connects data <-> screens.
      screens/    The UI. Knows nothing about Firebase.
    home/
      screens/    The placeholder home screen
```

The three layers inside `auth/` each have one job:

| Layer       | File                     | Job                                          |
| ----------- | ------------------------ | -------------------------------------------- |
| `data`      | `auth_repository.dart`   | Calls Firebase Auth and Firestore            |
|             | `app_user.dart`          | The user profile model                       |
| `core/utils`| `firebase_error_messages.dart` | Firebase error code → friendly message (moved here from `auth/data` in Phase 2) |
| `providers` | `auth_notifier.dart`     | Current status, user, loading flag; actions  |
| `screens`   | `auth_gate.dart`, `login_screen.dart`, `register_screen.dart` | UI |

Because only the repository talks to Firebase, tests can swap in a fake
repository and run without a network or Firebase project.

## 3. How authentication works

### Firebase Auth

Firebase Auth stores the accounts (email + hashed password) and gives each
user a unique **uid**. After a successful sign-in, the SDK saves the session
on the device, so the user stays logged in after restarting the app.

The SDK exposes `authStateChanges()`, a stream that:

1. emits the current user (or `null`) right after the app starts, then
2. emits again every time someone signs in or out.

The whole app reacts to this one stream.

### Firestore

Firebase Auth only knows the email. Other profile data (name, role) goes in
Firestore, a cloud document database. Each user gets a document at
`users/{uid}`:

```
users/
  Xy12AbC...   { name: "Ahmed", email: "ahmed@mail.com",
                 role: "customer", createdAt: <server time> }
```

The `role` field will matter later (customer vs. staff/admin).
`firestore.rules` makes sure users can only read and create **their own**
document, and only with the `customer` role.

### AuthNotifier (state)

`AuthNotifier` is a `ChangeNotifier`. Think of it as a `QObject` with a single
`changed()` signal (`notifyListeners()`). It holds:

- `status`: `unknown` (app just started), `signedOut`, or `signedIn`
- `user`: the `AppUser` profile, or `null`
- `isLoading`: true while a login/register request runs

It also exposes the actions: `signIn`, `register`, `signOut`. They return
`null` on success or a **user-friendly error message** on failure, so screens
never deal with Firebase exceptions directly.

**provider** makes one `AuthNotifier` available to every screen
(`ChangeNotifierProvider` in `app.dart`). Screens use:

- `context.select<AuthNotifier, T>(...)`: read one value **and rebuild when
  it changes** (like binding a QML property)
- `context.read<AuthNotifier>()`: get the object once to call a method, with
  no rebuild subscription (used in button handlers)

### AuthGate (navigation)

`AuthGate` is the first screen. It doesn't navigate; it just picks a screen
from `status`:

| status      | shows                |
| ----------- | -------------------- |
| `unknown`   | a loading spinner    |
| `signedOut` | `LoginScreen`        |
| `signedIn`  | `HomeScreen`         |

So "go to Home after login" happens automatically: login changes the status,
and the gate rebuilds.

## 4. Data flow: from the screen to Firebase and back

### Register

```
RegisterScreen                 AuthNotifier              AuthRepository              Firebase
     |  validate form               |                          |                         |
     |--- register(name,...) ------>| isLoading = true        |                         |
     |                              |  (button shows spinner)  |                         |
     |                              |--- register(...) ------->|                         |
     |                              |                          |-- createUser ---------->| Auth
     |                              |<== authStateChanges emits the new user ============| (user is now signed in)
     |                              | status = signedIn        |                         |
     |                              |                          |-- set users/{uid} ----->| Firestore
     |                              |<------- AppUser ---------|                         |
     |                              | user = AppUser           |                         |
     |                              | isLoading = false        |                         |
     |<-------- null (success) -----|                          |                         |
     | pop back to AuthGate, which now shows HomeScreen        |                         |
```

Step by step:

1. The user taps **Create account**. The `Form` runs each field's validator
   (`Validators.email`, `Validators.password`, ...). If any fails, its message
   appears under the field and nothing is sent.
2. `RegisterScreen` calls `AuthNotifier.register(...)`.
3. `AuthNotifier` sets `isLoading = true` and notifies. `LoadingButton`
   rebuilds as a disabled button with a spinner, which also blocks double taps.
4. `AuthRepository.register` creates the account in Firebase Auth, then writes
   `users/{uid}` to Firestore. `createdAt` uses `FieldValue.serverTimestamp()`
   so the time comes from Google's server, not the phone's clock.
5. Creating the account also signs the user in, so `authStateChanges` emits
   and `status` becomes `signedIn`. The gate (hidden under the register
   screen) switches to **Home**. When the Firestore write finishes,
   `AuthNotifier` stores the full `AppUser`, the register screen pops itself,
   and Home shows `user.name` → "Welcome, Ahmed".
   (Because the auth event can arrive *before* the profile document exists,
   `AuthNotifier` keeps the profile from `register()` instead of overwriting
   it with a half-empty one. See the comments in `_onAuthStateChanged`.)
6. On failure the `FirebaseException` is caught in `AuthNotifier._run`,
   turned into a message by `firebaseErrorMessage`, returned to the screen, and
   shown in a red snackbar. For example, `email-already-in-use` →
   *"An account with this email already exists. Try logging in."*

### Login

1. `LoginScreen` validates, then calls `AuthNotifier.signIn(...)`.
2. The repository calls `signInWithEmailAndPassword`.
3. `authStateChanges` emits the user. `AuthNotifier` loads their
   `users/{uid}` document (`fetchProfile`), sets `status = signedIn`, and the
   gate shows **Home**.
4. Wrong credentials → `invalid-credential` → *"Incorrect email or password."*
   No network → `network-request-failed` → *"No internet connection..."*

### App start (already logged in)

The status starts as `unknown` (spinner). Firebase restores the saved session
and `authStateChanges` emits the user. The profile is loaded and Home appears.
If the profile can't be loaded (for example offline), `fetchProfile` falls back
to the name and email stored on the Auth account.

### Logout

The **Log out** button (on Home in Phase 1; on the Profile tab since
Phase 2) calls `signOut()`. `authStateChanges` emits `null`,
the status becomes `signedOut`, and the gate shows **Login**.

## 5. Tests

| File                                         | What it checks                                     |
| -------------------------------------------- | -------------------------------------------------- |
| `test/core/validators_test.dart`             | Each validator accepts/rejects the right input     |
| `test/core/firebase_error_messages_test.dart` | Firebase error codes map to friendly messages |
| `test/features/auth/login_screen_test.dart`  | Widget tests: spinner → login screen; validation errors; wrong-password snackbar |

Widget tests use `FakeAuthRepository` (`test/helpers/`). In Dart every class
can also be used as an interface, so the fake simply `implements
AuthRepository` and returns whatever the test needs, with no Firebase involved.
