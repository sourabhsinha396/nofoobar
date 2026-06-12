# Custom domains — Caddy on-demand TLS

How tenant custom domains (e.g. `fastapitutorial.com`) get HTTPS and reach the
app. Platform domains (`nofoobar.com`, `*.nofoobar.com`) are unaffected — they
keep flowing through the existing Cloudflare tunnel.

## How it works

```
tenant's DNS                    your server
─────────────                   ───────────────────────────────────────────
learn.acme.com ──CNAME──▶ domains.nofoobar.com ──▶ Caddy :443
                                                     │  on_demand_tls
                                                     │  "ask" ──▶ backend :8000
                                                     │            /api/v1/domains/check
                                                     ▼
                                                   Next.js :3000
                                                     │  proxy.ts resolves host → org slug,
                                                     ▼  rewrites to /org/<slug>/...
                                                   backend :8000 (via /api/v1 route handler)
```

1. A tenant points their domain at the server (CNAME to `domains.nofoobar.com`,
   or an A record for apex domains).
2. First HTTPS request for an unknown hostname: Caddy asks the backend
   `GET /api/v1/domains/check?domain=learn.acme.com`. **200** → Caddy obtains a
   Let's Encrypt certificate on the spot and serves the request; anything else →
   refused. The check passes when an `Organization.custom_domain` matches, so
   only domains actually registered to a tenant ever get certificates — this is
   the guard against strangers burning ACME rate limits through the server.
3. Caddy reverse-proxies to the Next.js server on `:3000`, preserving the
   `Host` header. From there the normal custom-domain flow applies
   (`proxy.ts` → `resolveCustomDomain` → `/org/<slug>` rewrite).

## Server setup (once)

### 1. DNS target for tenants

Create `domains.nofoobar.com` as an **A record to the server IP, DNS-only
(grey cloud — not proxied)**. Proxied would route tenants through Cloudflare,
which has no certificates for *their* domains. This record exists purely as a
stable CNAME target so tenant instructions never contain a raw IP.

### 2. Open ports

Caddy needs 80 (ACME HTTP-01 challenge) and 443 from the internet. The
Cloudflare tunnel keeps running alongside — it makes outbound connections only
and doesn't bind these ports.

### 3. Install Caddy

Debian/Ubuntu: follow the official apt instructions at
<https://caddyserver.com/docs/install#debian-ubuntu-raspbian>, then:

### 4. Caddyfile

`/etc/caddy/Caddyfile`:

```caddyfile
{
    # Refuse certificates for domains the backend doesn't recognize.
    on_demand_tls {
        ask http://127.0.0.1:8000/api/v1/domains/check
    }
    email <YOUR-OPS-EMAIL>
}

# Catch-all HTTPS site: any hostname that passed the "ask" check.
https:// {
    tls {
        on_demand
    }
    reverse_proxy 127.0.0.1:3000
}
```

```bash
sudo systemctl reload caddy
```

Caddy appends `?domain=<hostname>` to the ask URL itself. The `Host` header is
preserved by `reverse_proxy` by default, and Caddy sets `X-Forwarded-Proto`,
which the app can use to mark cookies `Secure` later.

## Per-tenant flow (manual until the settings UI ships)

1. Superadmin: set the org's `custom_domain` (host only, no scheme/port — e.g.
   `fastapitutorial.com`).
2. Tenant adds DNS at their provider:
   - subdomain (`learn.acme.com`): `CNAME → domains.nofoobar.com`
   - apex (`acme.com`): `A → <server IP>` (or ALIAS/ANAME where supported)
3. First visit after DNS propagates: certificate is issued automatically
   (a few seconds). No restart, no config change — the resolver cache in the
   frontend picks up new domains within ~15 s.

## Verifying

```bash
# Should be 200 + {"domain": ..., "slug": ...} for a registered domain:
curl -s "http://127.0.0.1:8000/api/v1/domains/check?domain=fastapitutorial.com"

# Should be 404 (and Caddy will refuse a cert):
curl -s "http://127.0.0.1:8000/api/v1/domains/check?domain=random-stranger.com"
```

## Trade-offs / future

- Tenant-domain traffic bypasses Cloudflare: no CDN/WAF on those hosts, and
  the server IP is visible in tenant DNS. Acceptable for now; revisit if abuse
  shows up (separate edge box, or per-tenant choice of managed proxying).
- `www.` and the apex are separate hostnames — a tenant who wants both must
  (for now) pick one as `custom_domain`; redirecting the other is future work
  for the `custom_domains` table + settings UI.
- The Let's Encrypt account email in the Caddyfile receives expiry warnings —
  use a monitored inbox.
