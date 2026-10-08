import { describe, it, expect, vi, afterEach } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("config", () => {
  it("returns the SENTRY_DSN value when the env var is set", async () => {
    vi.stubEnv("SENTRY_DSN", "https://key@o123.ingest.sentry.io/456");
    vi.resetModules();
    const { default: config } = await import("./config");
    expect(config.sentryDsn).toBe("https://key@o123.ingest.sentry.io/456");
  });

  it("defaults to an empty string when SENTRY_DSN is unset", async () => {
    vi.stubEnv("SENTRY_DSN", undefined);
    vi.resetModules();
    const { default: config } = await import("./config");
    expect(config.sentryDsn).toBe("");
  });

  it("returns the STELLAR_NETWORK value when set to a recognized network", async () => {
    vi.stubEnv("STELLAR_NETWORK", "mainnet");
    vi.resetModules();
    const { default: config } = await import("./config");
    expect(config.stellarNetwork).toBe("mainnet");
  });

  it("defaults stellarNetwork to testnet when STELLAR_NETWORK is unset", async () => {
    vi.stubEnv("STELLAR_NETWORK", undefined);
    vi.resetModules();
    const { default: config } = await import("./config");
    expect(config.stellarNetwork).toBe("testnet");
  });

  it("defaults stellarNetwork to testnet when STELLAR_NETWORK is unrecognized", async () => {
    vi.stubEnv("STELLAR_NETWORK", "devnet");
    vi.resetModules();
    const { default: config } = await import("./config");
    expect(config.stellarNetwork).toBe("testnet");
  });

  it("defaults toastAutoDismissMs to 5000 when the env var is unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_TOAST_AUTO_DISMISS_MS", undefined);
    vi.resetModules();
    const { default: config } = await import("./config");
    expect(config.toastAutoDismissMs).toBe(5000);
  });

  it("reads toastAutoDismissMs from NEXT_PUBLIC_TOAST_AUTO_DISMISS_MS", async () => {
    vi.stubEnv("NEXT_PUBLIC_TOAST_AUTO_DISMISS_MS", "8000");
    vi.resetModules();
    const { default: config } = await import("./config");
    expect(config.toastAutoDismissMs).toBe(8000);
  });

  it("falls back to the default when the env var is not a positive number", async () => {
    for (const bad of ["abc", "0", "-250", ""]) {
      vi.stubEnv("NEXT_PUBLIC_TOAST_AUTO_DISMISS_MS", bad);
      vi.resetModules();
      const { default: config } = await import("./config");
      expect(config.toastAutoDismissMs).toBe(5000);
    }
  });
});
