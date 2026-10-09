/** Per-tab, non-auth correlation identifier for client logs. */
const KEY = "qlx:client-log-session-id";
const VALID = /^log-[a-zA-Z0-9-]{8,80}$/;
let volatileId: string | null = null;

function mintId(): string {
  const value = globalThis.crypto?.randomUUID?.()
    ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `log-${value}`;
}

/** Server logs retain their caller-provided request IDs. Browser logs share
 * one ID per tab until logout clears sessionStorage. Storage failures must
 * never prevent the actual application event from being logged. */
export function clientLogSessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.sessionStorage.getItem(KEY);
    if (stored && VALID.test(stored)) return stored;
    const fresh = mintId();
    window.sessionStorage.setItem(KEY, fresh);
    return fresh;
  } catch {
    volatileId ??= mintId();
    return volatileId;
  }
}
