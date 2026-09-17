# Social Data API

Verify public Instagram and TikTok data — comments, likers, post metrics and
creator profiles — with no end user involved. Give the API a public post and it
performs a server-side lookup: who commented, who liked it, how it is
performing, and which of your registered creators engaged. Nobody is redirected
or asked to sign in.

That is the difference from Vouch, which verifies *private* data by asking the
user to prove it from inside their own account. Most creator campaigns use both:
Vouch to confirm the handle is theirs and the audience is real, this API to
confirm they posted and to reward the people who engaged.

Official documentation: https://docs.vlayer.xyz/social-data-api

## Getting Access

Book a call to discuss your campaign and get an API token and base URL:
https://docs.vlayer.xyz

These credentials are separate from Vouch. You get an API token and a `brandId`
here, in place of `customerId`, and webhooks are signed with HMAC-SHA256 rather
than the pre-shared key Vouch uses.

## Base URL And Authentication

The official docs write your base URL as `{API_BASE_URL}` and your token as
`<API_TOKEN>`. This guide keeps both in the environment so the deployment stays
configuration rather than a constant in your code:

```bash
export SOCIAL_DATA_API_BASE_URL=https://your-api-base-url   # {API_BASE_URL}
export SOCIAL_DATA_API_TOKEN=your-api-token                 # <API_TOKEN>
```

Send the token as a bearer token on every request:

```bash
curl -s "$SOCIAL_DATA_API_BASE_URL/admin/posts/thumbnail" \
  -H "Authorization: Bearer $SOCIAL_DATA_API_TOKEN" \
  --get --data-urlencode "url=https://www.instagram.com/p/Dcikt3sEvp8"
```

A missing or invalid token returns `401`. Routes under `/admin/` need a token
with admin rights and return `403` otherwise. Mint tokens with
`POST /auth/tokens`, list them with `GET /auth/tokens`, revoke with
`DELETE /auth/tokens/{id}`.

Each deployment serves its own OpenAPI document. Fetch it before you code
against it: it is the contract, and this file is a map.

```bash
curl -s "$SOCIAL_DATA_API_BASE_URL/openapi.json" | jq -r '.paths | keys[]'
```

Interactive docs live at `{API_BASE_URL}/docs`.

## Core Objects

| Object | What it is |
|---|---|
| **Brand** | Owns campaigns and webhooks. You pass `brandId` when creating a campaign or registering a webhook. |
| **Campaign** | A reward program with a `title`, `pointsReward`, and one challenge. |
| **Challenge** | The post to engage with, parsed from the campaign's `targetUrl`. Challenge-scoped scrape and verification routes take `challengeId`; you never pass the post URL again. Pre-campaign and creator routes are addressed differently. |
| **Creator** | A user identified by your own `externalId`, with linked Instagram or TikTok accounts. |
| **Attempt** | One creator's progress through one challenge, tracked as a state machine. |

## Response Envelope

Successful responses wrap the result in `data`. Paginated list routes add
`pagination`, which accepts `page` (default `1`) and `limit` (default `20`). The
likers list caps `limit` at `100`.

Not every list route paginates. `GET /social-accounts` returns a bare `data`
array, because it lists one user's own connected accounts and is bounded by the
platforms on offer.

```json
{ "data": [], "pagination": { "page": 1, "limit": 20, "total": 150 } }
```

Errors return an `error` code and a human-readable `message`. Branch on `error`;
`message` may be reworded.

```json
{ "error": "NOT_FOUND", "message": "Campaign 42 not found" }
```

## The Lookup Surface

| Group | Endpoint | Reads |
|---|---|---|
| Posts | `GET /admin/posts/thumbnail` | A post, from its URL alone |
| Metrics | `GET /admin/challenges/{challengeId}/metrics` | Last stored snapshot |
| Metrics | `POST /admin/challenges/{challengeId}/metrics/refresh` | Fresh snapshot |
| Comments | `GET /admin/challenges/{challengeId}/comments` | Stored comments |
| Comments | `POST /admin/challenges/{challengeId}/comments/refresh` | Full comment sweep |
| Likers | `POST /admin/challenges/{challengeId}/likers/refresh` | Starts a liker fetch |
| Likers | `GET /admin/challenges/{challengeId}/likers/status` | Fetch progress |
| Likers | `GET /admin/challenges/{challengeId}/likers` | Stored likers |
| Creators | `POST /admin/creators/{userId}/refresh` | Latest profile data |
| Creators | `GET /admin/creators/verify/{handle}` | Whether a handle is connected |
| Accounts | `POST /social-accounts/connect` | Starts Vouch verification |
| Accounts | `GET /social-accounts` | Connected accounts |

