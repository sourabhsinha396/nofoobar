# Testing tenant subdomains locally

The default dev flow uses path-based tenant URLs (`localhost:3000/org/[slug]`) — no DNS or cookie setup needed. This guide covers the production-style alternative (`local.testholic.test:3000`) for when you want to exercise the Next `proxy.ts` rewrite and cross-subdomain session cookies end-to-end.

`testholic.test` is just an example apex used throughout this doc — swap in whatever fake apex you prefer, as long as your hosts file, backend `APEX_DOMAIN`, and `SESSION_COOKIE_DOMAIN` all agree.

## One-time setup

### 1. Hosts file

Map a fake apex and your tenant subdomains to `127.0.0.1`.

- **macOS / Linux:** `sudo $EDITOR /etc/hosts`
- **Windows:** edit `C:\Windows\System32\drivers\etc\hosts` as Administrator

```
127.0.0.1 testholic.test
127.0.0.1 local.testholic.test
```

Add a line per slug — the OS resolver doesn't do wildcards.

### 2. Backend `.env`

```
APEX_DOMAIN=testholic.test
SESSION_COOKIE_DOMAIN=.testholic.test
```

The leading dot scopes the cookie to `testholic.test` and all its subdomains.

Also widen `CORS_ORIGIN_REGEX` to match your apex + every subdomain — without this, client-side forms (signup, login, create-org) posting from `*.testholic.test:3000` to `testholic.test:8000` get blocked by the browser:

```
CORS_ORIGIN_REGEX=^http://([a-z0-9-]+\.)?testholic\.test:3000$
```

One regex covers the apex and every subdomain — no need to extend it per tenant.

Restart so the new settings take effect:

```bash
docker compose restart web
```

### 3. Frontend `.env.local`

```
NEXT_PUBLIC_API_URL=http://testholic.test:8000
NEXT_PUBLIC_TENANT_HOST=testholic.test:3000
NEXT_PUBLIC_TENANT_PROTOCOL=http
```

`NEXT_PUBLIC_API_URL` is the critical one — without it, client-side fetches go to `http://localhost:8000`, and the cookie the backend tries to set with `Domain=.testholic.test` is rejected by the browser (a `localhost` response can't set cookies on a different domain). With it pointing at `testholic.test:8000`, the response host matches the cookie domain and everything flows.

`NEXT_PUBLIC_TENANT_HOST` does three things:
- `tenantUrl()` builds subdomain links (org cards on `/me` point to `http://local.testholic.test:3000` instead of `/org/local`).
- `proxy.ts` knows what apex to treat as non-tenant, so the apex still serves the marketing site instead of being rewritten as a `testholic` "tenant."
- `next.config.ts` adds the host and `*.host` to `allowedDevOrigins`, suppressing Next 15+'s cross-origin dev warning.

Without this var, Next has no idea your dev apex isn't `localhost` — you'll get 404s on apex routes and a dev-origin warning in the console.

### 4. Restart Next dev server

`proxy.ts` only loads at startup. After any change to it — or after setting the env vars above — restart `pnpm dev`.

## Verify

1. Sign in at `http://testholic.test:3000`.
2. Visit `/me`, click an org card (use slug `local` to match your hosts file).
3. You land on `http://local.testholic.test:3000` without re-authenticating; the tenant dashboard renders.

If you bounce to `/login` instead, the session cookie isn't crossing subdomains. Double-check `SESSION_COOKIE_DOMAIN` in the backend `.env` and that you restarted the backend.

## Testing custom domains

The `Organization.custom_domain` lookup path is exercised when the request's `Host` header matches a value stored in that column.

1. Add another hosts entry: `127.0.0.1 learn.acme.test`
2. Via the admin (`/admin`), set an org's `custom_domain` to `learn.acme.test` (host only, no port).
3. Visit `http://learn.acme.test:3000` and confirm the tenant page renders.

Custom domains bypass the `*.testholic.test` subdomain pattern entirely — `learn.acme.test` isn't a subdomain of the apex, so resolution falls through to the `custom_domain` column lookup.
