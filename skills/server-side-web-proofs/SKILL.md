---
name: vouch
description: Generate cryptographic proofs for HTTP API responses using TLS notarization (tlsnotary + vouch). When Claude needs to prove data authenticity from external APIs (Gmail emails, financial data, any authenticated endpoint), create verifiable audit trails, or implement zero-knowledge proofs of web data.
license: MIT. LICENSE.txt has complete terms
---

# Vouch Web Prover Guide

## Overview

Vouch Web Prover creates cryptographic proofs that an HTTP response came from a specific server. It works by having a trusted notary witness the TLS session, proving:

- The response came from a verified domain (TLS certificate chain)
- The exact request/response content is authentic and unmodified
- The proof can be independently verified by anyone

**Use cases:**
- Prove email authenticity via Gmail API
- Verify financial data from portfolio APIs
- Create audit trails with cryptographic guarantees
- Implement zero-knowledge proofs of web data
- Prove stats, demographics of social media items or whole accounts

## Quick Start

```typescript
import { createVouchClient, buildHeaders } from './scripts/vouch-client';

// Create client (uses VOUCH_CLIENT_ID and VOUCH_SECRET_TOKEN env vars)
const client = createVouchClient();

// Generate proof
const proof = await client.generateWebProof({
  url: 'https://api.example.com/data',
  method: 'GET',
  headers: buildHeaders({ authToken: 'your-token' }),
});

// proof contains: { data, version, meta }
console.log('Proof generated:', proof.version);
console.log('Notary URL:', proof.meta.notaryUrl);

// Store or transmit the proof for verification
fs.writeFileSync('proof.json', JSON.stringify(proof, null, 2));
```

## Environment Setup

```bash
export VOUCH_CLIENT_ID=your-client-id
export VOUCH_SECRET_TOKEN=your-secret-token
```

## Core Operations

### Generate Proof for Public API

```typescript
const client = createVouchClient();

const proof = await client.generateWebProof({
  url: 'https://api.example.com/public/data',
  method: 'GET',
  headers: ['Accept: application/json'],
});

// Save proof artifact
fs.writeFileSync('proof.json', JSON.stringify(proof, null, 2));
```

### Generate Proof with OAuth Token

```typescript
const proof = await client.generateWebProof({
  url: 'https://api.provider.com/v1/resource',
  method: 'GET',
  headers: [
    `Authorization: Bearer ${accessToken}`,
    'Accept: application/json',
  ],
});
```

### Generate Proof with Cookie Authentication

```typescript
const proof = await client.generateWebProof({
  url: 'https://app.example.com/api/data',
  method: 'GET',
  headers: [
    `Authorization: Bearer ${jwtToken}`,
    `Cookie: session=${sessionCookie}; csrf=${csrfToken}`,
    'Accept: application/json',
  ],
});
```

### Verify Proof and Extract Data

The proof object returned by `generateWebProof` can be sent directly to the verify endpoint.
See: https://docs.vlayer.xyz/server-side/rest-api/verify

```typescript
// Verify the proof
const verification = await client.verifyWebProof(proof);

console.log(`Success: ${verification.success}`);
console.log(`Domain: ${verification.serverDomain}`);
console.log(`Notary: ${verification.notaryKeyFingerprint}`);

// Extract verified response data
if (verification.response?.body) {
  const data = JSON.parse(verification.response.body);
  // This data is cryptographically proven authentic
}
```

### Handle Large Responses

```typescript
// Use maxRecvData to limit response size (in bytes)
const proof = await client.generateWebProof({
  url: 'https://api.example.com/large-dataset',
  method: 'GET',
  headers: ['Accept: application/json'],
  maxRecvData: 92160,  // ~90KB limit
});
```

## Common Patterns

### Gmail Email Proof

Prove that an email exists and has specific content:

```typescript
const emailId = '18f1234567890abcd';
const gmailAccessToken = await getGmailAccessToken();

const proof = await client.generateWebProof({
  url: `https://gmail.googleapis.com/gmail/v1/users/me/messages/${emailId}?format=full`,
  method: 'GET',
  headers: buildHeaders({ authToken: gmailAccessToken }),
});

// Store proof for on-chain verification or third-party validation
fs.writeFileSync('gmail-proof.json', JSON.stringify(proof, null, 2));
```

### Financial Portfolio Proof

Prove portfolio balance from authenticated API:

```typescript
const proof = await client.generateWebProof({
  url: 'https://api.broker.com/v1/portfolio/balances',
  method: 'GET',
  headers: buildHeaders({
    authToken: authorizationHeader,
    cookies: sessionCookies,
  }),
});

// Store proof for verification
fs.writeFileSync('portfolio-proof.json', JSON.stringify(proof, null, 2));
```

### Output Proof Artifacts

The skill supports three output modes: file, stdout, or return.

```typescript
import { outputProofArtifacts, persistProofArtifacts, outputToStdout } from './scripts/vouch-client';

