import type { NextConfig } from "next";

// Strip port - allowedDevOrigins expects hostnames, not host:port.
const tenantHostname = process.env.NEXT_PUBLIC_TENANT_HOST?.split(":")[0];

// Local custom-domain testing (e.g. learn.acme.test in the hosts file):
// dev-mode hosts outside allowedDevOrigins serve HTML but never hydrate -
// forms silently fall back to native submits. Comma-separated, dev only;
// prod (next start) ignores allowedDevOrigins entirely.
const devCustomDomains = (process.env.DEV_CUSTOM_DOMAINS ?? "")
  .split(",")
  .map((entry) => entry.trim().split(":")[0])
  .filter(Boolean);

const allowedDevOrigins = [
  ...(tenantHostname ? [tenantHostname, `*.${tenantHostname}`] : []),
  ...devCustomDomains,
];

const nextConfig: NextConfig = {
  allowedDevOrigins: allowedDevOrigins.length ? allowedDevOrigins : undefined,
};

export default nextConfig;
