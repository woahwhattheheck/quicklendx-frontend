import { describe, it, expect } from "vitest";
import { POST } from "./route";

function req(auth?: string) {
  return new Request("http://localhost/api/session/refresh", {
    method: "POST",
    headers: auth ? { authorization: auth } : {},
  });
}

describe("POST /api/session/refresh", () => {
  it("returns the refreshed session contract for a bearer token", async () => {
    const res = await POST(req("Bearer test-refresh-token"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user).toBeNull();
    expect(typeof body.refreshedAt).toBe("string");
    expect(Number.isNaN(Date.parse(body.refreshedAt))).toBe(false);
  });

  it("rejects a missing or malformed bearer token with 401", async () => {
    for (const auth of [undefined, "Basic abc123", "Bearer", "Bearer "]) {
      const res = await POST(req(auth));
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({
        error: "session refresh requires an Authorization bearer token",
      });
    }
  });
});