const { proof, verification } = await generateAndVerifyProof(client, request);

// Option 1: Save to files (default)
const paths = await persistProofArtifacts({
  proof,
  verification,
  outputDir: './proofs',
  prefix: 'gmail-email',
});
console.log('Saved:', paths.proofPath);

// Option 2: Output to stdout (for piping to other tools)
await outputToStdout({ proof, verification });

// Option 3: Flexible output with all options
const result = await outputProofArtifacts({
  proof,
  verification,
  output: {
    mode: 'stdout',           // 'file' | 'stdout' | 'return'
    outputDir: './proofs',    // Required for mode='file'
    prefix: 'my-proof',       // Filename prefix
    includeVerification: true, // Include verification in output
    pretty: true,             // Pretty print JSON
  },
});

// For mode='return', get the JSON string
if (result.json) {
  const data = JSON.parse(result.json);
}
```

## Header Rules

1. **Format**: `Header-Name: value` (name, colon, space, value)
2. **Skip HTTP/2 pseudo-headers**: `:authority`, `:method`, `:path`
3. **Skip compression**: `Accept-Encoding` causes issues
4. **Always include**: `Accept: application/json` for JSON APIs

Use the `buildHeaders()` helper to handle this automatically:

```typescript
const headers = buildHeaders({
  authToken: 'Bearer xyz',     // or just 'xyz' - Bearer is added automatically
  cookies: 'session=abc',
  accept: 'text/plain',        // Override default Accept header
  additionalHeaders: {
    'X-Custom-Header': 'value',
  },
});
```

## Verification Result Structure

```typescript
interface VerificationResult {
  success: boolean;                    // Proof validity
  serverDomain: string;                // TLS-verified domain
  notaryKeyFingerprint: string;        // Notary public key
  request?: {
    method: string;
    url?: string;                      // Request URL path
    version?: string;                  // HTTP version (e.g., "HTTP/1.1")
    headers?: Array<[string, string]>; // Headers as [name, value] tuples
    body?: string;
    raw?: string;                      // Raw hex-encoded request
    parsingSuccess?: boolean;
  };
  response?: {
    status: number;                    // HTTP status code (e.g., 200)
    version?: string;                  // HTTP version
    headers?: Array<[string, string]>; // Headers as [name, value] tuples
    body?: string;                     // The verified response body
    raw?: string;                      // Raw hex-encoded response
    parsingSuccess?: boolean;
  };
  error?: string;                      // Error message if failed
}
```

## Web Proof Structure

The `WebProof` object returned by `/api/v1/prove` is the cryptographic proof:
See: https://docs.vlayer.xyz/server-side/rest-api/prove

```typescript
interface WebProof {
  data: string;                        // Hex-encoded proof data
  version: string;                     // Version of the TLSN protocol
  meta: {
    notaryUrl: string;                 // Notary service URL
  };
}
```

Example response:
```json
{
  "data": "014000000000000000899cdccd31337c96bb9e...",
  "version": "0.1.0-alpha.12",
  "meta": {
    "notaryUrl": "https://test-notary.vlayer.xyz/v0.1.0-alpha.12"
  }
}
```

## Error Handling

```typescript
try {
  const proof = await client.generateWebProof(request);
} catch (error) {
  const message = (error as Error).message;

  if (message.includes('401')) {
    // Auth expired - refresh token and retry
  } else if (message.includes('timeout')) {
    // Response too large - use maxRecvData
  } else {
    console.error('Proof generation failed:', message);
  }
}
```

## Files

| File | Description |
|------|-------------|
| `SKILL.md` | This guide |
| `reference.md` | API reference and advanced patterns |
| `scripts/vouch-client.ts` | Core client implementation |
| `scripts/example-usage.ts` | Runnable examples |
| `LICENSE.txt` | MIT license |

## Running Examples

```bash
# Test with public API (no auth needed)
bun scripts/example-usage.ts public

# Output proof to stdout instead of files
bun scripts/example-usage.ts public --stdout

# Quiet mode (only JSON output, no progress messages)
bun scripts/example-usage.ts public --stdout --quiet

# Pipe to jq for processing
bun scripts/example-usage.ts public --stdout --quiet | jq .verification.success

# Test with GitHub OAuth token
GITHUB_TOKEN=xxx bun scripts/example-usage.ts oauth

# Test Gmail email proof
bun scripts/example-usage.ts gmail <email-id> <access-token>

# Test cookie-based auth with stdout output
bun scripts/example-usage.ts cookie <auth-header> <cookies> --json

# Custom output directory
bun scripts/example-usage.ts public --output-dir ./my-proofs
```

### CLI Output Options

| Flag | Description |
|------|-------------|
| `--stdout`, `--json` | Output proof JSON to stdout (no files) |
| `--quiet`, `-q` | Suppress progress messages (stderr) |
| `--output-dir DIR` | Directory for proof files (default: ./proofs) |
