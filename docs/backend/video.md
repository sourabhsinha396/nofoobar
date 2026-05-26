# Video uploads

How algoholic handles creator-uploaded video. Provider-agnostic by design: Mux is the first integration, but the architecture must let us swap to Bunny, Cloudflare Stream, or any other direct-upload-capable provider without schema or API changes leaking through.

## The constraint

A multi-tenant LMS uploading video has three problems that pull in different directions:

1. **Cost** — encoding, storage, and egress are the dominant infra cost. Bytes must skip our servers (no egress through us) and must be deletable when no longer referenced.
2. **Audit** — for every byte a provider stores on our behalf, we must know the owning org, the upload time, and whether it's attached to live content. Without this we can't bill tenants, can't honor deletion, can't reconcile provider state with ours.
3. **Portability** — providers change pricing, get acquired, go down. We must be able to migrate without rewriting lesson schemas or editor UI.

## Architecture

**Bytes go direct to the provider. Metadata lives in our DB. Provider details sit behind an adapter. Status updates come from polling, not webhooks.**

```
Browser ──upload bytes──▶ Provider (Mux / Bunny / Cloudflare)
   ▲      │                   ▲
   │      │ 1. request URL    │ 4. fetch_asset() poll while pending
   │      ▼                   │
   └────── Our API ───────────┘
              │
              ▼
          Our DB (asset rows, org_id, lesson_id, status)
```

Browser never touches a provider API directly. Our API mints the upload URL via the active provider adapter, persists a row capturing ownership *before* returning. While the asset transcodes, the frontend polls `GET /api/v1/video_assets/{id}` on a 2–5s cadence; that endpoint calls the adapter's `fetch_asset()` and reflects current state back, also updating the DB row when status transitions.

### Why polling, not webhooks?

Webhooks scale better and are lower-latency, but they cost a lot in developer ergonomics:

- **Local development needs a public tunnel** (ngrok or similar) — every dev gets a different URL, has to re-register with the provider, and the tunnel often drops mid-debug.
- **Each environment (dev, staging, prod) needs its own webhook endpoint registered with the provider** — extra config, extra failure modes when configs drift.
- **Signature verification is security-critical and easy to subtly break** — wrong header casing, wrong canonicalization, replay-window bugs.
- **"What if the webhook is lost?" is a real question** that forces you to build a polling fallback anyway.

For an early-stage LMS with at most thousands of in-flight uploads, the extra API calls from polling for a few minutes per upload are negligible. When scale justifies it (millions of assets, latency SLOs), webhooks can be added without rewriting the storage shape — the adapter contract already exposes `fetch_asset`, which is the same call the webhook handler would make.

## Data model

A new SQLModel table — `video_assets` — captures one row per asset the provider holds for us. It follows the conventions used by `Course`, `OrgPaymentAccount`, and friends in `app/db/models/`: inherits `TimestampedModel`, UUID primary key, `org_id` FK with index, `StrEnum` columns wired via `SAEnum(..., name=..., values_callable=...)`.

Lives at `app/db/models/video_asset.py`. Migration is the next sequential number after `016_add_course_metadata.py` (i.e. `017_create_video_assets.py`).

