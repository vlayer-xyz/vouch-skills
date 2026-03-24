---
name: vouch
description: Build hosted Vouch verification flows with @getvouch/sdk. Generate verification URLs, configure inputs and metadata, verify PSK-protected webhooks, parse outputs, and persist verified accounts. Use when integrating Vouch datasource verification into backend services.
license: MIT. LICENSE.txt has complete terms
---

# Vouch Verification Flow

Use this skill for the full hosted Vouch verification flow:

- build a hosted `verificationUrl` with `@getvouch/sdk`
- pass `datasourceId`, `redirectBackUrl`, `webhookUrl`, `metadata`, and `inputs`
- receive the Vouch webhook on your backend
- verify the webhook secret before parsing the body
- extract normalized fields from `outputs`
- persist the event idempotently by `requestId`
- link the verified account or identity record into your own database

## Quick Start

```typescript
import { Vouch } from "@getvouch/sdk";

const vouch = new Vouch({
  customerId: env.VOUCH_CUSTOMER_ID,
  apiKey: env.VOUCH_API_KEY,
});

const result = await vouch.getDataSourceUrl({
  datasourceId: env.VOUCH_INSTAGRAM_DATASOURCE_ID,
  redirectBackUrl: env.VOUCH_REDIRECT_URL,
  webhookUrl: env.VOUCH_WEBHOOK_URL,
  metadata: JSON.stringify({
    userId: 123,
    platform: "instagram",
  }),
  inputs: {
    username: "creator_handle",
  },
});

console.log(result.verificationUrl);
console.log(result.requestId);
```

## Environment Setup

```bash
export VOUCH_CUSTOMER_ID=your-customer-id
export VOUCH_API_KEY=your-api-key
export VOUCH_WEBHOOK_SECRET=your-webhook-secret
export VOUCH_REDIRECT_URL=https://app.example.com/vouch/complete
export VOUCH_WEBHOOK_URL=https://api.example.com/webhooks/vouch
export VOUCH_INSTAGRAM_DATASOURCE_ID=your-instagram-datasource-id
```

## React Native

For embedded mobile flows, Vouch provides a separate React Native SDK. Use that path when verification should happen inside a React Native app rather than through a hosted browser redirect and webhook flow.

See:

- `react-native.md`

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

const result = await getVouch().getDataSourceUrl({
  datasourceId: env.VOUCH_INSTAGRAM_DATASOURCE_ID,
  redirectBackUrl: env.VOUCH_REDIRECT_URL,
  webhookUrl: env.VOUCH_WEBHOOK_URL,
  metadata: JSON.stringify(metadata),
});

return {
  verificationUrl: result.verificationUrl,
  requestId: result.requestId,
};
```

### Configure `inputs`

```typescript
const result = await getVouch().getDataSourceUrl({
  datasourceId: env.VOUCH_TIKTOK_DATASOURCE_ID,
  redirectBackUrl: env.VOUCH_REDIRECT_URL,
  webhookUrl: env.VOUCH_WEBHOOK_URL,
  metadata: JSON.stringify({
    userId: 123,
    platform: "tiktok",
  }),
  inputs: {
    username: "creator_handle",
    campaignId: "cmp_123",
    locale: "en",
  },
});
```

Use `inputs` for datasource-specific values that Vouch expects during the hosted flow. Keep them explicit at the call site so the request is inspectable and easy to audit.

### Receive And Verify The Webhook

```typescript
app.post("/webhooks/vouch", async (c) => {
  const authHeader = c.req.header("Authorization");
  const expectedAuth = `PSK ${env.VOUCH_WEBHOOK_SECRET}`;

  if (!authHeader || !safeCompare(authHeader, expectedAuth)) {
    throw new UnauthorizedError("Invalid webhook authorization");
  }

  const payload = await c.req.json();
  await processVouchWebhook(payload);

  return c.json({ received: true });
});
```

### Parse Metadata And Outputs

```typescript
const metadata = JSON.parse(payload.metadata ?? "{}") as {
  userId?: number;
  platform?: "instagram" | "tiktok";
};

const outputs = payload.outputs as {
  username?: string;
  handle?: string;
  userId?: string;
  [key: string]: unknown;
};

const username = outputs.username ?? outputs.handle;
```

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
    return;
  }
  throw err;
}
```

## Read `reference.md` For

- example service boundaries
- webhook schema examples
- parsing and normalization examples
- persistence and upsert patterns you can adapt to your own system

Read `react-native.md` For

- React Native installation requirements
- initialization and verification examples
- links back to the official React Native docs
