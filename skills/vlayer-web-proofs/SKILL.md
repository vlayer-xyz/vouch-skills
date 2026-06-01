---
name: vlayer-web-proofs
description: Generate and verify cryptographic web proofs for any HTTPS request using the vlayer 2.0 server-side API. Prove that a specific server returned specific data at a specific time — without the server's cooperation. Use when you need tamper-proof, verifiable records of API responses, user data, or any HTTPS-served content.
license: MIT. LICENSE.txt has complete terms
---

# vlayer Server-Side Web Proofs

vlayer web proofs are cryptographic attestations of TLS transcripts. They prove:

- **which server** responded (via SSL certificate chain)
- **what the server returned** (request + response transcript)
- **when** the exchange happened (TLS timestamp)
- **that the data was not tampered with** (notary signature)

The notary is a neutral third-party server that witnesses the TLS session without seeing the plaintext. The resulting proof can be independently verified by anyone.

## What You Can Prove

Any HTTPS request to any server: REST APIs, OAuth-authorized endpoints, financial data feeds, social profile APIs, exchange rates, account balances. If it's HTTPS, it's provable.

## API

**Base URL:** `https://web-prover.production.vlayer.xyz/api/v2.0`

**Auth:** `Authorization: Bearer <api-key>`

**Endpoints:**
- `POST /prove` — notarize an HTTPS request and return a proof
- `POST /verify` — verify a proof and return the decoded transcript

Never include your API key in client-side code. Always call from a server-side route.

## Environment Setup

Get your API key from the vlayer dashboard: https://dashboard-20.vlayer.xyz/

```bash
export VLAYER_API_KEY=ak_your_key_here
```

## Quick Start

### Prove

```bash
curl -X POST https://web-prover.production.vlayer.xyz/api/v2.0/prove \
  -H "Authorization: Bearer $VLAYER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://api.github.com/zen",
    "method": "GET",
    "headers": ["Accept: application/vnd.github.v3+json", "User-Agent: my-app"],
    "maxRecvData": 4096
  }'
```

Response:
```json
{
  "apiVersion": "v2.0",
  "success": true,
  "data": {
    "data": "<hex-encoded proof>",
    "version": "0.1.0-alpha.12",
    "meta": {
      "notaryUrl": "https://notary.production.vlayer.xyz/v1.0.0"
    }
  }
}
```

### Verify

Pass the entire `data` object from the prove response as the verify body:

```bash
curl -X POST https://web-prover.production.vlayer.xyz/api/v2.0/verify \
  -H "Authorization: Bearer $VLAYER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "data": "<hex from prove>",
    "version": "0.1.0-alpha.12",
    "meta": {
      "notaryUrl": "https://notary.production.vlayer.xyz/v1.0.0"
    }
  }'
```

Response:
```json
{
  "apiVersion": "v2.0",
  "success": true,
  "data": {
    "serverDomain": "api.github.com",
    "notaryKeyFingerprint": "a7e62d7f17aa7a22c26bdb93b7ce9400e826ffb2c6f54e54d2ded015677499af",
    "tlsTimestamp": 1780342866,
    "request": {
      "method": "GET",
      "url": "/zen",
      "version": "HTTP/1.1",
      "headers": ["accept: application/vnd.github.v3+json", "..."],
      "body": null,
      "raw": "<hex>"
    },
    "response": {
      "status": "200",
      "version": "HTTP/1.1",
      "headers": ["content-type: text/plain; charset=utf-8", "..."],
      "body": "Approachable is better than simple.",
      "raw": "<hex>"
    }
  }
}
```

## Core Operations

### TypeScript: Prove Any HTTPS Request

```typescript
const VLAYER_BASE = "https://web-prover.production.vlayer.xyz/api/v2.0";

type WebProof = {
  data: string;
  version: string;
  meta: { notaryUrl: string };
};

async function prove(params: {
  url: string;
  method?: string;
  headers?: string[];
  body?: string;
  maxRecvData?: number;
}): Promise<WebProof> {
  const res = await fetch(`${VLAYER_BASE}/prove`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.VLAYER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: params.url,
      method: params.method ?? "GET",
      headers: params.headers ?? [],
      ...(params.body && { body: params.body }),
      ...(params.maxRecvData && { maxRecvData: params.maxRecvData }),
    }),
  });

  const json = await res.json();
  if (!json.success) {
    throw new Error(`vlayer prove failed: ${json.error?.message}`);
  }

  return json.data as WebProof;
}
```

### TypeScript: Verify A Proof

```typescript
type VerifiedTranscript = {
  serverDomain: string;
  notaryKeyFingerprint: string;
  tlsTimestamp: number;
  request: {
    method: string;
    url: string;
    headers: string[];
    body: string | null;
  };
  response: {
    status: string;
    headers: string[];
    body: string | null;
  };
};

async function verify(proof: WebProof): Promise<VerifiedTranscript> {
  const res = await fetch(`${VLAYER_BASE}/verify`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.VLAYER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(proof),
  });

  const json = await res.json();
  if (!json.success) {
    throw new Error(`vlayer verify failed: ${json.error?.message}`);
  }

  return json.data as VerifiedTranscript;
}
```

