// Browser-side client: paths are relative, so requests go to the current
// origin and are proxied to the backend by app/api/v1/[...path]/route.ts.
// This keeps cookies first-party on every host (subdomains, custom domains).
const API_URL = "";

export class ApiError extends Error {
  status: number;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
  }
}

export interface RequestOptions {
  headers?: Record<string, string>;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options?: RequestOptions,
): Promise<T> {
  const headers: Record<string, string> = { ...(options?.headers ?? {}) };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  const response = await fetch(`${API_URL}${path}`, {
    method,
    credentials: "include",
    headers: Object.keys(headers).length ? headers : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({ detail: `HTTP ${response.status}` }));
    throw new ApiError(response.status, data.detail ?? `HTTP ${response.status}`);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export const apiGet = <T>(path: string, options?: RequestOptions): Promise<T> =>
  request<T>("GET", path, undefined, options);
export const apiPost = <T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> =>
  request<T>("POST", path, body, options);
export const apiPut = <T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> =>
  request<T>("PUT", path, body, options);
export const apiPatch = <T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> =>
  request<T>("PATCH", path, body, options);
export const apiDelete = <T>(path: string, options?: RequestOptions): Promise<T> =>
  request<T>("DELETE", path, undefined, options);
