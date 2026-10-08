/** A signed-in user, identified by their Stellar public key (obtained via
 * @stellar/freighter-api once wallet login lands -- never read from
 * `window.freighter` directly). */
export interface SessionUser {
  publicKey: string;
}

export interface SessionResponse {
  user: SessionUser | null;
}

/** Returned by `POST /api/session/refresh`: the current session plus the
 * time it was last checked, so clients can detect a stale local copy. */
export interface RefreshSessionResponse extends SessionResponse {
  refreshedAt: string;
}
