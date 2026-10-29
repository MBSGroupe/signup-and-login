# Testing the frontend

| Command | What |
|---|---|
| `npm test` | All tests once (Vitest + jsdom) |
| `npm run test:watch` | Re-run on change |
| `npm run test:cov` | With coverage (`coverage/`) |
| `npx vitest run src/Pages` | One folder or file |

Tests sit next to the code as `*.test.js(x)`. The config is the `test`
block in `vite.config.js`; `VITE_NEST_API_URL` is `http://api.test` in tests.

## Helpers (`src/test/utils.jsx`)

| Helper | |
|---|---|
| `userContextValue({ user, token, loading, setAuthData })` | what `UserProvider` exposes, for a logged-in user or none |
| `member`, `admin`, `superAdmin` | sample users |
| `renderAt(ui, { path, context })` | renders in a router with stub pages for `/`, `/auth/profile`, `/dash`, to assert redirects |
| `fakeJwt(payload)` | a decodable (unsigned) token, e.g. `{ type: 'admin' }` |
| `jsonResponse(status, body)` | a `fetch` Response |

## Patterns

- Network: `vi.stubGlobal('fetch', vi.fn())`, then `fetch.mockResolvedValue(jsonResponse(...))`.
- Code using `window.location` / `localStorage` directly (`Components/api.js`):
  add `// @vitest-environment node` and stub them with `vi.stubGlobal`.
- Hooks that call the API: `vi.mock('../Components/api')` and assert what the
  hook does with the result; `api.js` itself is tested on its own.
- Timers: `vi.useFakeTimers({ shouldAdvanceTime: true })` and
  `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })`.
- Query by role / placeholder / text, the way a user finds things. Some forms
  have labels not linked to their inputs; those are selected by `name`.

## Browser tests (`e2e/`, Playwright)

The real frontend against the real backend, on the backend's throwaway
copy of the production database (see the backend's TESTING.md, "End-to-end
tests"). `npm run test:e2e` starts both servers, runs, and stops them:

- the backend with `npm run e2e:serve` in `E2E_BACKEND_DIR` (default
  `../bckGO`): it rebuilds `erp_test_e2e`, prepares the test accounts and
  listens on `127.0.0.1:3100`, with a control API on `:3101`;
- Vite on `127.0.0.1:5174`, with `VITE_NEST_API_URL` pointing at it.

```bash
npm run test:e2e
E2E_BACKEND_DIR=../bckGO-testing E2E_ENV_FILE=../bckGO/.env npm run test:e2e   # from worktrees
npx playwright test e2e/approval.spec.js --headed                             # one file, visible
npx playwright show-report e2e-report
```

First time on a machine: `npx playwright install chromium`. Locally,
already running servers are reused (and the database is then not rebuilt):
stop them for a clean run.

`e2e/helpers.js`: `accounts()` (`superAdmin`, `secCloa`, `cloaAdmin`,
`member`, `outsider`, `synthetic`, one password), `loginMember` /
`loginAdmin`, `waitForMail(email, /subject/)` (mail is recorded, never
sent), `expireSessions(email)`.

| Journey | File |
|---|---|
| member / admin login, wrong password, member kept out of `/dash` | `auth.spec.js` |
| expired session → login page with the reason (member and admin) | `auth.spec.js` |
| signup with documents → verification mail → login → Déclaration in progress | `signup.spec.js` |
| sec_cloa checks the documents and approves; the member sees the step approved | `approval.spec.js` |
| member's fee, payment, what remains; receipt PDF (known failure, see file) | `fees.spec.js` |
| CLOA admin gets only their region, cannot open a member elsewhere | `scope.spec.js` |
| Arabic renders right to left (checks + screenshots) | `rtl.spec.js` |

Screenshots only show the synthetic member (made-up names). Snapshots are
per platform (`*-chromium-win32.png`): after a deliberate design change,
`npm run test:e2e -- --update-snapshots`. Reports and traces
(`e2e-report/`, `e2e-results/`) show data of the copy: they are ignored by
git and stay on this machine.

## CI (`.github/workflows/ci.yml`)

- **checks**, every push and pull request: lint may not get worse
  (`npm run lint:ratchet`, counts per rule in `lint-baseline.json`; after
  fixing some, `node scripts/lint-ratchet.cjs --update`), unit tests with
  their coverage floors (`vite.config.js`, raise them, never lower them),
  build.
- **e2e**, nightly, on pull requests to `main` and on demand (Actions → CI →
  Run workflow): the browser tests against the backend on a synthetic
  database (no production data on GitHub). Needs, in the repo settings:
  - secret `BACKEND_REPO_TOKEN`: a token that can read
    `MBSGroupe/gest-org-backend`;
  - variable `BACKEND_REF` (optional): the backend branch, `main` by default.
  On CI the screenshots aren't compared (taken on Windows); the
  right-to-left checks still run.
- **Before each commit** (husky, after `npm install`): the unit tests related
  to the staged files. `git commit --no-verify` skips it once.
