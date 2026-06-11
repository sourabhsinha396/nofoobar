# Object storage — Cloudflare R2

Tenant-uploaded images (course logos, later: lesson covers, org logos) live in an S3-compatible bucket. Nofoobar uses Cloudflare R2 in practice — no egress fees and the API is S3-compatible — but the backend code in `app/services/storage/s3.py` talks plain boto3, so any S3-compatible provider (AWS S3, Backblaze B2, MinIO, Wasabi, …) works by swapping env vars.

**Upload architecture: server-proxied.** The browser POSTs `multipart/form-data` to `POST /api/v1/uploads/image`; the FastAPI backend validates the file (extension, size, role) and pushes the bytes to R2 via boto3. No browser ↔ R2 calls, no CORS configuration needed on the bucket. Trade-off: image bytes flow through the FastAPI process. Fine for logos (≤2 MB); revisit if/when video uploads land.

If the env vars aren't set, the backend returns `503` on the upload endpoint and the frontend `<LogoUploader>` automatically falls back to URL-paste mode. You can ship without configuring storage; tenants just have to host their own images elsewhere.

## What you need

Five environment variables in `backend/.env`:

```
S3_ENDPOINT_URL=https://<account>.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=<token-access-key>
S3_SECRET_ACCESS_KEY=<token-secret>
S3_BUCKET=<bucket-name>
S3_PUBLIC_URL_BASE=https://pub-<hash>.r2.dev    # or a custom domain
```

Restart the backend after editing `.env`:

```bash
docker compose restart web
```

## Cloudflare R2 setup

### 1. Create the bucket

R2 dashboard → **R2 Object Storage** → **Create bucket**. Pick a name (e.g. `nofoobar-uploads-prod`). Default region is fine.

### 2. Create an API token

R2 dashboard → **Manage R2 API Tokens** → **Create API token**.

- Permission: **Object Read & Write**
- Bucket: **Apply to specific buckets only** → select the bucket from step 1
- TTL: leave indefinite (rotate manually)

Copy the **Access Key ID** and **Secret Access Key** — you only see the secret once.

The **S3 API endpoint** shown on the success screen is your `S3_ENDPOINT_URL`. It looks like `https://<32-char-hash>.r2.cloudflarestorage.com`.

### 3. Enable public read access

The bucket needs to be readable on the public internet so the browser can render uploaded images. Two options:

**Option A — R2.dev subdomain (fast, dev/staging):**

Bucket settings → **Public access → R2.dev subdomain** → **Allow access**. Cloudflare gives you a URL like `https://pub-<hash>.r2.dev`. Use that as `S3_PUBLIC_URL_BASE`.

**Option B — Custom domain (production):**

Bucket settings → **Public access → Custom domains** → **Connect domain**. Point a subdomain (e.g. `cdn.your-tenant.com`) at the bucket. Cloudflare provisions a cert. Use `https://cdn.your-tenant.com` as `S3_PUBLIC_URL_BASE`.

Custom domains are required for production — the `r2.dev` URLs are rate-limited and explicitly not meant for production traffic.

### 4. CORS — not required

Because uploads are server-proxied (browser → FastAPI → R2), the browser never talks directly to the bucket. No CORS policy is needed on the bucket for uploads.

GET requests for serving images (e.g. `<img src="https://cdn.your-tenant.com/...">`) are "simple" requests and don't trigger preflight, so you also don't need CORS for read traffic in the default setup.

If you later switch to browser-direct uploads with presigned URLs (see "Switching to presigned uploads" below), you'll need to add a CORS policy on the bucket then.

### 5. Lifecycle policy (optional but recommended)

Uploads use opaque UUID keys under a typed path: `uploads/images/<purpose>/<org_id>/<uuid>.<ext>`. The `<purpose>` segment is one of `organization_logo`, `course_logo`, `tiptap_inline` (see `s3.ImagePurpose`). The leading `uploads/images/` is mandatory so future file types (docs, scripts) get their own sibling namespaces (`uploads/docs/…`, `uploads/scripts/…`) without polluting images. When a creator replaces a logo, the old object becomes an orphan — nothing references it but it still costs storage. R2 storage is cheap, but a lifecycle rule keeps the bucket tidy.

Bucket settings → **Object lifecycle rules** → **Create rule**:

- Prefix: `uploads/` (covers all upload types) or scope to a single type (e.g. `uploads/images/`)
- Action: **Abort multipart uploads** after 1 day (catches failed uploads)

