# Vouch Hosted Verification Reference

This reference outlines a reusable `@getvouch/sdk` integration pattern for hosted verification flows.

## Environment Variables

```bash
VOUCH_CUSTOMER_ID=
VOUCH_API_KEY=
VOUCH_WEBHOOK_SECRET=
VOUCH_REDIRECT_URL=
VOUCH_WEBHOOK_URL=
VOUCH_INSTAGRAM_DATASOURCE_ID=
VOUCH_TIKTOK_DATASOURCE_ID=
```

Keep datasource IDs in configuration so one Vouch client can serve multiple flows.

You can fetch available datasource IDs from the catalog endpoint:

```bash
curl -s https://app.getvouch.io/api/data-source/catalog
```

For a shorter view:

```bash
curl -s https://app.getvouch.io/api/data-source/catalog | jq '.[] | { id, name, platformName, status }'
```

## React Native

If you are implementing an embedded mobile experience, use Vouch's React Native SDK instead of treating the integration as only a hosted web flow. See `react-native.md` for a dedicated setup and example guide.

## Build `verificationUrl` With The SDK

```typescript
import { Vouch } from "@getvouch/sdk";

let vouch: Vouch | null = null;

function getVouch() {
  if (!vouch) {
    vouch = new Vouch({
      customerId: env.VOUCH_CUSTOMER_ID,
      apiKey: env.VOUCH_API_KEY,
    });
  }

  return vouch;
}

type VerificationMetadata = {
  userId: number;
  platform: "instagram" | "tiktok";
};

export async function getVerificationUrl(params: {
  userId: number;
  platform: "instagram" | "tiktok";
  datasourceId: string;
  redirectBackUrl: string;
  webhookUrl: string;
  inputs?: Record<string, unknown>;
}) {
  const metadata: VerificationMetadata = {
    userId: params.userId,
    platform: params.platform,
  };

  const result = await getVouch().getDataSourceUrl({
    datasourceId: params.datasourceId,
    redirectBackUrl: params.redirectBackUrl,
    webhookUrl: params.webhookUrl,
    metadata: JSON.stringify(metadata),
    ...(params.inputs && { inputs: params.inputs }),
  });

  return {
    verificationUrl: result.verificationUrl,
    requestId: result.requestId,
  };
}
```

### Configure `inputs`

Pass datasource-specific inputs directly into `getDataSourceUrl()`:

```typescript
const result = await getVerificationUrl({
  userId: 42,
  platform: "instagram",
  datasourceId: env.VOUCH_INSTAGRAM_DATASOURCE_ID,
  redirectBackUrl: env.VOUCH_REDIRECT_URL,
  webhookUrl: env.VOUCH_WEBHOOK_URL,
  inputs: {
    username: "creator_handle",
    campaignSlug: "spring-launch",
  },
});
```

Recommended pattern:

- put stable internal correlation data in `metadata`
- put datasource-specific runtime fields in `inputs`
- keep `inputs` explicit in application code rather than hiding them in utility layers

## Receive The Webhook

Keep the webhook handler focused on transport and auth, then delegate business logic:

```typescript
import { Hono } from "hono";

const app = new Hono();

app.post("/webhooks/vouch", async (c) => {
  const authHeader = c.req.header("Authorization");
  const expectedAuth = `PSK ${env.VOUCH_WEBHOOK_SECRET}`;

  if (!authHeader || !safeCompare(authHeader, expectedAuth)) {
    throw new UnauthorizedError("Invalid webhook authorization");
  }

  let payload: unknown;
  try {
    payload = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  await processVouchWebhook(payload);
  return c.json({ received: true });
});
```

## Example Webhook Payload

Example delivery shape with the provider envelope and nested verification payload:

```json
{
  "success": true,
  "data": {
    "id": "cmn4pvwmd000004l8e3austkh",
    "requestId": "d0735750-f25c-499c-a1e9-114d6c774913",
    "payload": {
      "outputs": {
        "Likes": "123",
        "Views": "12",
        "Navigation: Back": "12",
        "Views: Followers": "123",
        "Navigation: Exited": "213",
        "Navigation: Forward": "1",
        "Profile visits count": "12322",
        "Views: Non Followers": "123",
        "Navigation: Swipe Froward": "12"
      },
      "requestId": "d0735750-f25c-499c-a1e9-114d6c774913",
      "webProofs": [
        {
          "presentationJson": {
            "data": "014000000000000000da50d7a7d85284964258152220a398fb175d9ac5047a51778bf51a74af0733a640d8405e22b9b395ab2cf8b4136b9ecb0dea65868f4435",
            "meta": {
              "notaryUrl": "https://notary.vlayer.xyz/v0.1.0-alpha.12"
            },
            "version": "0.1.0-alpha.12"
          },
          "decodedTranscript": {
            "recv": "HTTP/1.1 200 OK\r\nDate: Tue, 17 Mar 2026 11:46:08 GMT\r\nContent-Type: application/json;charset=UTF-8\r\nContent-Length: 141\r\nConnection: *****\r\n",
            "sent": "GET /v3/foo/bar HTTP/1.1\r\naccept: application/json\r\naccept-language: **************\r\napp-type: ***\r\nauthorization: ******************************************"
          }
        }
      ],
      "dataSourceId": "687d6f6f-5346-4fb1-9552-222d4a225451"
    },
    "createdAt": "2026-03-24T14:35:47.557Z",
    "updatedAt": "2026-03-24T14:35:47.557Z"
  }
}
```

## Parse The Webhook

Validate the envelope first:

```typescript
import { z } from "zod/v4";

const vouchPayloadSchema = z.object({
  requestId: z.string().min(1),
  dataSourceId: z.string().optional(),
  metadata: z.string().optional(),
  outputs: z.record(z.string(), z.unknown()),
  webProofs: z.array(
    z.object({
      outputs: z.record(z.string(), z.unknown()),
      presentationJson: z.record(z.string(), z.unknown()),
      decodedTranscript: z.record(z.string(), z.unknown()),
    })
  ).optional(),
});
```

Then parse and normalize:

```typescript
const parsed = vouchPayloadSchema.safeParse(rawPayload);
if (!parsed.success) {
  return;
}

const payload = parsed.data;

const metadata = JSON.parse(payload.metadata ?? "{}") as {
  userId?: number;
  platform?: "instagram" | "tiktok";
};

const outputs = payload.outputs as {
  username?: string;
  handle?: string;
  userId?: string;
  displayName?: string;
  avatarUrl?: string;
  verified?: boolean;
  [key: string]: unknown;
};

const username = outputs.username ?? outputs.handle;
```

Recommended pattern:

- keep the transport schema permissive enough for provider evolution
- normalize `outputs` into the fields your application actually uses
- fail closed if `metadata.userId`, `metadata.platform`, or normalized username are missing

## Idempotent Persistence

Store the raw event first:

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

Then link the verified account:

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

This keeps ownership anchored to your internal user model instead of assuming the provider user ID is your primary key.

## Suggested Module Boundaries

- `vouch.service.ts`: Vouch SDK client and `verificationUrl` creation
- `vouch.routes.ts`: webhook auth and JSON parsing
- `social-account.service.ts`: validation, normalization, persistence
- `types/vouch.ts`: metadata and normalized output types
