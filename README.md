# QuickLendX Frontend

Next.js 15 (App Router) + React 19 + TypeScript scaffold for the QuickLendX invoice-lending UI.

## Getting started

```bash
npm ci
npm run dev
# → http://localhost:3000
```

## Scripts

| Script            | What it does                                   |
| ----------------- | ---------------------------------------------- |
| `npm run dev`     | Start the dev server                           |
| `npm run dev:reset` | Clear local dev caches (`.next`), then start the dev server |
| `npm run build`   | Production build                               |
| `npm run start`   | Serve the production build                     |
| `npm run lint`    | ESLint (Next.js core-web-vitals + TS presets)  |
| `npm run typecheck` | `tsc --noEmit`                               |
| `npm test`        | vitest + React Testing Library                 |
| `npm run check`   | Runs lint, typecheck, and test in sequence — one command before pushing |

If you have [`just`](https://github.com/casey/just) installed, `just typecheck`
is a shorthand for `npm run typecheck` (see the `Justfile`). It's optional —
every recipe just wraps an existing npm script, so `just` is never required.

## Environment variables

Copy `.env.example` to `.env.local` and fill in values. All runtime env vars
are read through `lib/config.ts` — never access `process.env` directly in
business logic.

| Variable      | Required | Default     | Description                                                                 |
| ------------- | -------- | ----------- | --------------------------------------------------------------------------- |
| `SENTRY_DSN`  | No       | `""`        | Sentry DSN for error tracking. When empty, Sentry is disabled.              |
| `STELLAR_NETWORK` | No   | `"testnet"` | Which Stellar network the client targets: `testnet` or `mainnet`. Unset or unrecognized values fall back to `testnet`. |
| `SOROBAN_RPC_URL` | No | per-network default | Soroban RPC endpoint for the server-side on-chain read layer (`lib/qlx.ts`). Defaults to the public endpoint for `STELLAR_NETWORK`; malformed or non-http(s) values fall back. |

## Mock API server for local dev

`npm run mock:api` starts a standalone HTTP server (`scripts/mock-server.mjs`)
serving canned JSON for the same paths as the real API routes under
`app/api/` (`/api/auth/session`, `/api/alerts`), on
`http://localhost:4000` by default. Override the port with `MOCK_API_PORT`.

This is a one-command way to exercise the API surface (e.g. with `curl`, or
from another tool) without booting the full Next dev server. It's separate
from the [MSW handlers](#testing-auth-backed-code) used in tests -- those
intercept requests inside the test runner, they don't listen on a real port.

## Testing auth-backed code

`mocks/handlers.ts` holds [MSW](https://mswjs.io) request handlers for the
auth endpoints (`/api/auth/session` for now), started/stopped globally in
`test/setup.ts`. Any test that renders a component or hook calling those
endpoints gets the default (signed-out) response automatically — no manual
`fetch` mocking needed. To exercise a different response in one test, use
`server.use(...)`:

```ts
import { server } from "../../mocks/server";
import { signedInSessionHandlers } from "../../mocks/handlers";

server.use(...signedInSessionHandlers);
```

See `lib/hooks/useSession.test.ts` for the full pattern, including an
explicit-failure case via `server.use(http.get(..., () => new HttpResponse(...)))`.

## Theme tokens

All color values live as CSS custom properties on `:root` in
[`app/globals.css`](./app/globals.css) -- never hardcode a hex value in a
component or module stylesheet.

| Token         | Purpose                                    |
| ------------- | ------------------------------------------- |
| `--bg`        | Page background                             |
| `--surface`   | Raised surfaces (cards, panels)             |
| `--text`      | Primary text color                          |
| `--muted`     | Secondary text (descriptions, labels)       |
| `--accent`    | Primary interactive color (buttons, links)  |
| `--accent-fg` | Text/icon color on top of `--accent`        |
| `--border`    | Hairline borders and dividers               |
| `--radius`    | Corner radius for cards and buttons         |

The `:root` block defines the dark palette (the default). A
`@media (prefers-color-scheme: light)` block overrides the same token names
with light values -- it never introduces new tokens, so any component built
against the token list above automatically supports both themes with zero
extra code.

To add a new token: define it in both the dark (`:root`) and light
(`@media (prefers-color-scheme: light)`) blocks together, in the same PR --
a token defined in only one block silently falls back to the other theme's
value in the block where it's missing.

## Layout

```
app/
  layout.tsx    # root layout
  page.tsx      # landing page
  globals.css   # design tokens (light + dark)
```

## Routing errors

Unexpected route failures render a visible full-page fallback instead of a
blank screen. The fallback lives in [`app/error.tsx`](./app/error.tsx) and
reuses [`components/RouteError.tsx`](./components/RouteError.tsx) so the
user gets one clear recovery action: retry the route.

## Documentation

- [Client/server component boundary](./docs/client-server-boundary.md) -- when a component needs `"use client"`, with real examples from this repo.
- [How i18n messages are extracted](./docs/i18n-message-extraction.md) -- the manual process for adding user-facing copy (no automated extraction tool).
- [Wallet connection state machine](./docs/wallet-connection-state-machine.md)

## Contributing

See the QuickLendX org for the contribution rules and the FWC26 campaign board. Every PR must reference the issue it closes with `Closes #<n>`.
