---
name: vouch
description: Build hosted Vouch verification flows with @getvouch/sdk. Generate verification URLs, configure inputs and metadata, verify PSK-protected webhooks, parse webProofs and outputs, optionally verify presentationJson cryptographically, and persist verified accounts. Use when integrating Vouch datasource verification into backend services.
license: MIT. LICENSE.txt has complete terms
---

# Vouch Verification Flow

Use this skill for the full hosted Vouch verification flow:

- build a hosted `verificationUrl` with `@getvouch/sdk`
- pass `datasourceId`, `redirectBackUrl`, and optionally `webhookUrl`, `metadata`, `inputs`, and `requestId`
- receive the Vouch webhook on your backend
- verify the PSK authorization header before parsing the body
- extract normalized fields from `outputs` and `webProofs`
- optionally verify `presentationJson` cryptographically via the Vouch API
- persist the event idempotently by `requestId`
- link the verified account or identity record into your own database

## Quick Start

```typescript
import { Vouch } from "@getvouch/sdk";

const vouch = new Vouch({
  customerId: env.VOUCH_CUSTOMER_ID,
  apiKey: env.VOUCH_API_KEY,
});

const { verificationUrl, requestId } = await vouch.getDataSourceUrl({
  datasourceId: env.VOUCH_INSTAGRAM_DATASOURCE_ID,
  redirectBackUrl: env.VOUCH_REDIRECT_URL,
  webhookUrl: env.VOUCH_WEBHOOK_URL,
  metadata: JSON.stringify({ userId: 123, platform: "instagram" }),
  inputs: { ig_handle: "creator_handle" },
});

console.log(verificationUrl);
console.log(requestId);
```

## Environment Setup

Get your `customerId` and `apiKey` from the Vouch dashboard: https://app.getvouch.io/organization#/api-keys

```bash
export VOUCH_CUSTOMER_ID=your-customer-id
export VOUCH_API_KEY=your-api-key
export VOUCH_WEBHOOK_SECRET=your-webhook-secret
export VOUCH_REDIRECT_URL=https://app.example.com/vouch/complete
export VOUCH_WEBHOOK_URL=https://api.example.com/webhooks/vouch
export VOUCH_INSTAGRAM_DATASOURCE_ID=your-instagram-datasource-id
```

Fetch available datasource IDs from the catalog:

```bash
curl -s https://app.getvouch.io/api/data-source/catalog | jq '.[] | { id, name, platformName, status }'
```

## React Native

For embedded mobile flows, Vouch provides a separate React Native SDK. Use that path when verification should happen inside a React Native app rather than through a hosted browser redirect and webhook flow.

See `react-native.md`.

## Core Operations

### Create A Singleton SDK Client

```typescript
import { Vouch } from "@getvouch/sdk";

let vouch: Vouch | null = null;

export function getVouch() {
  if (!vouch) {
    vouch = new Vouch({
      customerId: env.VOUCH_CUSTOMER_ID,
      apiKey: env.VOUCH_API_KEY,
    });
  }

  return vouch;
}
```

`apiKey` is sent as a `Bearer` token in the `Authorization` header on all SDK requests.

### Build A Verification URL

```typescript
type VerificationMetadata = {
  userId: number;
  platform: "instagram" | "tiktok";
};

const metadata: VerificationMetadata = {
  userId: 123,
  platform: "instagram",
};

const { verificationUrl, requestId } = await getVouch().getDataSourceUrl({
  datasourceId: env.VOUCH_INSTAGRAM_DATASOURCE_ID,
  redirectBackUrl: env.VOUCH_REDIRECT_URL,
  webhookUrl: env.VOUCH_WEBHOOK_URL,         // optional
  metadata: JSON.stringify(metadata),         // max 256 characters
  inputs: { ig_handle: "creator_handle" },
});
```

`redirectBackUrl` receives `requestId` as a query parameter when the user returns, so you can correlate the redirect with the pending verification.

`metadata` is capped at **256 characters**. Keep the stringified value small — store only correlation IDs, not full objects.

`requestId` can optionally be supplied as a UUIDv4 if you want to generate it server-side before the redirect:

```typescript
import { randomUUID } from "crypto";

const { verificationUrl } = await getVouch().getDataSourceUrl({
  datasourceId: env.VOUCH_INSTAGRAM_DATASOURCE_ID,
  redirectBackUrl: env.VOUCH_REDIRECT_URL,
  requestId: randomUUID(),
  metadata: JSON.stringify({ userId: 123 }),
});
```

