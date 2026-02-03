# Vouch Web Prover - API Reference

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `https://web-prover.vlayer.xyz/api/v1/prove` | POST | Generate proof |
| `https://web-prover.vlayer.xyz/api/v1/verify` | POST | Verify proof |

## Authentication

All requests require these headers:

```
x-client-id: <VOUCH_CLIENT_ID>
Authorization: Bearer <VOUCH_SECRET_TOKEN>
```

## Prove API

See: https://docs.vlayer.xyz/server-side/rest-api/prove

### Request

```typescript
POST /api/v1/prove
Content-Type: application/json

{
  "url": "https://api.example.com/data",
  "method": "GET",
  "headers": [
    "Authorization: Bearer token123",
    "Accept: application/json"
  ],
  "maxRecvData": 92160  // Optional: limit response size in bytes
}
```

### Response

```typescript
{
  "data": "014000000000000000899cdccd31337c96bb9e519aa438ed73...",
  "version": "0.1.0-alpha.12",
  "meta": {
    "notaryUrl": "https://test-notary.vlayer.xyz/v0.1.0-alpha.12"
  }
}
```

## Verify API

See: https://docs.vlayer.xyz/server-side/rest-api/verify

### Request

Send the proof object directly as the request body:

```typescript
POST /api/v1/verify
Content-Type: application/json

{
  "data": "014000000000000000899cdccd31337c96bb9e519aa438ed73...",
  "version": "0.1.0-alpha.12",
  "meta": {
    "notaryUrl": "https://test-notary.vlayer.xyz/v0.1.0-alpha.12"
  }
}
```

### Response

```typescript
{
  "success": true,
  "serverDomain": "api.example.com",
  "notaryKeyFingerprint": "abc123...",
  "request": {
    "method": "GET",
    "url": "/data",
    "version": "HTTP/1.1",
    "headers": [["authorization", "Bearer ..."], ["accept", "application/json"]],
    "parsingSuccess": true
  },
  "response": {
    "status": 200,
    "version": "HTTP/1.1",
    "headers": [["content-type", "application/json"]],
    "body": "{\"data\": ...}",
    "parsingSuccess": true
  }
}
```

## TypeScript Types

```typescript
interface VouchCredentials {
  clientId: string;
  secretToken: string;
}

interface WebProofRequest {
  url: string;
  method: string;
  headers: string[];
  maxRecvData?: number;
}

interface WebProof {
  data: string;                     // Hex-encoded proof data
  version: string;                  // TLSN protocol version
  meta: {
    notaryUrl: string;              // Notary service URL
  };
}

interface VerificationResult {
  success: boolean;
  serverDomain: string;
  notaryKeyFingerprint: string;
  request?: {
    method: string;
    url?: string;
    version?: string;
    headers?: Array<[string, string]>;  // [name, value] tuples
    body?: string;
    raw?: string;
    parsingSuccess?: boolean;
  };
  response?: {
    status: number;                     // HTTP status code
    version?: string;
    headers?: Array<[string, string]>;  // [name, value] tuples
    body?: string;
    raw?: string;
    parsingSuccess?: boolean;
  };
  error?: string;
}
```

## Advanced Patterns

### Capturing Browser Requests with Playwright

For APIs that require complex authentication (session cookies, CSRF tokens), capture the authenticated request using Playwright:

```typescript
import { chromium } from 'playwright';

async function captureAuthenticatedRequest() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  let capturedHeaders: Record<string, string> = {};
  let capturedCookies = '';

  // Intercept the API request
  page.on('request', (request) => {
    if (request.url().includes('/api/portfolio')) {
      capturedHeaders = request.headers();
      console.log('Captured request to:', request.url());
    }
  });

  // Navigate and authenticate
  await page.goto('https://app.example.com/login');
  await page.fill('#email', process.env.EMAIL!);
  await page.fill('#password', process.env.PASSWORD!);
  await page.click('button[type="submit"]');

  // Wait for the API call
  await page.waitForResponse((r) => r.url().includes('/api/portfolio'));

  // Get cookies
  const cookies = await page.context().cookies();
  capturedCookies = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

  await browser.close();

  return { headers: capturedHeaders, cookies: capturedCookies };
}
```

### Converting Captured Headers to Vouch Format

```typescript
function convertToVouchHeaders(
  headers: Record<string, string>,
  cookies?: string
): string[] {
  const result: string[] = [];
  const skipHeaders = new Set([
    'accept-encoding',
    'connection',
    'host',
    ':authority',
    ':method',
    ':path',
    ':scheme',
  ]);

  for (const [name, value] of Object.entries(headers)) {
    if (skipHeaders.has(name.toLowerCase())) continue;
    if (name.startsWith(':')) continue;
    result.push(`${name}: ${value}`);
  }

  if (cookies) {
    // Replace or add cookie header
    const cookieIndex = result.findIndex((h) =>
      h.toLowerCase().startsWith('cookie:')
    );
    if (cookieIndex >= 0) {
      result[cookieIndex] = `Cookie: ${cookies}`;
    } else {
      result.push(`Cookie: ${cookies}`);
    }
  }

  return result;
}
```

### Extracting Values from Verified Response

