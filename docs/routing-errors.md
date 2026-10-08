# How routing errors surface to the user

This app splits route-level failures into three surfaces, each owned by a
different layer. The convention below is what the code actually does
today — match it when adding a new failure path rather than inventing a
new one.

## 1. Segment render/throw failures → `app/error.tsx`

`app/error.tsx` is the root error boundary. When a server component
throws while rendering a route — for example `getInvoiceDetail` inside
`app/(app)/dashboard/[invoiceId]/page.tsx` — the exception propagates to
this boundary, which renders `components/RouteError.tsx`:

- `RouteError` shows `role="alert"` with the thrown `error.message` and a
  single "Try again" button wired to Next's `reset()`. Retrying re-renders
  the failed segment, so a transient fetch error recovers without a full
  reload.
- Keep the boundary "client component only" contract: `app/error.tsx`
  must stay `"use client"` and must not itself fetch or import server
  code, or it cannot catch its own subtree's failures.

Nested segments can add their own `error.tsx` to scope a failure to one
part of the shell. Prefer that over try/catch inside page components when
the right user experience is "this route failed, keep the shell".

## 2. Pending routes → `loading.tsx`, not an error surface

`app/(app)/dashboard/loading.tsx` renders `LoadingSkeleton` while a
segment suspends. Skeletons are the *pending* surface — never show a
RouteError or alert text for data that is merely still loading, and never
flash an error state during the initial suspense window.

## 3. Client-hook fetch failures → inline `error` state

Failures inside data hooks (`useNotifications`, `useAlerts`,
`useTransactions`, `useSession`, …) do **not** reach `app/error.tsx` —
they happen after the route has already rendered. The convention is:

- the hook catches the rejection into an `error` state field,
- the component renders that message inline (`role="alert"` where the
  pattern already exists, e.g. `PayoutForm`'s `#payout-address-error`),
- `fetchJson` in `lib/api.ts` is the only fetch boundary and throws a
  labeled `Error` on any non-2xx, so hooks never have to inspect
  `res.ok` themselves.

Correspondingly, `/api/*` route handlers signal failure through HTTP
status codes on plain `NextResponse.json` bodies — the client interprets
the status, it does not parse error payloads.

## What is not customized

- There is no `not-found.tsx` and no `notFound()` callsite: unmatched
  routes get Next's default 404 page.
- There is no `global-error.tsx`: a failure inside the root layout falls
  back to Next's framework default. If one is ever added it must render
  its own `<html>`/`<body>` and reuse `RouteError` for the visible
  surface.