One endpoint reads a platform without any stored record first:
`GET /admin/posts/thumbnail`. Every other platform read is keyed on a challenge
or a user that already exists. `GET /admin/creators/verify/{handle}` is the odd
one out in the other direction — it takes a handle but reads only your own
records, so it touches no platform at all.

---

## Post Lookup

### `GET /admin/posts/thumbnail`

Look up a post from its URL before any campaign exists for it. This is the
endpoint for the moment a brand pastes a URL into a form. It reads the post,
returns the cover image, and confirms the URL points at a real, readable post.
Nothing is created or stored, so it is safe to call on every paste.

Call it before `POST /admin/campaigns`. `GET /admin/challenges/{id}/metrics`
also returns a `thumbnailUrl`, but only once the campaign exists.

**Parameters**

| Name | In | Required | Description |
|---|---|---|---|
| `url` | query | Yes | The post URL as pasted. Extra query parameters are fine. |

**Accepted URLs**

- Instagram posts: `https://www.instagram.com/p/{id}`
- Instagram reels: `https://www.instagram.com/reel/{id}`
- TikTok videos: `https://www.tiktok.com/@{user}/video/{id}`

Anything else returns `422 VALIDATION_ERROR` before the post is read.

**Response: 200**

```json
{
  "data": {
    "platform": "instagram",
    "contentType": "post",
    "contentId": "Dcikt3sEvp8",
    "canonicalUrl": "https://www.instagram.com/p/Dcikt3sEvp8/",
    "thumbnailUrl": "https://scontent.cdninstagram.com/v/t51.82787-15/792667282.jpg?stp=dst-jpg&oh=00_AQ&oe=6A9F2C99"
  }
}
```

Two fields carry rules:

- **`canonicalUrl`** strips share tags and extras. Send this as the challenge's
  `targetUrl` so the campaign and the lookup agree on which post is meant.
- **`thumbnailUrl`** is a signed link that stops working within days. Download
  the image on receipt; do not store the URL. `null` with a `200` means the post
  was read fine but publishes no usable cover, not a failure.

**Timing and limits**

Usually about a second. A small share of posts are read a slower way and can
take up to 40 seconds, so set a generous client timeout instead of retrying a
request that is still running.

Ten lookups per post per five minutes, and 100 per caller per minute.

---

## Post Metrics

### `GET /admin/challenges/{challengeId}/metrics`

Returns the most recent metrics snapshot for the challenge post.

```json
{
  "data": {
    "likeCount": 5432,
    "commentCount": 312,
    "shareCount": 89,
    "viewCount": 125000,
    "thumbnailUrl": "https://scontent.cdninstagram.com/...",
    "fetchedAt": "2026-09-16T10:12:04.000Z"
  },
  "lastRefresh": {
    "status": "success",
    "errorCode": null,
    "attemptedAt": "2026-09-16T10:12:04.000Z",
    "durationMs": 27134
  }
}
```

**Detecting stale numbers.** `data` is the last *successful* scrape, so
`data.fetchedAt` alone cannot tell you whether the numbers are current. A
challenge whose refreshes have been failing for days keeps returning its last
good snapshot. Read `lastRefresh`, which records the most recent *attempt* and
its outcome (`success`, `rate_limited`, `error`). When `lastRefresh.attemptedAt`
is much newer than `data.fetchedAt`, the numbers are stale and something is
failing.

`lastRefresh` is `null` for a challenge never refreshed since this tracking was
introduced.

**Nullable counts.** Every count is nullable. `likeCount` is null when the
author hides likes. `viewCount` is null for images, and null for age-restricted
posts because the fallback provider reports no play count.

### `POST /admin/challenges/{challengeId}/metrics/refresh`

Fetches fresh metrics and stores a new snapshot.

**Two success shapes:**

| Status | Meaning | Next step |
|---|---|---|
| `200` | Snapshot taken, body holds it | Use the body |
| `202` | Provider is rate limiting, refresh queued | Poll `GET .../metrics` after `retryAfterSeconds` |

```json
{
  "data": { "challengeId": 42, "status": "queued", "retryAfterSeconds": 180 }
}
```

`status` is `queued` when this call created the background job, or
`already_scheduled` when one was already pending. Only one background refresh
exists per challenge, so calling repeatedly is safe and stacks nothing.

**Cooldown.** Once every five minutes per challenge; sooner returns
`429 RATE_LIMITED` with `Retry-After`. The cooldown is per challenge, not per
caller, so sweeping many challenges is unaffected. It is keyed on the challenge
id itself, so `/1`, `/01`, and `/1.0` share one budget.

