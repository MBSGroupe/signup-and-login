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
