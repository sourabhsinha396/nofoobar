import type { NextConfig } from "next";

// Strip port — allowedDevOrigins expects hostnames, not host:port.
const tenantHostname = process.env.NEXT_PUBLIC_TENANT_HOST?.split(":")[0];

const nextConfig: NextConfig = {
  allowedDevOrigins: tenantHostname ? [tenantHostname, `*.${tenantHostname}`] : undefined,
};

export default nextConfig;