Age-restricted Instagram posts are read through a fallback provider and normally
return `200`. `422 POST_AGE_RESTRICTED` means both providers failed.

---

## Comments

### `GET /admin/challenges/{challengeId}/comments`

Paginated comments stored for the challenge post.

| Name | In | Default | Description |
|---|---|---|---|
| `page` | query | `1` | Page number |
| `limit` | query | `20` | Rows per page |

```json
{
  "data": [
    {
      "id": 1,
      "platformCommentId": "17890012345678",
      "username": "creator_jane",
      "commentText": "Love this product!",
      "commentedAt": "2026-09-15T18:02:11.000Z",
      "createdAt": "2026-09-15T18:05:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 150 }
}
```

### `POST /admin/challenges/{challengeId}/comments/refresh`

Fetches all comments (up to 500 pages) plus Instagram threaded replies,
deduplicating by platform comment ID. It also records the post's comment history
as stored, so ongoing verification only has to read the newest comments. Worth
calling once when launching a campaign on a post that already has comments.

```json
{
  "data": { "totalFetched": 347, "sweepStatus": "swept", "historyComplete": true }
}
```

| Field | Meaning |
|---|---|
| `totalFetched` | Comments now stored for the post |
| `sweepStatus` | `swept` — this call read the post. `in_progress` — a verification run already held it, nothing was read, and `totalFetched` reflects what was already stored. |
| `historyComplete` | `false` when the post is larger than one call can read; the remainder fills in the background. |

---

## Likers

Instagram only. The fetch uses a public, no-cookie scraper, so the number of
liker profiles returned may be lower than Instagram's visible like count. Treat
`fetchedCount` as a floor, not a census.

### `POST /admin/challenges/{challengeId}/likers/refresh`

Starts an asynchronous fetch and returns `202` immediately. The post is derived
from the challenge, so no shortcode or URL is supplied.

| Name | In | Default | Range | Description |
|---|---|---|---|---|
| `maxCount` | query | `1000` | 1–5000 | Max likers to fetch |

This route is rate-limited to 10 requests per minute; beyond that it returns
`429 RATE_LIMITED` with a `Retry-After` header. Other failure modes: `422` when
the challenge is not an Instagram challenge, `503` when liker fetching is not
configured on the deployment.

Liker runs report failure on the run itself, through `status` and
`errorMessage`, not through the scraping error codes below.

### `GET /admin/challenges/{challengeId}/likers/status`

Poll this after starting a fetch. Returns `null` in `data` if none was ever
requested.

```json
{
  "data": {
    "challengeId": 1,
    "status": "succeeded",
    "fetchedCount": 428,
    "totalLikes": 432,
    "errorMessage": null,
    "startedAt": "2026-09-16T09:00:00.000Z",
    "finishedAt": "2026-09-16T09:02:41.000Z",
    "requestedAt": "2026-09-16T08:59:58.000Z"
  }
}
```

`status` is one of `pending`, `running`, `succeeded`, `failed`, `aborted`,
`timed_out`. Stop polling on the last four. `fetchedCount` is rows actually
stored; `totalLikes` is the reported like count and may exceed it.

### `GET /admin/challenges/{challengeId}/likers`

Likers from the most recent completed fetch. Empty until one succeeds.

| Name | In | Default | Max | Description |
|---|---|---|---|---|
| `page` | query | `1` | — | Page number |
| `limit` | query | `20` | `100` | Rows per page |

```json
{
  "data": [
    {
      "id": 1,
      "username": "jane_doe",
      "fullName": "Jane Doe",
      "igUserId": "1784500123",
      "isPrivate": false,
      "isVerified": false,
      "profilePicUrl": "https://...",
      "likedPost": true,
      "totalLikes": 432
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 428 }
}
```

A `warning` string accompanies the response when coverage is partial.

---

## Creator Profiles

### `POST /admin/creators/{userId}/refresh`

