# Phase 4: Firestore security review

**Status:** `firestore.rules.proposed` is ready for review. **Nothing is deployed.**
`firestore.rules` (the deployed file) is unchanged.

## How it was tested

`admin_web/tests/rules/firestore.rules.test.ts` has 22 tests and runs only
against the local Firestore emulator:

```
cd admin_web
$env:FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080"   # PowerShell
npm run emulators            # in a second terminal
npm run test:rules           # current rules:  22 passed
npm run test:rules:proposed  # proposed rules: 22 passed
```

Three "hardening" tests show each gap below: the write **succeeds** with
`firestore.rules` and **fails** with `firestore.rules.proposed`.

## Who can do what (with the proposed rules)

| Collection | Read | Create | Update | Delete | Why |
| ---------- | ---- | ------ | ------ | ------ | --- |
| `users/{uid}` | Owner; admin | Owner only, `role: "customer"`, exactly `name`, `email`, `role`, `createdAt`. Email must be the account's own, `createdAt` must be the server time. | Nobody | Nobody | Nobody can make themselves admin. Admins are set in the Firebase console only. Profiles can't carry extra fields or a fake email. |
| `services/{id}` | Any signed-in user | Admin, valid shape only | Admin, valid shape only | Nobody | Old bookings refer to services, so they are deactivated, never deleted. |
| `bookings/{id}` | Owner; admin | Owner, `confirmed`, in the future, **within 15 days**, **on a 30-minute boundary**, matching an active service, together with its slot | Owner or admin: only `confirmed` → `cancelled`, only before it starts, and only if the slot is freed in the same write | Nobody | Bookings are history. Cancelling always frees the time for others. |
| `slots/{id}` | Any signed-in user (no personal data) | Owner of the booking it points to, in the same write as the booking | Nobody | Booking owner or admin, only when the booking becomes `cancelled` | The document ID is `serviceId_startMillis`, so a second booking for the same time is impossible. |
| Everything else | Nobody | Nobody | Nobody | Nobody | Default deny. |

Unauthenticated users can do nothing at all (tested).

## Changes in `firestore.rules.proposed`

| # | Gap in the current rules | Proposed fix | Risk of the fix |
| - | ------------------------ | ------------ | --------------- |
| 1 | A customer can book any time in the future, for example 60 days ahead, although the app offers 14 days. | `startAt < request.time + 15 days` (one day of slack for time zones). | None for the app. |
| 2 | A customer can book a start time off the app's grid (for example 10:07), which could block two grid slots. | `startAt.toMillis() % 30 min == 0`. | It assumes the device's UTC offset is a whole number of half hours. That's true for Egypt and almost everywhere, but not for Nepal (+5:45) or Chatham Islands (+12:45). |
| 3 | A new profile can include any extra fields (for example `isVip: true`) and any email, such as the admin's. The dashboard shows that email to the admin. | The profile must have exactly the 4 fields, a name of 1–80 characters, `email.lower() ==` the signed-in account's email, and `createdAt == request.time`. | The app already writes exactly this (`auth_repository.dart`: trimmed email and a server timestamp). |

Everything else is unchanged.

## Not changed, worth knowing

- **Spam bookings:** a customer can still book many free slots. Rules can't
  count documents cheaply. A per-user limit would need a counter document or
  a Cloud Function, and Cloud Functions aren't available on the Spark plan.
- **Reading `slots`:** any signed-in user can see which times are taken (no
  names). The app needs this to grey out taken times.
- **`isAdmin()`** costs one extra document read per admin request.

## To deploy (you)

1. Review the diff: `git diff --no-index firestore.rules firestore.rules.proposed`
2. If you're happy with it: `copy firestore.rules.proposed firestore.rules`, then
   `firebase deploy --only firestore:rules --project <your-project-id>`
