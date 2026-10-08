import { NextResponse } from "next/server";
import type { RefreshSessionResponse } from "@/lib/auth";

/** Re-validates a session presented via `Authorization: Bearer <token>` and
 * returns the current session state. No real session store exists yet (auth
 * lands with wallet-based login later), so a well-formed bearer token always
 * resolves to the signed-out contract -- this gives the client a real
 * endpoint and stable response shape to build and test against. */
export async function POST(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  if (!/^Bearer\s+\S+\s*$/i.test(authorization)) {
    return NextResponse.json(
      { error: "session refresh requires an Authorization bearer token" },
      { status: 401 },
    );
  }

  const body: RefreshSessionResponse = {
    user: null,
    refreshedAt: new Date().toISOString(),
  };
  return NextResponse.json(body);
}