### Configure `inputs`

Input keys are datasource-specific. Consult the Data Source Catalog for required fields per source.

Common examples:

```typescript
// Instagram
inputs: { ig_handle: "creator_handle" }

// TikTok
inputs: { username: "creator_handle" }

// X (Twitter) following verification
inputs: { twitter_username: "target_account" }
```

Pass only the keys the datasource expects. Keep inputs explicit at the call site so the request is inspectable and easy to audit.

### Receive And Verify The Webhook

Reject the request immediately if the `Authorization` header is missing or incorrect. Do not parse the body until auth passes.

```typescript
import { timingSafeEqual } from "crypto";

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

app.post("/webhooks/vouch", async (c) => {
  const authHeader = c.req.header("Authorization");
  const expectedAuth = `PSK ${env.VOUCH_WEBHOOK_SECRET}`;

  if (!authHeader || !safeCompare(authHeader, expectedAuth)) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const payload = await c.req.json();
  await processVouchWebhook(payload);

  return c.json({ received: true });
});
```

Vouch sends webhooks from `52.59.138.51` and `3.78.83.192`. You can allowlist these IPs at your infrastructure layer for an additional defense-in-depth check.

### Parse Metadata, Outputs, And WebProofs

```typescript
import { z } from "zod/v4";

const vouchPayloadSchema = z.object({
  requestId: z.string().min(1),
  dataSourceId: z.string().optional(),
  metadata: z.string().optional(),
  outputs: z.record(z.string(), z.unknown()),
  webProofs: z
    .array(
      z.object({
        outputs: z.record(z.string(), z.unknown()).optional(),
        presentationJson: z.record(z.string(), z.unknown()),
        decodedTranscript: z.record(z.string(), z.unknown()),
      })
    )
    .optional(),
});

const parsed = vouchPayloadSchema.safeParse(rawPayload);
if (!parsed.success) return;

const payload = parsed.data;

const metadata = JSON.parse(payload.metadata ?? "{}") as {
  userId?: number;
  platform?: "instagram" | "tiktok";
};

const outputs = payload.outputs as {
  handle?: string;
  username?: string;
  userId?: string;
  follower_count?: string;
  [key: string]: unknown;
};

const username = outputs.handle ?? outputs.username;
```

`webProofs` is absent for sensitive datasources. Treat it as optional.

### Optional Cryptographic Verification

For compliance or third-party audits, submit `presentationJson` to the Vouch verify endpoint:

```typescript
async function verifyWebProof(
  presentationJson: Record<string, unknown>
): Promise<boolean> {
  const res = await fetch("https://app.getvouch.io/api/v1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ presentationJson }),
  });

  if (!res.ok) return false;

  const result = await res.json();
  return result.success === true;
}

for (const proof of payload.webProofs ?? []) {
  const valid = await verifyWebProof(proof.presentationJson);
  if (!valid) {
    throw new Error("webProof verification failed");
  }
}
```

This step is optional in the standard webhook flow but required when another party must independently validate the proof.

### Persist The Event Idempotently

```typescript
try {
  await db.insert(webhookEvents).values({
    source: "vouch",
    eventType: "verification.completed",
    idempotencyKey: payload.requestId,
    payload: payload as any,
  });
} catch (err: any) {
  if (err?.code === "23505") {
    return; // already processed
  }
  throw err;
}
```

Then upsert the verified account:

```typescript
await db
  .insert(socialAccounts)
  .values({
    userId: metadata.userId,
    platform: metadata.platform,
    platformUsername: username,
    platformUserId: outputs.userId,
    vouchProviderId: payload.requestId,
    profileData: outputs as any,
  })
  .onConflictDoUpdate({
    target: [socialAccounts.userId, socialAccounts.platform],
    set: {
      platformUsername: username,
      platformUserId: outputs.userId,
      vouchProviderId: payload.requestId,
      profileData: outputs as any,
      connectedAt: new Date(),
      disconnectedAt: null,
      updatedAt: new Date(),
    },
  });
```

## Read `reference.md` For

- example service boundaries
- full webhook payload examples with `webProofs`
- parsing and normalization examples
- persistence and upsert patterns you can adapt to your own system

Read `react-native.md` For

- React Native installation requirements
- initialization and verification examples
- links back to the official React Native docs