| Column                  | Type                       | Purpose                                                                                |
| ----------------------- | -------------------------- | -------------------------------------------------------------------------------------- |
| `id`                    | UUID PK                    | Internal handle. Stable across provider migrations — this is what `Lesson` references. |
| `org_id`                | UUID FK → organizations.id | Tenancy. Every query filters on this.                                                  |
| `provider`              | `VideoProvider` (StrEnum)  | `mux`, `bunny`, `cloudflare`, ... Identifies which adapter owns the row.               |
| `provider_upload_ref`   | str, nullable              | Opaque pre-processing handle (Mux `upload_id`). Null for providers that skip it.       |
| `provider_asset_ref`    | str, nullable              | Opaque post-processing handle (Mux `asset_id`, Bunny `videoId`, CF `uid`).             |
| `playback_ref`          | str, nullable              | What the frontend needs to render the player. May equal `provider_asset_ref`.          |
| `status`                | `VideoAssetStatus`         | `pending` → `ready` / `errored` / `deleted`. State machine, no skipping.               |
| `lesson_id`             | UUID FK → lessons.id, null | Null = unattached (draft or abandoned). Drives the orphan sweeper.                     |
| `duration_seconds`      | int, nullable              | From webhook. Used for per-tenant quota enforcement.                                   |
| `max_resolution_height` | int, nullable              | From webhook. For analytics and tier-based limits.                                     |
| `bytes`                 | bigint, nullable           | From webhook. Storage accounting.                                                      |
| `ready_at`              | datetime, nullable         | When the provider reported the asset playable.                                         |
| `deleted_at`            | datetime, nullable         | Soft-delete marker for audit; provider-side deletion happens via sweeper.              |
| `provider_metadata`     | JSONB                      | Anything provider-specific (HLS variants, thumbnail URL, MP4 renditions).              |

`created_at` / `updated_at` come from `TimestampedModel` — no need to redeclare.

`Lesson.video_asset_id` (UUID FK → `video_assets.id`, nullable) ties a lesson to its video. The internal `id` — not any provider handle — is what `Lesson` references. **This is the load-bearing decision for portability**: when we migrate provider X → Y, we rewrite columns on existing video_assets rows, lessons stay valid.

### Credentials: platform-owned, not BYO

Video credentials live in `app.core.config.settings`, loaded from `.env`. One platform-wide account per provider. The adapter pulls them at instantiation, the same way `app/services/storage/s3.py` reads `settings.S3_*`.

This is deliberately different from how payments work:

- **Payments are BYO** because the money flow, refunds, chargebacks, and tax/KYC obligations land on whoever owns the merchant account. The tenant must own it.
- **Video is centralized** because it's a cost center, not a revenue stream. Tenants gain nothing from holding their own Mux key — and pay the friction of going to a third party, providing a credit card, and copy-pasting credentials before they can upload a single lesson. We absorb the cost and recover it via plan pricing.

Implications:

- Cost discipline is non-negotiable. The quota enforcement section below isn't optional — it's the only thing standing between us and a runaway bill.
- A single platform Mux account is a single point of failure. Same risk profile as our DB or our app servers; mitigate via monitoring, not BYO.
- Tenants don't see provider details. The `provider` column on `video_assets` is internal — it lets us migrate (Mux → Bunny) transparently to the creator.

If an enterprise tenant ever insists on their own Mux account (compliance, data residency), the BYO pattern from `OrgPaymentAccount` is available: one row per `(org, provider)` in `org_video_accounts`, Fernet-encrypted secret, presence-means-enabled. Defer until asked.

### Why not store `playback_url` directly?

Providers rotate URL formats and signing schemes. The adapter computes the playback URL from `playback_ref` + signing config at render time. Storing the formatted URL would freeze us against the provider's URL evolution.

## Lifecycle

