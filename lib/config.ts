export type StellarNetwork = "testnet" | "mainnet";

/**
 * Feature flags, keyed by name and backed by a `NEXT_PUBLIC_FEATURE_*` env
 * var -- not hardcoded in source, so flipping one never requires a code
 * change of the flag's own definition, only of the environment it's read
 * from. Add a new flag by adding its key here and to
 * {@link FEATURE_FLAG_ENV_KEYS} below.
 */
export type FeatureFlags = {
  newDashboardLayout: boolean;
};

export const FEATURE_FLAG_ENV_KEYS: Record<keyof FeatureFlags, string> = {
  newDashboardLayout: "NEXT_PUBLIC_FEATURE_NEW_DASHBOARD_LAYOUT",
};

export type Config = {
  sentryDsn: string;
  stellarNetwork: StellarNetwork;
  sorobanRpcUrl: string;
  featureFlags: FeatureFlags;
};

const DEFAULT_STELLAR_NETWORK: StellarNetwork = "testnet";

/** Sane default first, environment override second -- an unset or
 * unrecognized `STELLAR_NETWORK` value falls back to testnet rather than
 * silently pointing the client at mainnet. */
function readStellarNetwork(): StellarNetwork {
  const raw = process.env.STELLAR_NETWORK;
  return raw === "mainnet" || raw === "testnet" ? raw : DEFAULT_STELLAR_NETWORK;
}

/** Public Soroban RPC endpoint per network, used when `SOROBAN_RPC_URL`
 * is unset or invalid. The default tracks `stellarNetwork` so a mainnet
 * deployment can never silently read testnet state. */
const DEFAULT_SOROBAN_RPC_URLS: Record<StellarNetwork, string> = {
  testnet: "https://soroban-testnet.stellar.org",
  mainnet: "https://mainnet.sorobanrpc.com",
};

/** Env override wins only when it parses as an http(s) URL -- unset,
 * empty, malformed, or non-http(s) values fall back to the configured
 * network's public endpoint rather than failing closed at read time or
 * handing a bad URL to the RPC client. The env value is passed through
 * verbatim once validated. */
function readSorobanRpcUrl(network: StellarNetwork): string {
  const raw = process.env.SOROBAN_RPC_URL;
  if (raw) {
    try {
      const parsed = new URL(raw);
      if (parsed.protocol === "https:" || parsed.protocol === "http:") {
        return raw;
      }
    } catch {
      // fall through to the network default
    }
  }
  return DEFAULT_SOROBAN_RPC_URLS[network];
}

/** A flag is enabled only for the exact string `"true"` -- unset, empty,
 * or any other value defaults closed, so a new flag never needs every
 * environment to explicitly opt out. */
function readFeatureFlags(): FeatureFlags {
  return {
    newDashboardLayout: process.env[FEATURE_FLAG_ENV_KEYS.newDashboardLayout] === "true",
  };
}

const stellarNetwork = readStellarNetwork();

const config: Config = {
  sentryDsn: process.env.SENTRY_DSN ?? "",
  stellarNetwork,
  sorobanRpcUrl: readSorobanRpcUrl(stellarNetwork),
  featureFlags: readFeatureFlags(),
};

export default config;
