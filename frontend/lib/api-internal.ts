// Server-only base URL for talking to the FastAPI backend directly
// (Next server → backend, typically over localhost in prod). Browser code
// must NOT use this - it calls relative `/api/v1/*` paths on the current
// origin, which the route handler in app/api/v1/[...path] proxies here.
// Falls back to NEXT_PUBLIC_API_URL so existing dev setups keep working.
export const INTERNAL_API_URL =
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8000";