Fetches the latest Instagram or TikTok profile data and updates the stored
profile. Returns `404` when the user has no social account, or when the profile
no longer exists (`POST_NOT_FOUND`). Scraping failures propagate; see
[Error Handling](#error-handling).

### `GET /admin/creators/verify/{handle}`

Checks whether an Instagram handle has a verified, connected social account.

```json
{ "data": { "verified": true } }
```

This reads your own records, not Instagram, so it needs no scraping and cannot
return a scraping error.

---

## Social Accounts

These bridge the lookup APIs and hosted Vouch verification described in
`SKILL.md`.

### `POST /social-accounts/connect`

Starts verification for the authenticated user and returns a Vouch
`verificationUrl` plus `requestId`. The datasource is chosen from `platform`.

```json
{ "platform": "instagram", "inputs": { "username": "creator_handle" } }
```

`inputs` is optional and passed through to the Vouch datasource.

### `GET /social-accounts`

Lists the authenticated user's connected accounts.

```json
{
  "data": [
    {
      "id": 1,
      "platform": "instagram",
      "platformUsername": "creator_jane",
      "connectedAt": "2026-09-01T12:00:00.000Z"
    }
  ]
}
```

### `POST /social-accounts` (admin)

Links a creator and social account directly, bypassing verification. Takes
`platform`, `handle`, `externalId`, and optionally `email` and `displayName`.
Returns `201` when newly linked, `200` when that
`externalId` + `platform` + `handle` triple was already linked.

### `POST /social-accounts/disconnect` (admin)

Disconnects by `platform`, `handle`, and `externalId`. Returns `404` when no
active account matches.

---

## Error Handling

Every endpoint that reads a post or profile shares one error contract. Switch on
`error`, which is stable. `message` is human-readable and may be reworded.

```json
{ "error": "POST_AGE_RESTRICTED", "message": "This post is age-restricted..." }
```

| `error` | HTTP | Retry? | Meaning |
|---|---|---|---|
| `VALIDATION_ERROR` | 422 | No | Malformed URL or path parameter, rejected before any read |
| `POST_AGE_RESTRICTED` | 422 | No | Age-gated. Only the creator can fix it, by reposting. |
| `POST_NOT_ACCESSIBLE` | 422 | No | Private, or otherwise not public |
| `POST_NOT_FOUND` | 404 | No | The post no longer exists at that URL |
| `RATE_LIMITED` | 429 | After `Retry-After` | **Our** limit — a cooldown or per-caller cap |
| `SCRAPING_RATE_LIMITED` | 429 | After `Retry-After` | The **provider's** limit, passed through |
| `SCRAPING_UNAVAILABLE` | 503 | Yes, later | Scraping is temporarily down |
| `SCRAPING_ERROR` | 502 | Yes, later | Scraping failed for an unclassified reason |

**The split that matters.** 404 and 422 are permanent *for that URL*. Retrying
burns quota and changes nothing. 429, 502, and 503 are transient.

**The two 429s.** `RATE_LIMITED` means you hit a platform limit and can pace yourself
out of it. `SCRAPING_RATE_LIMITED` means the upstream provider is throttling and
the post could not be read at all. Both send `Retry-After`. Honour the header;
do not poll.

---

## A Typed Client

```typescript
const BASE_URL = process.env.SOCIAL_DATA_API_BASE_URL!;
const TOKEN = process.env.SOCIAL_DATA_API_TOKEN!;

const PERMANENT_CODES = new Set([
  "VALIDATION_ERROR",
  "POST_AGE_RESTRICTED",
  "POST_NOT_ACCESSIBLE",
  "POST_NOT_FOUND",
]);

// 401 and 403 mean the token is wrong or lacks admin rights. Neither improves
// by waiting, so they are permanent even though they carry no scraping code.
const PERMANENT_STATUSES = new Set([400, 401, 403, 404, 422]);

export class LookupError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    readonly retryAfterSeconds: number | null,
    message: string,
  ) {
    super(message);
  }

  get permanent() {
    return PERMANENT_CODES.has(this.code) || PERMANENT_STATUSES.has(this.status);
  }
}

/**
 * Retry-After is either delay-seconds or an HTTP-date (RFC 9110). Number() on a
 * date gives NaN, and NaN is not nullish, so an unguarded `?? fallback` would
 * pass NaN to setTimeout — which fires immediately and turns a rate-limit into
 * a retry storm. Return null for anything unparseable so the caller backs off.
 */
function parseRetryAfter(header: string | null): number | null {
  if (!header) return null;

  const seconds = Number(header.trim());
  if (Number.isFinite(seconds)) {
    return Math.max(0, seconds);
  }

  const date = Date.parse(header);
  if (Number.isNaN(date)) return null;

  return Math.max(0, Math.ceil((date - Date.now()) / 1000));
}

async function socialApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    // Thumbnail lookups fall back to a slower reader on some posts.
    signal: AbortSignal.timeout(45_000),
  });

  if (res.ok) {
    return (await res.json()) as T;
  }

  const body = (await res.json().catch(() => ({}))) as {
    error?: string;
    message?: string;
  };
  throw new LookupError(
    body.error ?? "UNKNOWN",
    res.status,
    parseRetryAfter(res.headers.get("Retry-After")),
    body.message ?? res.statusText,
  );
}
```

### Look Up A Pasted Post

```typescript
type PostThumbnail = {
  platform: "instagram" | "tiktok";
  contentType: "post" | "reel" | "video";
  contentId: string;
  canonicalUrl: string;
  thumbnailUrl: string | null;
};

export async function lookupPost(url: string) {
  const { data } = await socialApi<{ data: PostThumbnail }>(
    `/admin/posts/thumbnail?url=${encodeURIComponent(url)}`,
  );

  // Signed CDN link, dead within days. Mirror the bytes now.
  const stored = data.thumbnailUrl
    ? await mirrorToOwnStorage(data.thumbnailUrl)
    : null;

  return { ...data, thumbnailUrl: stored };
}
```

### Retry Only What Is Worth Retrying

```typescript
export async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (!(err instanceof LookupError) || err.permanent || attempt >= attempts) {
        throw err;
      }

      const wait = err.retryAfterSeconds ?? 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, wait * 1000));
    }
  }
}
```

### Drive An Async Likers Fetch

```typescript
type LikersStatus = {
  status: "pending" | "running" | "succeeded" | "failed" | "aborted" | "timed_out";
  fetchedCount: number;
  totalLikes: number | null;
  errorMessage: string | null;
};

const TERMINAL = new Set(["succeeded", "failed", "aborted", "timed_out"]);

const POLL_INTERVAL_MS = 5_000;
const POLL_DEADLINE_MS = 10 * 60 * 1000;

export async function fetchLikers(
  challengeId: number,
  maxCount = 1000,
  deadlineMs = POLL_DEADLINE_MS,
) {
  await socialApi(`/admin/challenges/${challengeId}/likers/refresh?maxCount=${maxCount}`, {
    method: "POST",
  });

  // The 45s per-request timeout bounds one call, not the loop. Without this
  // deadline a run stuck on `pending` keeps the caller's promise alive forever.
  const giveUpAt = Date.now() + deadlineMs;

  while (Date.now() < giveUpAt) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

    const { data } = await socialApi<{ data: LikersStatus | null }>(
      `/admin/challenges/${challengeId}/likers/status`,
    );

    if (data && TERMINAL.has(data.status)) {
      if (data.status !== "succeeded") {
        throw new Error(`Likers fetch ${data.status}: ${data.errorMessage}`);
      }
      return data;
    }
  }

  throw new Error(
    `Likers fetch for challenge ${challengeId} did not finish within ${deadlineMs}ms`,
  );
}
```

The run keeps going server-side after the deadline. Poll
`GET /admin/challenges/{challengeId}/likers/status` again later, or read the
rows directly, rather than starting a second fetch.

## Integration Notes

- Call `GET /admin/posts/thumbnail` on paste, and send its `canonicalUrl` as the
  challenge `targetUrl`, so the campaign and the lookup agree on the post.
- Mirror every `thumbnailUrl` into your own storage on receipt. Both the
  thumbnail lookup and the metrics snapshot return signed links that expire.
- Read `lastRefresh` before trusting `data.fetchedAt`. A silent scraping failure
  looks exactly like a quiet post otherwise.
- Sweep comments once at campaign launch, then let ongoing verification read
  only the newest ones.
- Store `platformCommentId` and dedupe on it. Refreshes overlap by design.
- Treat 404 and 422 as final for that URL and record the reason, so an operator
  can see that a post is age-gated rather than watching a job retry forever.

## Beyond Lookup

This guide covers the read side. The same API also creates campaigns, tracks
creator attempts, verifies engagement, and pushes signed webhooks:

| Surface | Docs |
|---|---|
| Create a campaign from a post URL | https://docs.vlayer.xyz/social-data-api/campaigns |
| Verify that a creator commented or liked | https://docs.vlayer.xyz/social-data-api/verify-engagement |
| Creator registration and profiles | https://docs.vlayer.xyz/social-data-api/creators |
| HMAC-SHA256 webhooks and the `whsec_*` secret | https://docs.vlayer.xyz/social-data-api/webhooks |
| Scraping error reference | https://docs.vlayer.xyz/social-data-api/scraping-errors |

Note the webhook contrast: Vouch webhooks authenticate with
`Authorization: PSK <secret>`, described in `SKILL.md`. Social Data API webhooks
are signed with HMAC-SHA256 against a `whsec_*` secret. Do not reuse one
verification path for both.
