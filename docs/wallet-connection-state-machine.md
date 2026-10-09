# Wallet-connection state machine

Audience: contributors implementing wallet login (see `lib/auth.ts`'s
`SessionUser`, which is already shaped around a Stellar public key ahead of
that work landing).

This app authenticates by connecting a Stellar wallet via
[`@stellar/freighter-api`](https://github.com/stellar/freighter-api) — never
by reading `window.freighter` directly, since that bypasses the extension's
own permission and origin checks. The shared app shell now has a client-side wallet-status badge and explicit
connect/disconnect controls implementing these transitions. Disconnect
clears the local display state without revoking Freighter's extension grant.

## States

```
disconnected ──connect()──▶ connecting ──approved──▶ connected
     ▲                          │                        │
     │                          └──rejected/error──▶ error
     │                                                    │
     └────────────────── disconnect() / reset() ──────────┘
```

| State          | Meaning                                                        |
| -------------- | --------------------------------------------------------------- |
| `disconnected` | No wallet session. Initial state, and the target of `disconnect()`. |
| `connecting`   | `@stellar/freighter-api`'s connection request is in flight; awaiting the user's approval in the extension. |
| `connected`    | Freighter returned a public key. This is the only state that carries `{ publicKey: string }`. |
| `error`        | The user rejected the request, Freighter isn't installed, or the API call threw. Carries a message for display. |

## Transitions

- `disconnected → connecting`: user clicks "Connect wallet"; call the
  Freighter API's connection request.
- `connecting → connected`: the API resolves with a public key.
- `connecting → error`: the API rejects (user declined) or throws (no
  extension installed, wrong network).
- `error → connecting`: user retries.
- `connected → disconnected`: user explicitly disconnects. There is no
  programmatic "revoke" — Freighter, not this app, owns that grant.

## Implementation notes for whoever builds this

- Model it as a discriminated union, not independent booleans, so an
  invalid combination (e.g. "connected" with no `publicKey`) is
  unrepresentable:

  ```ts
  type WalletState =
    | { status: "disconnected" }
    | { status: "connecting" }
    | { status: "connected"; publicKey: string }
    | { status: "error"; message: string };
  ```

- Every state read/written to `SessionUser` (`lib/auth.ts`) goes through
  the `/api/auth/session` contract already in place — this state machine
  is the client-side connection flow that eventually produces the
  `publicKey` used to establish that session, not a replacement for it.
- Log transitions with `lib/logger.ts` at `"info"` — never log the public
  key itself alongside anything that could tie it to other PII; the
  public key is safe to log on its own since it's meant to be public.

## Out of scope for this document

Backend session issuance, persistence and extension grant revocation are not
provided by the local wallet-status control. A disconnected pill must never
be presented as proof that an extension permission has been revoked.
