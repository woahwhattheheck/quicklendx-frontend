# Query-cache invalidation strategy

The data hooks in `lib/hooks/` do not use a shared query cache (no
React Query / SWR layer is mounted). Each hook owns its freshness policy,
and "invalidation" means exactly one of the four mechanisms below —
chosen per resource by how stale the data may safely be.

## The four mechanisms

### 1. Fetch-on-mount with a `cancelled` guard (default)

`useTransactions`, `useNotifications`, `useAlerts`, `useHealthDeep` and the
other plain hooks re-request on every mount. A `cancelled` flag in the
effect cleanup prevents a late response from setting state on an
unmounted component; it does **not** dedupe or cache — remounting a route
always pays a fresh round trip, which is correct for frequently-changing
data (notifications, alerts, transaction lists).

### 2. Module-level memoization for page-lifetime-stable data

`useSession` caches its resolved value in a module-scoped `cached`
variable. Every route under `app/(app)/layout.tsx` remounts its
components on navigation; without the memo each route change would re-pay
the loading pass even though the session cannot have changed. Three
explicit invalidation points exist, and only these:

- `logout()` — clears `cached` plus every `sessionStorage`/`localStorage`
  key, so a shared/kiosk device cannot leak one user's session into the
  next.
- `__resetSessionCacheForTests()` — test-only reset between cases.
- A transient fetch failure is deliberately **not** cached, so the next
  mount retries instead of sticking on a stale error.

### 3. Single-use prefetch cache for cursor pagination

`useInvoiceList` keeps a per-component `pageCache: Map<cursor, Promise>`
that only `prefetchNext()` writes (e.g. on hover over "Next") and the
main effect consumes-and-evicts — a prefetched page resolves at most one
`loadMore()`, then the entry is deleted. Entries are never revalidated:
once fetched, a page is treated as immutable for the mount's lifetime.
Nothing crosses mounts: the `ref`-backed map dies with the component.

### 4. Route-handler responses carry no client cache contract

The `/api/*` handlers (`app/api/`) return plain `NextResponse.json` with
no cache headers; hooks treat every response as point-in-time. When an
endpoint later grows freshness semantics (e.g. `ETag`, `max-age`), the
hook that consumes it — not the fetch boundary `lib/api.ts#fetchJson`,
which stays a thin "throw on non-2xx" wrapper — owns the policy.

## Rules of thumb for new code

- Default to mechanism 1. Add caching only where remounts are proven
  wasteful (`useSession`) or where a prefetch measurably helps perceived
  latency (`useInvoiceList`).
- A cache entry that outlives its consumer's mount needs an explicit
  invalidation path documented in the hook's docstring — as
  `useSession`'s `logout()` does. Unbounded module-level caches without
  an invalidation path are not acceptable: they silently serve stale
  session-scoped data to the next user on a shared device.
- Never cache a failed request as if it succeeded; transient failure must
  leave the cache empty so the next mount retries.
