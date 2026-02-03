/**
 * Vouch Web Prover Client
 *
 * Generates cryptographic proofs for HTTP requests using TLS notarization.
 * Zero dependencies - uses only standard fetch API.
 *
 * Required env vars:
 *   VOUCH_CLIENT_ID
 *   VOUCH_SECRET_TOKEN
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Configuration
// ============================================================================

export const VOUCH_CONFIG = {
  PROVE_URL: 'https://web-prover.vlayer.xyz/api/v1/prove',
  VERIFY_URL: 'https://web-prover.vlayer.xyz/api/v1/verify',
} as const;

// ============================================================================
// Types
// ============================================================================

export interface VouchCredentials {
  clientId: string;
  secretToken: string;
}

/**
 * Specifies which parts of the request/response should be redacted in the proof
 * Redacted data is hidden but the proof remains valid
 */
export interface HeaderRedaction {
  request?: {
    /** Header names to redact (e.g., ["Authorization", "Cookie"]) */
    headers?: string[];
  };
}

export interface WebProofRequest {
  /** Full URL to request */
  url: string;
  /** HTTP method (GET, POST, etc.) */
  method: string;
  /** Headers in "Name: value" format */
  headers: string[];
  /** Optional: limit response size in bytes (useful for large APIs) */
  maxRecvData?: number;
  /** Optional: specify which headers to redact from the proof */
  redaction?: HeaderRedaction[];
}

/**
 * Web Proof Response from /api/v1/prove endpoint
 * This is the cryptographic proof that can be verified independently
 * @see https://docs.vlayer.xyz/server-side/rest-api/prove
 */
export interface WebProof {
  /** Hex-encoded proof data */
  data: string;
  /** Version of the TLSN protocol used */
  version: string;
  /** Metadata about the verification process */
  meta: {
    notaryUrl: string;
  };
}

export interface VerificationResult {
  /** Whether the proof is valid */
  success: boolean;
  /** Verified server domain from TLS certificate */
  serverDomain: string;
  /** Notary public key fingerprint */
  notaryKeyFingerprint: string;
  /** Parsed request details */
  request?: {
    method: string;
    url?: string;
    version?: string;
    /** Headers as array of [name, value] tuples */
    headers?: Array<[string, string]>;
    body?: string;
    raw?: string;
    parsingSuccess?: boolean;
  };
  /** Parsed response details */
  response?: {
    /** HTTP status code */
    status: number;
    version?: string;
    /** Headers as array of [name, value] tuples */
    headers?: Array<[string, string]>;
    /** The actual response body - this is the verified data */
    body?: string;
    raw?: string;
    parsingSuccess?: boolean;
  };
  /** Error message if verification failed */
  error?: string;
}

// ============================================================================
// Client
// ============================================================================

export class VouchClient {
  private credentials: VouchCredentials;

  constructor(credentials: VouchCredentials) {
    this.credentials = credentials;
  }

  /**
   * Generate a cryptographic proof for an HTTP request
   * @see https://docs.vlayer.xyz/server-side/rest-api/prove
   */
  async generateWebProof(request: WebProofRequest): Promise<WebProof> {
    const requestBody: Record<string, unknown> = {
      url: request.url,
      method: request.method,
      headers: request.headers,
    };

    if (request.maxRecvData !== undefined) {
      requestBody.maxRecvData = request.maxRecvData;
    }

    if (request.redaction !== undefined && request.redaction.length > 0) {
      requestBody.redaction = request.redaction;
    }

    const response = await fetch(VOUCH_CONFIG.PROVE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': this.credentials.clientId,
        Authorization: `Bearer ${this.credentials.secretToken}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Vouch API error (${response.status}): ${errorText}`);
    }