1. **Mint** — Creator clicks upload. Frontend POSTs to `/api/v1/uploads/video` (new endpoint; add to `app/api/routes/uploads.py` next to the existing image upload). Backend resolves the provider adapter via the registry, calls `adapter.create_upload(...)`, writes a `VideoAsset` row with `status=pending`, returns `{upload_url, video_asset_id}` (our UUID, not the provider's).
2. **Bytes** — Browser uploads to `upload_url` via tus or signed POST. No backend involvement.
3. **Process** — Provider transcodes. Frontend polls `GET /api/v1/video_assets/{video_asset_id}` every 2–5s. The handler:
   - If our DB row is already `ready`, returns immediately without calling the provider.
   - If `pending`, calls `adapter.fetch_asset(provider_asset_ref)` (or `fetch_upload(provider_upload_ref)` if the asset hasn't been created yet), updates the row when the status changes, returns the current state.
4. **Attach** — Creator saves the lesson. Backend writes `Lesson.video_asset_id`. The asset is now "live."
5. **Detach** — Creator unpublishes / replaces the video. `Lesson.video_asset_id` returns to null. The asset becomes a sweep candidate after the grace window.
6. **Reap** — Sweeper calls `adapter.delete(provider_asset_ref)`, sets `status=deleted`, `deleted_at=now()`. Row is kept for audit; provider state is gone.

### Stuck `pending` rows

If a creator closes the tab mid-transcode, nothing polls and the DB row stays at `pending` indefinitely. The pending-stuck sweep (below) handles this: before deleting a row stuck in `pending`, it calls `fetch_asset()` once. If the provider says `ready`, mark the row ready (it'll be re-considered for orphan sweep next pass). If still pending or errored, delete the row and the provider asset.

## Sweep policies

Each policy is one SQL query plus the adapter's delete call. Run on a schedule (daily is fine for cost; faster for compliance-sensitive use cases).

- **Pending-stuck** — `status='pending' AND created_at < now() - interval '24 hours'`. Browser never finished uploading, or finished but never polled. Call `fetch_asset` once before deleting; if the provider says ready, promote the row instead.
- **Orphan-ready** — `status='ready' AND lesson_id IS NULL AND ready_at < now() - interval '7 days'`. Asset finished processing but never got attached. Grace window protects "uploaded today, came back next week to finish writing."
- **Detached-ready** — `status='ready' AND lesson_id IS NULL AND ready_at < now() - interval '30 days'`. Was attached, got replaced. Longer grace because the creator might restore.
- **Org-cancelled** — `org_id = X`. Triggered by `Organization.status` change, not scheduled.

Sweep numbers belong in `app.core.config.settings` (config, not constants in the sweeper module).

## Reconciliation

The DB can lie. Bugs lose rows, deploys eat webhooks, races leave dangling state. A weekly reconciliation job:

1. Pages through all provider-side assets in our platform account.
2. Joins with our DB by `provider_asset_ref`.
3. Reports drift: assets the provider has that we don't, assets we have that the provider doesn't.

**Recovery from drift:** every adapter MUST stamp `{org_id, video_asset_id}` into the provider's caller-controlled metadata field (Mux `passthrough`, Cloudflare Stream `meta`, Bunny `metaTags`). When we find a provider-side asset with no DB row, that metadata tells us who it belonged to and we either re-create the row or delete the asset. This is also how org-cancellation cleanup attributes assets back to a tenant — we don't need per-org provider listing, we need per-asset metadata.

If a provider doesn't support caller-controlled metadata, we don't adopt it.

## Provider adapter contract

Modeled on the payments adapter at `app/services/payments/` for shape, but with platform-owned credentials in the style of `app/services/storage/s3.py` (read from `settings` at module load, no per-call credential injection).

- `app/services/video/base.py` — defines a `VideoProvider` `Protocol` (Python `typing.Protocol`, not an ABC), plus the `BaseModel` DTOs it returns (`UploadHandle`, `ProviderAsset`, `NormalizedEvent`).
- `app/services/video/<provider>_provider.py` — one implementation per provider (e.g. `mux_provider.py`), mirroring `stripe_gateway.py` / `razorpay_gateway.py` in file naming.
- `app/services/video/registry.py` — `@cache` factory returning the singleton instance for a given `VideoProviderName` enum value. Routes resolve the adapter via this; routes never import provider SDKs directly.

The contract roughly:

```python
class VideoProvider(Protocol):
    provider: VideoProviderName  # the StrEnum value

    async def create_upload(self, *, org_id: UUID, video_asset_id: UUID) -> UploadHandle: ...
    async def fetch_upload(self, *, provider_upload_ref: str) -> UploadStatus: ...
    async def fetch_asset(self, *, provider_asset_ref: str) -> ProviderAsset: ...
    async def delete(self, *, provider_asset_ref: str) -> None: ...
    async def list_assets(self) -> AsyncIterator[ProviderAsset]: ...
```

`fetch_upload` exists because Mux (and likely future providers) have a distinct upload phase before an asset is created. The polling route calls `fetch_upload` while `provider_asset_ref` is null; once `UploadStatus.provider_asset_ref` is populated, the route switches to `fetch_asset` for further polls. For providers where upload and asset share an identifier, the adapter returns the upload ref as `provider_asset_ref` immediately.

`ProviderAsset.status` is a `VideoAssetStatus` — the adapter is responsible for mapping the provider's native state machine (Mux's `preparing`/`ready`/`errored`, Bunny's enum, etc.) to ours. Callers compare it to the DB row's status to decide whether to update.

Adapter implementations construct their SDK client once at init using `settings.MUX_TOKEN_ID` / `settings.MUX_TOKEN_SECRET` (or equivalent per-provider env vars). No credentials in method signatures.

`list_assets` is account-wide because we hold one platform account; filtering by `org_id` for reconciliation happens via the `passthrough` metadata we stamp on each upload (see below).

`NormalizedEvent` is a sealed union: `AssetReady | AssetErrored | AssetDeleted | UnknownEvent`. The webhook route dispatches on event type, not on provider — provider differences end inside `parse_webhook`.

`UploadHandle` carries the provider-side URL plus our `video_asset_id` (so frontend can poll status by our UUID).

## Frontend integration

The existing tiptap `VideoEmbed` node at `frontend/lib/tiptap-video-embed.ts` keeps its URL-paste path for already-hosted video (YouTube/Vimeo/Loom/Mux URL). The upload path adds a second flow that resolves to the same node shape:

1. Drop-zone in the editor toolbar → POST to `/api/v1/uploads/video` → returns `{upload_url, video_asset_id, provider}`.
2. Browser uploads to `upload_url` (tus).
3. Editor polls `/api/v1/video_assets/{id}` until `status=ready` and surfaces progress.
4. On ready, editor inserts `setVideoEmbed({src: playback_url, provider})` — the node renders exactly as if the creator had pasted the URL.

So both flows converge at the same tiptap node. No second renderer to maintain.

## Quota enforcement

Webhook records `duration_seconds` and `bytes`. Quota check on `/uploads/video`:

```python
total = await session.scalar(
    select(func.sum(VideoAsset.duration_seconds)).where(
        VideoAsset.org_id == org_id, VideoAsset.status == VideoAssetStatus.READY
    )
)
if total + estimated_new_duration > org.plan.video_quota_seconds:
    raise HTTPException(403, "Storage quota exceeded")
```

Without this, a tenant on the free tier can upload terabytes and the cost falls on us.

## Tests

Per the project's testing layout:

- Factory at `app/tests/factories/video_asset.py` (polyfactory, sibling of `course.py`, `payment_account.py`).
- Unit tests at `app/tests/unit_tests/services/video/` covering: URL → provider parsing, webhook signature verification, sweep query selection (no real DB), `parse_webhook` normalization per provider.
- Integration tests against a real Postgres for the route handlers and the sweeper.

Adapter SDKs (Mux, Bunny, Cloudflare) should be mocked at the SDK boundary in unit tests, never inside our adapter code.

## Open questions

- **CDN signing** for paid courses — paid content needs signed playback URLs with short TTLs (so non-purchasers can't share the URL). Adapter contract may need a `sign_playback(*, playback_ref, viewer_id, ttl_seconds)` method before paid video lessons can ship.
- **Captions and chapters** — out of scope for v1; deferred until after upload works end-to-end.
- **Thumbnails** — Mux/Bunny/CF auto-generate. Either render them from the provider's image URL (simplest) or pull through `app/services/storage/s3.py` for cache locality. Decide after the upload path lands.
- **BYO video account** for enterprise tenants — pattern exists (mirror `OrgPaymentAccount`). Defer until first asker. Adding it later means the adapter constructor needs to accept optional per-call credentials, which is additive.

## Not goals (v1)

- Live streaming.
- Editing video in-browser.
- Bytes-through-our-server fallback. If we ever need this, the architecture above doesn't preclude it — add a `provider='self'` adapter that proxies to S3 + MediaConvert. But don't build it speculatively.
