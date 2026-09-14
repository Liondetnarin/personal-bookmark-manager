# Auth/Collections review — 2026-09-15

Scope: uncommitted work against HEAD `fb7a884`, including new files. Adapted the two-axis review to the working tree; project Markdown is the spec rather than an external issue. Two independent read-only reviewers inspected Standards and Spec. Findings below summarize their reports; they are not transcripts. The main agent additionally checked dependencies and database integrity.

## Standards

No hard standards violations or must-fix auth/ownership defects found in the reviewed slice. The guard pins issuer/audience/RS256 and verifies signatures against configured JWKS. Collection reads, counts and mutations include owner scope; SQL parameters are bound. Frontend token caching is in SDK memory.

One optional low-priority finding: startup logging printed complete errors, which can include invalid environment input. Fixed with a controlled startup message and a regression test that confirms invalid configuration is not echoed. No unrelated abstraction refactoring was requested.

## Spec

No functional contract violations found for implemented Auth/Collections operations. One P3 documentation finding: old LEARNING_PLAN paragraphs said Auth was not configured and Collections were future work. Fixed by marking the initial state as historical and updating the next stage.

Bookmark model/routes, nested Collection bookmarks and preservation on Collection deletion remain explicitly deferred to the learner's next stage, as does the UI. They are not claimed as complete.

Review totals: Standards 0 hard violations, 1 optional logging improvement (fixed); Spec 1 low-priority documentation inconsistency (fixed).

## Dependency findings and resolution

Initial `npm audit` reported six high-severity affected package entries, including parents of vulnerable transitive dependencies. Updated Nest common/core/platform-express from 12.0.1 to 12.0.2, which uses multer 2.3.0. Added scoped npm overrides for `@prisma/config → deepmerge-ts 8.0.0` and `prisma → mysql2 3.24.4`, then refreshed those lockfile entries with `npm update deepmerge-ts mysql2`. Initial install alone retained invalid old entries; `npm ls` detected that, and the targeted update resolved it.

The current app has no upload route or MySQL connection; the latter packages are in Prisma's tooling tree. The overrides preserve Prisma 7 and the SQLite lesson. deepmerge-ts 8 changes Map merging and some exported helper types; our Prisma config uses ordinary objects and its runtime `deepmerge` API remains available. Client generation and migration loading passed after the override. This checks this project's configuration, not arbitrary future configs. Reassess/remove overrides when Prisma's upstream dependency versions contain the fixes, and rerun generation/migration/tests on upgrades.

References: [multer advisory](https://github.com/advisories/GHSA-wc9g-mqfw-jrwm), [deepmerge-ts advisory](https://github.com/advisories/GHSA-ggr8-5vv4-36mx), [deepmerge-ts 8 changes](https://github.com/RebeccaStevens/deepmerge-ts/releases/tag/v8.0.0), [mysql2 advisory](https://github.com/advisories/GHSA-rgwj-5xj2-c3m3).

## Verified evidence

- Development SQLite checked read-only: integrity_check = ok; foreign-key violations, orphan Collections, duplicate per-owner name keys and unfinished non-rolled-back migrations all = 0. No user identities or resource contents printed.
- `npm run check`: passed TypeScript and both builds.
- `npm test`: 32 tests passed, including HTTP/JWKS/isolated SQLite ownership cases and the new startup-log regression.
- `npm run smoke`: passed startup/HTTP; this is not a privacy test.
- `npm run db:migrate`: no pending migrations; existing development data retained.
- `npm audit`: found 0 vulnerabilities at verification time.
- `npm ls deepmerge-ts mysql2 multer @nestjs/platform-express`: resolved patched/overridden versions without invalid dependency errors.

Limits: no claim of exhaustive security assurance; no production/deployment assessment. Real Auth0 login success is user-reported, while Collections security behavior was exercised with signed test tokens. Vite's existing 599.37 kB bundle warning remains.
