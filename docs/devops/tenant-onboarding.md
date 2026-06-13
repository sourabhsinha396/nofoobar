# Tenant onboarding — new organization + custom domain

How a course creator goes from nothing to a live, white-labeled school on
their own domain. Written for the creator; the [Platform prerequisites](#platform-prerequisites-operator)
section at the end is for whoever runs the platform.

Throughout, `nofoobar.com` is the platform apex — substitute your own if
self-hosting.

---

## 1. Create your account

1. Go to `https://nofoobar.com/signup` and register.
2. You'll land on `https://nofoobar.com/me` — your account home.

## 2. Create your organization

1. On `/me`, click **Create organization**.
2. Pick a **name** (shown to your students) and a **slug** (lowercase,
   letters/numbers/hyphens).

The slug becomes your school's address immediately:

```
https://<slug>.nofoobar.com
```

No DNS, no waiting — the subdomain works the moment the org exists. You are
the **owner**; only owners can change org settings.

> Choose the slug carefully. It's your permanent platform address and shows
> up in your admin URLs.

## 3. Set up your school

All admin lives at `https://<slug>.nofoobar.com/admin`:

| Where | What |
|---|---|
| `/admin/settings` | Name, tagline, description, logo, contact email, social links |
| `/admin/homepage` | Homepage blocks: hero, stats, featured courses, testimonials, FAQs |
| `/admin/courses` | Create courses → sections → lessons (article, video, lab, quiz) |
| `/admin/pages` | Terms, privacy, refund, contact, custom pages |
| `/admin/nav-links` | Extra header/footer links |
| `/admin/payments` | Connect Stripe or Razorpay to sell paid courses |

Publish at least one course before inviting students — an empty school is a
confusing first impression.

You log in once at `nofoobar.com` and you're signed in across every
`*.nofoobar.com` subdomain, including your admin.

## 4. Connect your custom domain

Your school can also live on a domain you own — students see only your
brand.

### 4a. Register the domain in settings

1. Open `https://<slug>.nofoobar.com/admin/settings` → **Custom domain**.
2. Enter the bare hostname — no `https://`, no paths, no port:
   - subdomain style: `learn.yourdomain.com`
   - apex style: `yourdomain.com`
3. **Save.** The status panel below the field will show *"Not connected
   yet"* with the exact DNS records to add — that's expected.

Rules enforced on save:
- One custom domain per organization.
- A domain already connected to another org is rejected.
- Platform hostnames (`nofoobar.com` or anything under it) are rejected —
  your subdomain already works automatically.

### 4b. Add the DNS record at your domain provider

At wherever your domain's DNS is managed (your registrar, Cloudflare, etc.):

| Your domain | Record to add |
|---|---|
| Subdomain (`learn.yourdomain.com`) | `CNAME learn → domains.nofoobar.com` |
| Apex (`yourdomain.com`) | `A @ → <the IP shown in the status panel>` |

Two provider-specific notes:

- **If your DNS is on Cloudflare:** set the record to **DNS only (grey
  cloud)**, not Proxied. Proxied routes traffic into Cloudflare's network,
  which has no certificate for your domain on this platform.
- **Keep your MX/TXT records untouched** — connecting the domain only
  changes where the website points; your email keeps working.

### 4c. Verify and go live

1. Back in **Settings → Custom domain**, click **Check again**. DNS changes
   usually propagate in minutes; the panel shows what your domain currently
   resolves to while you wait.
2. When it turns green (**Connected**), open `https://yourdomain.com`.
3. The very first visit takes a few extra seconds — the platform issues a
   TLS certificate for your domain on the spot (via Let's Encrypt). Every
   visit after that is instant. Renewal is automatic; there is nothing to
   maintain.

### What changes on a custom domain

- Students browse, sign up, and log in **on your domain** — they never see
  the platform's name or address.
- Sessions are independent: logging in on `yourdomain.com` is separate from
  any `nofoobar.com` login. (Your shared platform login still works across
  all `*.nofoobar.com` hosts.)
- URLs are clean: `yourdomain.com/courses`, `yourdomain.com/login`, etc.
- `www.yourdomain.com` is a **separate hostname** and is not covered yet —
  pick the apex or a subdomain as your canonical address, and (optionally)
  add a redirect for the other at your DNS provider.

### Switching or removing the domain

Settings → Custom domain → clear the field (or enter a new one) → Save.
Your `<slug>.nofoobar.com` address always keeps working regardless.

## 5. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Status panel: "does not resolve yet" | DNS not propagated | Wait a few minutes, **Check again** |
| Status panel: "resolves, but not to this platform" | Record points elsewhere | Compare "currently resolves to" with the expected IP; fix the record |
| Browser: too many redirects | Your browser cached a redirect from whatever the domain served before | Clear cached files (last hour) or test in a private window |
| Browser: certificate error on first visit | Cert still minting, or domain not saved in settings | Confirm step 4a saved, wait ~30 s, retry |
| Site loads but shows a 404 | Domain not registered to your org | Re-save in Settings, wait ~15 s, reload |
| Works on `<slug>.nofoobar.com` but not the custom domain | DNS or registration issue | Walk 4a → 4c again; the status panel pinpoints which half is wrong |

---

## Platform prerequisites (operator)

Everything above assumes the platform is configured per
[custom-domains-caddy.md](custom-domains-caddy.md):

- Caddy on ports 80/443 with `on_demand_tls` asking
  `GET /api/v1/domains/check`.
- `domains.<apex>` exists as a DNS-only A record on the server IP.
- Backend env: `APEX_DOMAIN`, `DOMAINS_CNAME_TARGET=domains.<apex>`.
- Frontend env: `NEXT_PUBLIC_TENANT_HOST=<apex>`,
  `API_INTERNAL_URL=http://127.0.0.1:8000`.

No per-tenant operator action is required — that's the point.