    return (await response.json()) as WebProof;
  }

  /**
   * Verify a proof and extract the authenticated response
   * @see https://docs.vlayer.xyz/server-side/rest-api/verify
   */
  async verifyWebProof(proof: WebProof): Promise<VerificationResult> {
    const response = await fetch(VOUCH_CONFIG.VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': this.credentials.clientId,
        Authorization: `Bearer ${this.credentials.secretToken}`,
      },
      body: JSON.stringify(proof),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Verification API error (${response.status}): ${errorText}`);
    }

    return (await response.json()) as VerificationResult;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create VouchClient with credentials from environment variables
 */
export function createVouchClient(): VouchClient {
  const clientId = process.env.VOUCH_CLIENT_ID;
  const secretToken = process.env.VOUCH_SECRET_TOKEN;

  if (!clientId || !secretToken) {
    throw new Error(
      'Missing VOUCH_CLIENT_ID or VOUCH_SECRET_TOKEN environment variables'
    );
  }

  return new VouchClient({ clientId, secretToken });
}

/**
 * Generate proof and verify in one step
 */
export async function generateAndVerifyProof(
  client: VouchClient,
  request: WebProofRequest
): Promise<{
  proof: WebProof;
  verification: VerificationResult;
  responseData: unknown | null;
}> {
  const proof = await client.generateWebProof(request);
  const verification = await client.verifyWebProof(proof);

  let responseData: unknown = null;
  if (verification.response?.body) {
    try {
      responseData = JSON.parse(verification.response.body);
    } catch {
      responseData = verification.response.body;
    }
  }

  return { proof, verification, responseData };
}

// ============================================================================
// Header Helpers
// ============================================================================

/**
 * Sanitize header for Vouch format
 * Returns null if header should be skipped
 */
export function sanitizeHeader(header: string): string | null {
  const trimmed = header.trim();
  if (!trimmed) return null;

  const colonIndex = trimmed.indexOf(':');
  if (colonIndex === -1) return null;

  const name = trimmed.slice(0, colonIndex).trim();
  const value = trimmed.slice(colonIndex + 1).trim();

  if (!name || !value) return null;
  if (name.startsWith(':')) return null; // HTTP/2 pseudo-header
  if (name.toLowerCase() === 'accept-encoding') return null; // Compression issues

  return `${name}: ${value}`;
}

/**
 * Result from buildHeadersWithRedaction
 */
export interface HeadersWithRedaction {
  /** Headers in "Name: value" format */
  headers: string[];
  /** Redaction config for sensitive headers */
  redaction: HeaderRedaction[];
}

/**
 * Build headers array from common parameters
 */
export function buildHeaders(options: {
  authToken?: string;
  cookies?: string;
  accept?: string;
  additionalHeaders?: Record<string, string>;
}): string[] {
  const headers: string[] = [];

  // Accept header
  headers.push(`Accept: ${options.accept || 'application/json'}`);

  // Authorization
  if (options.authToken) {
    const token = options.authToken.startsWith('Bearer ')
      ? options.authToken
      : `Bearer ${options.authToken}`;
    headers.push(`Authorization: ${token}`);
  }

  // Cookies
  if (options.cookies) {
    headers.push(`Cookie: ${options.cookies}`);
  }

  // Additional headers
  if (options.additionalHeaders) {
    for (const [name, value] of Object.entries(options.additionalHeaders)) {
      const sanitized = sanitizeHeader(`${name}: ${value}`);
      if (sanitized) headers.push(sanitized);
    }
  }

  return headers;
}

/**
 * Build headers with automatic redaction tracking for sensitive headers.
 * Sensitive headers (Authorization, Cookie, X-Api-Key, etc.) are automatically
 * marked for redaction unless explicitly excluded.
 *
 * @param options.authToken - Bearer token for Authorization header (redacted by default)
 * @param options.cookies - Cookie header value (redacted by default)
 * @param options.accept - Accept header value (not redacted)
 * @param options.additionalHeaders - Extra headers as key-value pairs
 * @param options.sensitiveHeaders - Additional header names to mark as sensitive
 * @param options.excludeFromRedaction - Header names to NOT redact even if sensitive
 *
 * @example
 * // Basic usage - Authorization automatically redacted
 * const { headers, redaction } = buildHeadersWithRedaction({
 *   authToken: accessToken
 * });
 *
 * @example
 * // With additional sensitive header
 * const { headers, redaction } = buildHeadersWithRedaction({
 *   authToken: accessToken,
 *   additionalHeaders: { 'X-Api-Key': 'secret123' },
 *   sensitiveHeaders: ['X-Api-Key']
 * });
 *
 * @example
 * // Exclude a normally-sensitive header from redaction
 * const { headers, redaction } = buildHeadersWithRedaction({
 *   authToken: publicToken,
 *   excludeFromRedaction: ['Authorization']
 * });
 */
export function buildHeadersWithRedaction(options: {
  authToken?: string;
  cookies?: string;
  accept?: string;
  additionalHeaders?: Record<string, string>;
  /** Additional header names to mark as sensitive (will be redacted) */
  sensitiveHeaders?: string[];
  /** Header names to exclude from redaction even if normally sensitive */
  excludeFromRedaction?: string[];
}): HeadersWithRedaction {
  const headers: string[] = [];
  const redactHeaders: string[] = [];

  // Default sensitive headers
  const defaultSensitive = new Set(['authorization', 'cookie', 'x-api-key']);
  const excludeSet = new Set(
    (options.excludeFromRedaction || []).map((h) => h.toLowerCase())
  );

  // Helper to check if header should be redacted
  const shouldRedact = (headerName: string): boolean => {
    const lower = headerName.toLowerCase();
    if (excludeSet.has(lower)) return false;
    if (defaultSensitive.has(lower)) return true;
    if (options.sensitiveHeaders?.some((h) => h.toLowerCase() === lower))
      return true;
    return false;
  };

  // Accept header (not sensitive)
  headers.push(`Accept: ${options.accept || 'application/json'}`);

  // Authorization
  if (options.authToken) {
    const token = options.authToken.startsWith('Bearer ')
      ? options.authToken
      : `Bearer ${options.authToken}`;
    headers.push(`Authorization: ${token}`);
    if (shouldRedact('Authorization')) {
      redactHeaders.push('Authorization');
    }
  }

  // Cookies
  if (options.cookies) {
    headers.push(`Cookie: ${options.cookies}`);
    if (shouldRedact('Cookie')) {
      redactHeaders.push('Cookie');
    }
  }

  // Additional headers
  if (options.additionalHeaders) {
    for (const [name, value] of Object.entries(options.additionalHeaders)) {
      const sanitized = sanitizeHeader(`${name}: ${value}`);
      if (sanitized) {
        headers.push(sanitized);
        if (shouldRedact(name)) {
          redactHeaders.push(name);
        }
      }
    }
  }

  // Build redaction config
  const redaction: HeaderRedaction[] = [];
  if (redactHeaders.length > 0) {
    redaction.push({
      request: {
        headers: redactHeaders,
      },
    });
  }

  return { headers, redaction };
}

/**
 * Convert headers object to Vouch format array
 */
export function headersObjectToArray(
  headers: Record<string, string>,
  options?: { skipHeaders?: string[] }
): string[] {
  const skip = new Set([
    'accept-encoding',
    'connection',
    'host',
    ':authority',
    ':method',
    ':path',
    ':scheme',
    ...(options?.skipHeaders || []),
  ]);

  const result: string[] = [];

  for (const [name, value] of Object.entries(headers)) {
    if (skip.has(name.toLowerCase())) continue;
    if (name.startsWith(':')) continue;

    const sanitized = sanitizeHeader(`${name}: ${value}`);
    if (sanitized) result.push(sanitized);
  }

  return result;
}

// ============================================================================
// Output Types
// ============================================================================

export type OutputMode = 'file' | 'stdout' | 'return';

export interface ProofArtifactPaths {
  proofPath: string;
  verificationPath: string;
}

export interface ProofArtifactOutput {
  /** Output mode used */
  mode: OutputMode;
  /** File paths (only when mode='file') */
  paths?: ProofArtifactPaths;
  /** JSON string output (only when mode='return') */
  json?: string;
}

export interface OutputOptions {
  /** How to output: 'file' saves to disk, 'stdout' prints to console, 'return' returns JSON string */
  mode: OutputMode;
  /** Output directory (required for mode='file') */
  outputDir?: string;
  /** Filename prefix (for mode='file') */
  prefix?: string;
  /** Include verification in output (default: true) */
  includeVerification?: boolean;
  /** Pretty print JSON (default: true) */
  pretty?: boolean;
}

// ============================================================================
// Storage Helpers
// ============================================================================

/**
 * Output proof artifacts to file, stdout, or return as string
 */
export async function outputProofArtifacts(options: {
  proof: WebProof;
  verification: VerificationResult | null;
  output: OutputOptions;
}): Promise<ProofArtifactOutput> {
  const { proof, verification, output } = options;
  const { mode, pretty = true, includeVerification = true } = output;
  const indent = pretty ? 2 : 0;

  // Build combined output object
  const combinedOutput = includeVerification
    ? { proof, verification }
    : { proof };

  switch (mode) {
    case 'stdout': {
      const json = JSON.stringify(combinedOutput, null, indent);
      process.stdout.write(json + '\n');
      return { mode: 'stdout' };
    }

    case 'return': {
      const json = JSON.stringify(combinedOutput, null, indent);
      return { mode: 'return', json };
    }

    case 'file':
    default: {
      const { outputDir, prefix = 'proof' } = output;
      if (!outputDir) {
        throw new Error('outputDir is required for file output mode');
      }

      // Ensure directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const proofPath = path.join(outputDir, `${prefix}-${timestamp}.json`);
      const verificationPath = path.join(
        outputDir,
        `${prefix}-verification-${timestamp}.json`
      );

      fs.writeFileSync(proofPath, JSON.stringify(proof, null, indent));

      if (verification && includeVerification) {
        fs.writeFileSync(
          verificationPath,
          JSON.stringify(verification, null, indent)
        );
      }

      return {
        mode: 'file',
        paths: { proofPath, verificationPath },
      };
    }
  }
}

/**
 * Persist proof and verification to files (convenience wrapper)
 */
export async function persistProofArtifacts(options: {
  proof: WebProof;
  verification: VerificationResult | null;
  outputDir: string;
  prefix?: string;
}): Promise<ProofArtifactPaths> {
  const result = await outputProofArtifacts({
    proof: options.proof,
    verification: options.verification,
    output: {
      mode: 'file',
      outputDir: options.outputDir,
      prefix: options.prefix,
    },
  });

  return result.paths!;
}

/**
 * Output proof artifacts to stdout as JSON
 */
export async function outputToStdout(options: {
  proof: WebProof;
  verification: VerificationResult | null;
  includeVerification?: boolean;
  pretty?: boolean;
}): Promise<void> {
  await outputProofArtifacts({
    proof: options.proof,
    verification: options.verification,
    output: {
      mode: 'stdout',
      includeVerification: options.includeVerification,
      pretty: options.pretty,
    },
  });
}

// ============================================================================
// Logging Helpers
// ============================================================================

/**
 * Print verification result to console
 */
export function printVerificationResult(verification: VerificationResult): void {
  console.log('\nVerification Results:');
  console.log('═'.repeat(60));
  console.log(`Status: ${verification.success ? 'VERIFIED' : 'FAILED'}`);
  console.log(`Server Domain: ${verification.serverDomain}`);
  console.log(`Notary Key: ${verification.notaryKeyFingerprint}`);

  if (verification.request) {
    console.log(`\nRequest Method: ${verification.request.method}`);
    console.log(
      `Request Parsing: ${verification.request.parsingSuccess ? 'OK' : 'FAILED'}`
    );
    if (verification.request.headers?.length) {
      console.log(`Request Headers: ${verification.request.headers.length}`);
    }
  }

  if (verification.response) {
    console.log(`\nResponse Status: ${verification.response.status}`);
    console.log(
      `Response Parsing: ${verification.response.parsingSuccess ? 'OK' : 'FAILED'}`
    );

    if (verification.response.body) {
      const preview = verification.response.body.slice(0, 300);
      const suffix = verification.response.body.length > 300 ? '...' : '';
      console.log(`\nResponse Body Preview:\n${preview}${suffix}`);
    }
  }

  if (verification.error) {
    console.log(`\nError: ${verification.error}`);
  }

  console.log('═'.repeat(60));
}

// ============================================================================
// Exports
// ============================================================================

export default VouchClient;
