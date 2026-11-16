# Phase 4: things that need you

These were left undone on purpose. Each one needs a real account or a live
deploy, or it failed three times.

## 1. Leftover E2E test data in the live Firebase project

The live test from Phase 3 left this data. It was found read-only on
2026-11-16 and has **not** been deleted.

| What | ID | Details |
| ---- | -- | ------- |
| Auth user | `zy9yE1hDHCbHNUtQo1Ws0wTTqnC3` | demo.admin.9b8fea@example.com |
| Auth user | `sFE6eumvecXYLfHB9vTP5NtTvp83` | demo.customer.9b8fea@example.com |
| Firestore `users/` | the same two UIDs | their profiles |
| Firestore `services/` | `3tzdBMX3u1qpGhQCKkKc` | "E2E test service" (inactive) |
| Firestore `bookings/` | `7RWLmvQpcjNcoLTx7aa0` | E2E test service, 28 Nov 12:30, cancelled (its slot is already gone) |

Delete these in the Firebase console: **Authentication → Users**, and
**Firestore → Data**. Afterwards, `admin_web/.env.e2e.local` points to accounts
that no longer exist. Delete it, or re-run `tests/live/create-demo-accounts.mjs`
before the next `npm run test:live`.