### End-to-End Example: Prove An OAuth API Response

```typescript
// Prove that a GitHub user has a specific number of public repos
const proof = await prove({
  url: "https://api.github.com/users/someuser",
  method: "GET",
  headers: [
    "Authorization: Bearer github_pat_xxx",
    "Accept: application/vnd.github.v3+json",
    "User-Agent: my-app",
  ],
  maxRecvData: 8192,
});

// Store or transmit the proof — it's self-contained JSON
await db.insert(webProofs).values({ proof: JSON.stringify(proof) });

// Verify later (or by a third party)
const transcript = await verify(proof);
console.log(transcript.serverDomain);          // "api.github.com"
console.log(transcript.response.body);          // JSON with public_repos, etc.
console.log(transcript.tlsTimestamp);           // Unix timestamp of the TLS session
```

## Request Parameters

### POST /prove

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `url` | string | Yes | HTTPS only |
| `method` | string | No | GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS, TRACE. Default: GET |
| `headers` | string[] | No | Format: `"Header-Name: value"` |
| `body` | string | No | Request body for POST/PUT |
| `maxRecvData` | number | No | Max response bytes. Max: 92160 |
| `notaryUrl` | string | No | Custom notary server |
| `redaction` | array | No | Header visibility rules (see below) |

### Header Redaction

Control which request headers appear in the proof transcript. Use when you want to hide auth tokens but reveal other headers:

```json
{
  "url": "https://api.example.com/me",
  "headers": ["Authorization: Bearer secret", "Accept: application/json"],
  "redaction": [
    { "request": { "headers": ["Authorization"] } }
  ]
}
```

Two forms:
- `{ "request": { "headers": ["X"] } }` — hide listed headers, reveal all others
- `{ "request": { "headers_except": ["Accept"] } }` — reveal listed headers, hide all others

### POST /verify Response Fields

| Field | Type | Notes |
|-------|------|-------|
| `serverDomain` | string | Verified server hostname |
| `notaryKeyFingerprint` | string | SHA-256 of the notary's public key |
| `tlsTimestamp` | number | Unix epoch seconds when the TLS session occurred |
| `request.method` | string | |
| `request.url` | string | Path + query string only (no host) |
| `request.headers` | string[] | Revealed headers; redacted ones omitted |
| `request.body` | string \| null | |
| `response.status` | string | HTTP status code |
| `response.headers` | string[] | |
| `response.body` | string \| null | Auto-decoded from chunked/compressed encoding |

## Security: Validating a Proof

A proof is only trustworthy if you check two things:

1. **`success: true`** from `/verify` — confirms the cryptographic proof is valid
2. **`notaryKeyFingerprint`** — confirms the proof was issued by a trusted notary

```typescript
const TRUSTED_NOTARY_FINGERPRINT =
  "a7e62d7f17aa7a22c26bdb93b7ce9400e826ffb2c6f54e54d2ded015677499af";

function assertTrustedProof(transcript: VerifiedTranscript) {
  if (transcript.notaryKeyFingerprint !== TRUSTED_NOTARY_FINGERPRINT) {
    throw new Error("Proof was not issued by a trusted notary");
  }
}
```

## Error Handling

```typescript
// Error response shape
type VlayerError = {
  apiVersion: string;
  success: false;
  error: {
    code: "INVALID_REQUEST" | "INVALID_PRESENTATION" | "INTERNAL_SERVER_ERROR";
    message: string;
  };
};
```

| Code | Cause |
|------|-------|
| `INVALID_REQUEST` | Bad JSON, unknown fields, HTTP url, missing required field |
| `INVALID_PRESENTATION` | Proof data is malformed or truncated |
| `INTERNAL_SERVER_ERROR` | Notarization failed (network, target server error) |

All field names must be camelCase — unknown fields are rejected with 400.

## Patterns

### Prove + Store + Verify Later

```typescript
// At proof time (server action)
const proof = await prove({ url, headers });
await db.insert(proofTable).values({
  requestId: randomUUID(),
  targetUrl: url,
  proof: JSON.stringify(proof),
  provedAt: new Date(),
});

// At verification time (could be a different service)
const stored = await db.query.proofTable.findFirst({ where: eq(proofTable.id, id) });
const proof = JSON.parse(stored.proof) as WebProof;
const transcript = await verify(proof);
assertTrustedProof(transcript);
```

### Extract Specific Fields From Response Body

```typescript
const transcript = await verify(proof);
const body = JSON.parse(transcript.response.body ?? "{}");

// e.g., from a GitHub user proof
const publicRepos = body.public_repos as number;
const login = body.login as string;
```

### Use With Vouch Webhook Payloads

vlayer web proofs appear in Vouch webhook payloads under `webProofs[].presentationJson`. To verify those cryptographically, submit `presentationJson` directly to `POST /api/v1/verify` on the Vouch API (separate from the vlayer endpoint). See the vouch skill for details.
