# Dependency Validation - sync-transcript-studio

Validated on: 2026-05-31
Scope: candidate dev dependencies for a new dependency-light TypeScript local web app
Method: npm registry version lookups, temp lockfile-only `npm install --package-lock-only`, and `npm audit --json`

## Candidate Versions

| Package | Latest stable | Deprecation flag | High-or-above advisories | Notes |
| --- | --- | --- | --- | --- |
| `typescript` | `6.0.3` | none | none found | Safe to add as a dev dependency. |
| `vite` | `8.0.14` | none | none found | Safe to add as a dev dependency. |
| `vitest` | `4.1.7` | none | none found | Safe to add as a dev dependency. |
| `@types/node` | `25.9.1` | none | none found | Safe to add as a dev dependency. |

## Validation Notes

- `npm view <pkg> version --json` returned the latest stable versions listed above.
- `npm view <pkg>@<version> deprecated --json` returned no deprecation notices for all four packages.
- `npm audit --package` could not be used directly because npm requires an existing lockfile.
- To keep this preflight read-only for the project, I created a temporary package manifest outside the repo, ran `npm install --package-lock-only --ignore-scripts --no-audit`, then ran `npm audit --json`.
- The temp lockfile-only audit returned `0` vulnerabilities across `info`, `low`, `moderate`, `high`, and `critical`.

## Recommendation

- Add the four packages as dev dependencies with caret ranges pinned to the latest stable versions:
  - `typescript@^6.0.3`
  - `vite@^8.0.14`
  - `vitest@^4.1.7`
  - `@types/node@^25.9.1`
- After the implementation package exists, run a real install in that package root and re-run `npm audit` as part of the normal setup.

## Blocker

- No blocker found.
- Based on the current npm registry data and the temporary audit check, this candidate set is clean enough to adopt.

## Commands Run

1. `npm view typescript version --json`
2. `npm view vite version --json`
3. `npm view vitest version --json`
4. `npm view @types/node version --json`
5. `npm view typescript@6.0.3 deprecated --json`
6. `npm view vite@8.0.14 deprecated --json`
7. `npm view vitest@4.1.7 deprecated --json`
8. `npm view @types/node@25.9.1 deprecated --json`
9. Temporary lockfile-only audit setup: `npm install --package-lock-only --ignore-scripts --no-audit --loglevel=error`
10. Temporary audit check: `npm audit --json`
