import type { NextRequest } from "next/server";

import { INTERNAL_API_URL } from "@/lib/api-internal";
import { rewriteSetCookieForHost } from "@/lib/proxy-cookies";

// Same-origin API proxy: the browser only ever talks to the domain in its
// address bar; every /api/v1/* request is forwarded to the backend over the
// internal URL. This makes session cookies first-party on every host -
// platform subdomains and tenant custom domains alike - and removes CORS
// from the picture entirely.

// Dropped from the forwarded request: host (the upstream URL sets its own),
// content-length (recomputed for the streamed body), accept-encoding (fetch
// negotiates and transparently decompresses), connection (hop-by-hop).
const DROP_REQUEST_HEADERS = new Set([
  "host",
  "connection",
  "content-length",
  "accept-encoding",
]);

// Dropped from the backend response: content-encoding/length no longer match
// the decompressed body; set-cookie is re-added after domain rewriting.
const DROP_RESPONSE_HEADERS = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "transfer-encoding",
  "set-cookie",
]);

async function proxy(request: NextRequest): Promise<Response> {
  const upstreamUrl = new URL(
    request.nextUrl.pathname + request.nextUrl.search,
    INTERNAL_API_URL,
  );

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!DROP_REQUEST_HEADERS.has(key)) {
      headers.set(key, value);
    }
  });
  const host = request.headers.get("host") ?? "";
  // The backend resolves the tenant from the visitor's original host when no
  // explicit X-Tenant-Slug header is present (see backend _resolve_tenant).
  headers.set("x-forwarded-host", host);

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const response = await fetch(upstreamUrl, {
    method: request.method,
    headers,
    body: hasBody ? request.body : undefined,
    // Required by Node's fetch (undici) when streaming a request body.
    // @ts-expect-error -- duplex is not in the TS RequestInit type yet
    duplex: hasBody ? "half" : undefined,
    redirect: "manual",
    cache: "no-store",
  });

  const responseHeaders = new Headers();
  response.headers.forEach((value, key) => {
    if (!DROP_RESPONSE_HEADERS.has(key)) {
      responseHeaders.set(key, value);
    }
  });
  for (const cookie of response.headers.getSetCookie()) {
    responseHeaders.append("set-cookie", rewriteSetCookieForHost(cookie, host));
  }

  return new Response(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
}

export {
  proxy as GET,
  proxy as POST,
  proxy as PUT,
  proxy as PATCH,
  proxy as DELETE,
  proxy as HEAD,
  proxy as OPTIONS,
};