Hard-deleting orphaned objects is harder — we don't track which URLs are referenced. The cleanup would need a job that joins R2 keys against `courses.logo_url` (and any future image columns) and deletes the difference. Not implemented; flag for the future.

## Backend env vars in detail

| Variable | Purpose | Example |
|---|---|---|
| `S3_ENDPOINT_URL` | The S3-compatible API endpoint. Account-scoped on R2. | `https://abc123.r2.cloudflarestorage.com` |
| `S3_ACCESS_KEY_ID` | API token access key from step 2. | `0123456789abcdef…` |
| `S3_SECRET_ACCESS_KEY` | API token secret from step 2. | `0123…` |
| `S3_BUCKET` | Bucket name (case-sensitive). | `nofoobar-uploads-prod` |
| `S3_PUBLIC_URL_BASE` | Public URL prefix written into `courses.logo_url`. No trailing slash needed. | `https://cdn.your-tenant.com` |

All five must be set. If any is empty, `s3.is_configured()` returns `False` and the upload endpoint short-circuits to 503.

## Local dev

Three reasonable workflows:

**No object storage at all.** Leave the `S3_*` env vars unset. The uploader UI renders but switches to URL-paste mode on the first attempt. Use this when you don't care about exercising the upload path.

**Real R2 dev bucket.** Create a separate bucket (`nofoobar-uploads-dev`), generate dev-only tokens, point your local `backend/.env` at it. Exercises the full pipeline; uploaded files are real and persistent.

**MinIO via docker-compose.** Add a MinIO service to `backend/docker-compose.yml`, then point `S3_ENDPOINT_URL` at `http://minio:9000`. Fully offline, slightly more friction. Not currently scripted — pull it in if `r2.dev` URLs become a blocker.

## Switching providers

The boto3 client uses `signature_version="s3v4"` + `addressing_style="path"` and never sets `region_name`. That combination works on every S3-compatible service tested. To switch to AWS S3:

- `S3_ENDPOINT_URL=https://s3.us-east-1.amazonaws.com` (or omit; boto3 auto-derives from region)
- Set `S3_REGION` if/when we add it — not currently a settings field

To switch to MinIO or Backblaze B2: just swap the four other env vars. No code changes.

## Security notes

- **R2 credentials never leave the backend.** The frontend POSTs the file to FastAPI; only FastAPI has the `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY`. No signing happens in the browser.
- **Server-side extension validation.** `app/services/storage/s3.ALLOWED_EXTS` is the source of truth. Anything else returns 422 before the bytes touch R2.
- **Object key is server-picked.** Format: `uploads/images/<purpose>/<org_id>/<uuid>.<ext>` where `<purpose>` is constrained to a backend `Literal` allowlist. The client picks the `purpose` but cannot choose the `<org_id>` (taken from the authenticated membership) or the `<uuid>` (server-generated). No overwriting another tenant's path, no `../` escapes.
- **2 MB hard cap.** Enforced server-side on the request body length. Client-side pre-check is a UX nicety, not a security gate.
- **No server-side anti-virus or image-content validation.** Treat tenant-uploaded images as untrusted bytes; serve them on a separate origin (`S3_PUBLIC_URL_BASE`) so they can't read cookies on your app domain. Cloudflare's default R2 + custom-domain setup does this naturally.
- **Bucket is enumerable with credentials.** Object keys are random UUIDs, so unauthenticated guessing is impractical, but anyone holding R2 API tokens can list everything. Don't store anything sensitive — these are public images by design.

## Switching to presigned uploads

If you ever need to bypass the FastAPI process — large file uploads, high upload rate, or simply to save bandwidth on the backend — flip the architecture to browser-direct presigned PUTs:

1. Restore `app/services/storage/s3.presign_put(key, content_type)` (lives in git history before B.4).
2. Change `POST /api/v1/uploads/image` to accept a `{filename}` JSON body, return `{upload_url, public_url, content_type, max_bytes}` (the original B.1 shape).
3. Change the frontend `LogoUploader` to do the two-step: POST → PUT.
4. Add the CORS policy from "section 4 before B.4" to the bucket:

```json
[
  {
    "AllowedOrigins": [
      "http://*.testholic.test:3000",
      "https://your-apex.com",
      "https://*.your-apex.com"
    ],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

For our current scope (≤2 MB logos, low volume) server-proxied wins on simplicity. Revisit when video or larger assets appear.