```typescript
function extractValue(payload: any, patterns: string[]): number | null {
  for (const pattern of patterns) {
    const value = getNestedValue(payload, pattern);
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value.replace(/[,$]/g, ''));
      if (!isNaN(parsed)) return parsed;
    }
  }
  return null;
}

function getNestedValue(obj: any, path: string): unknown {
  return path.split('.').reduce((acc, key) => {
    if (acc === null || acc === undefined) return undefined;
    if (Array.isArray(acc) && /^\d+$/.test(key)) {
      return acc[parseInt(key)];
    }
    return acc[key];
  }, obj);
}

// Usage
const usdValue = extractValue(responseData, [
  'totalBalanceIn.data.0.total',
  'totalBalanceIn.USD',
  'portfolio.usdValue',
  'balance.total',
]);
```

### Batch Proof Generation

```typescript
async function generateBatchProofs(
  client: VouchClient,
  requests: WebProofRequest[]
): Promise<Array<{ request: WebProofRequest; result: any; error?: Error }>> {
  const results = await Promise.allSettled(
    requests.map((req) => client.generateWebProof(req))
  );

  return results.map((result, index) => ({
    request: requests[index],
    result: result.status === 'fulfilled' ? result.value : null,
    error: result.status === 'rejected' ? result.reason : undefined,
  }));
}
```

### Proof Storage with S3

```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

async function persistToS3(
  proof: WebProof,
  verification: VerificationResult,
  options: { bucket: string; prefix: string }
) {
  const s3 = new S3Client({});
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  const proofKey = `${options.prefix}/proof-${timestamp}.json`;
  const verificationKey = `${options.prefix}/verification-${timestamp}.json`;

  await Promise.all([
    s3.send(
      new PutObjectCommand({
        Bucket: options.bucket,
        Key: proofKey,
        Body: JSON.stringify(proof, null, 2),
        ContentType: 'application/json',
      })
    ),
    s3.send(
      new PutObjectCommand({
        Bucket: options.bucket,
        Key: verificationKey,
        Body: JSON.stringify(verification, null, 2),
        ContentType: 'application/json',
      })
    ),
  ]);

  return { proofKey, verificationKey };
}
```

### Retry with Exponential Backoff

```typescript
async function generateProofWithRetry(
  client: VouchClient,
  request: WebProofRequest,
  maxRetries = 3
): Promise<WebProof> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await client.generateWebProof(request);
    } catch (error) {
      lastError = error as Error;

      // Don't retry auth errors
      if (lastError.message.includes('401')) throw lastError;
      if (lastError.message.includes('403')) throw lastError;

      // Exponential backoff
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
```

## Troubleshooting

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `401 Unauthorized` | Invalid or expired auth token | Refresh OAuth token or session |
| `403 Forbidden` | Missing credentials | Check VOUCH_CLIENT_ID and VOUCH_SECRET_TOKEN |
| `Timeout` | Response too large | Use `maxRecvData` to limit size |
| `Invalid header format` | Malformed header string | Use `Name: value` format |
| `Empty response body` | API returned no data | Check auth and API endpoint |

### Header Issues

```typescript
// WRONG - HTTP/2 pseudo-header
':authority: api.example.com'

// WRONG - Missing space after colon
'Authorization:Bearer token'

// WRONG - Causes compression issues
'Accept-Encoding: gzip, deflate'

// CORRECT
'Authorization: Bearer token'
'Accept: application/json'
'Cookie: session=abc123'
```

### Debug Mode

```typescript
async function debugProofGeneration(
  client: VouchClient,
  request: WebProofRequest
) {
  console.log('=== Request ===');
  console.log('URL:', request.url);
  console.log('Method:', request.method);
  console.log('Headers:');
  request.headers.forEach((h) => console.log(' ', h));

  const proof = await client.generateWebProof(request);

  console.log('\n=== Proof ===');
  console.log('Version:', proof.version);
  console.log('Notary URL:', proof.meta.notaryUrl);
  console.log('Data length:', proof.data.length);

  const verification = await client.verifyWebProof(proof);

  console.log('\n=== Verification ===');
  console.log('Success:', verification.success);
  console.log('Domain:', verification.serverDomain);
  console.log('Notary:', verification.notaryKeyFingerprint);

  if (verification.request) {
    console.log('\nRequest parsing:', verification.request.parsingSuccess);
  }

  if (verification.response) {
    console.log('Response status:', verification.response.status);
    console.log('Response parsing:', verification.response.parsingSuccess);
    console.log('Body length:', verification.response.body?.length ?? 0);
  }

  if (verification.error) {
    console.log('\nError:', verification.error);
  }

  return proof;
}
```

## Integration Checklist

- [ ] Set `VOUCH_CLIENT_ID` and `VOUCH_SECRET_TOKEN` env vars
- [ ] Copy `scripts/vouch-client.ts` to your project
- [ ] Implement proof generation for your API
- [ ] Add verification step after proof generation
- [ ] Create proof artifact storage (local or S3)
- [ ] Add error handling for auth expiration
- [ ] Consider `maxRecvData` for large responses
- [ ] Log verification results for audit trail
- [ ] Test with `scripts/example-usage.ts`
