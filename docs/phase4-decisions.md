# Phase 4: decisions made during the unattended run

Each decision was made without being able to ask. The safest reasonable option
was chosen.

| # | Decision | Reason |
| - | -------- | ------ |
| 1 | The earlier request to delete the leftover `9b8fea` E2E data from the live Firebase project was **not** carried out. It is listed in `phase4-needs-me.md`. | Phase 4 forbids any write to live Firebase, and that deletion was never confirmed. |
| 2 | Branch `phase4-polish` was created from `feature/portfolio-demo` (which includes the README video link commit `ec7602f`). | That is where the latest work was. Nothing is pushed or merged. |
| 3 | The emulators run with project ID `demo-booking`. Firebase refuses to contact production for any `demo-` project. | This prevents accidental live access. |
