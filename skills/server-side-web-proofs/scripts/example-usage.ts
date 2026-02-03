#!/usr/bin/env bun
/**
 * Vouch Web Prover - Example Usage
 *
 * Run from the skills/vouch directory:
 *   bun scripts/example-usage.ts <command> [options]
 *
 * Available commands:
 *   public  - Test with public API (no auth needed)
 *   oauth   - Test with OAuth token (GitHub)
 *   gmail   - Test with Gmail email proof
 *   cookie  - Test with cookie-based auth
 *   large   - Test with large response + size limit
 *
 * Output options:
 *   --stdout       Output proof JSON to stdout (no files created)
 *   --json         Alias for --stdout
 *   --output-dir   Directory for proof files (default: ./proofs)
 *   --quiet        Suppress progress messages (useful with --stdout)
 */

import {
  createVouchClient,
  generateAndVerifyProof,
  buildHeaders,
  printVerificationResult,
  outputProofArtifacts,
  type OutputMode,
} from './vouch-client';

// ============================================================================
// CLI Options
// ============================================================================

interface CliOptions {
  command: string;
  outputMode: OutputMode;
  outputDir: string;
  quiet: boolean;
  args: string[];
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    command: 'help',
    outputMode: 'file',
    outputDir: './proofs',
    quiet: false,
    args: [],
  };

  const positional: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--stdout' || arg === '--json') {
      options.outputMode = 'stdout';
    } else if (arg === '--quiet' || arg === '-q') {
      options.quiet = true;
    } else if (arg === '--output-dir' || arg === '-o') {
      options.outputDir = argv[++i] || './proofs';
    } else if (arg.startsWith('--output-dir=')) {
      options.outputDir = arg.split('=')[1];
    } else if (!arg.startsWith('-')) {
      positional.push(arg);
    }
  }

  if (positional.length > 0) {
    options.command = positional[0];
    options.args = positional.slice(1);
  }

  return options;
}

function log(options: CliOptions, ...args: unknown[]) {
  if (!options.quiet) {
    console.error(...args);
  }
}

// ============================================================================
// Example 1: Public API (no auth)
// ============================================================================

async function examplePublicApi(options: CliOptions) {
  log(options, '\n=== Example: Public API ===\n');

  const client = createVouchClient();

  log(options, 'Generating proof for GitHub Zen API...');
  const { proof, verification, responseData } = await generateAndVerifyProof(
    client,
    {
      url: 'https://api.github.com/zen',
      method: 'GET',
      headers: buildHeaders({ accept: 'text/plain' }),
    }
  );

  if (verification && !options.quiet) {
    printVerificationResult(verification);
    log(options, '\nVerified response:', responseData);
  }

  const result = await outputProofArtifacts({
    proof,
    verification,
    output: {
      mode: options.outputMode,
      outputDir: options.outputDir,
      prefix: 'public-api',
    },
  });

  if (result.paths) {
    log(options, '\nSaved:', result.paths.proofPath);
  }
}

// ============================================================================
// Example 2: OAuth Bearer Token API
// ============================================================================

async function exampleOAuthApi(options: CliOptions, accessToken: string) {
  log(options, '\n=== Example: OAuth API (GitHub User) ===\n');

  const client = createVouchClient();

  log(options, 'Generating proof for GitHub user endpoint...');
  const { proof, verification, responseData } = await generateAndVerifyProof(
    client,
    {
      url: 'https://api.github.com/user',
      method: 'GET',
      headers: buildHeaders({ authToken: accessToken }),
    }
  );

  if (verification && !options.quiet) {
    printVerificationResult(verification);

    if (responseData && typeof responseData === 'object') {
      const user = responseData as Record<string, unknown>;
      log(options, '\nVerified user:', user.login);
      log(options, 'Name:', user.name);
    }
  }

  const result = await outputProofArtifacts({
    proof,
    verification,
    output: {
      mode: options.outputMode,
      outputDir: options.outputDir,
      prefix: 'github-user',
    },
  });

  if (result.paths) {
    log(options, '\nSaved:', result.paths.proofPath);
  }
}

// ============================================================================
// Example 3: Gmail Email Proof
// ============================================================================

async function exampleGmailProof(
  options: CliOptions,
  emailId: string,
  gmailAccessToken: string
) {
  log(options, '\n=== Example: Gmail Email Proof ===\n');

  const client = createVouchClient();

  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${emailId}?format=full`;

  log(options, 'Generating proof for email:', emailId);
  const { proof, verification, responseData } = await generateAndVerifyProof(
    client,
    {
      url,
      method: 'GET',
      headers: buildHeaders({ authToken: gmailAccessToken }),
    }
  );

  if (verification && !options.quiet) {
    printVerificationResult(verification);

    // Extract email subject from verified data
    if (responseData && typeof responseData === 'object') {
      const email = responseData as Record<string, unknown>;
      const payload = email.payload as { headers?: Array<{ name: string; value: string }> } | undefined;
      const subjectHeader = payload?.headers?.find(
        (h) => h.name === 'Subject'
      );
      const fromHeader = payload?.headers?.find((h) => h.name === 'From');

      if (subjectHeader) {
        log(options, '\nVerified email subject:', subjectHeader.value);
      }
      if (fromHeader) {
        log(options, 'Verified from:', fromHeader.value);
      }
    }
  }

  const result = await outputProofArtifacts({
    proof,
    verification,
    output: {
      mode: options.outputMode,
      outputDir: options.outputDir,
      prefix: `gmail-${emailId}`,
    },
  });

  if (result.paths) {
    log(options, '\nSaved:', result.paths.proofPath);
  }
}

// ============================================================================
// Example 4: Cookie-Based Authentication
// ============================================================================

async function exampleCookieAuth(
  options: CliOptions,
  authHeader: string,
  cookies: string
) {
  log(options, '\n=== Example: Cookie Auth API ===\n');

  const client = createVouchClient();

  // Example: Securitize portfolio endpoint
  const url = 'https://id.securitize.io/gw/sid-gw/api/v1/portfolio/balances';

  log(options, 'Generating proof for authenticated API...');
  const { proof, verification, responseData } = await generateAndVerifyProof(
    client,
    {
      url,
      method: 'GET',
      headers: buildHeaders({
        authToken: authHeader,
        cookies: cookies,
      }),
    }
  );

  if (verification && !options.quiet) {
    printVerificationResult(verification);

    // Extract portfolio value from verified data
    if (responseData && typeof responseData === 'object') {
      const data = responseData as { totalBalanceIn?: { data?: Array<{ total?: number }> } };
      const usdValue = data?.totalBalanceIn?.data?.[0]?.total;
      if (usdValue !== undefined) {
        log(options, '\nVerified portfolio value (USD):', usdValue);
      }
    }
  }

  const result = await outputProofArtifacts({
    proof,
    verification,
    output: {
      mode: options.outputMode,
      outputDir: options.outputDir,
      prefix: 'portfolio',
    },
  });

  if (result.paths) {
    log(options, '\nSaved:', result.paths.proofPath);
  }
}

// ============================================================================
// Example 5: Large Response with Size Limit
// ============================================================================

async function exampleLargeResponse(options: CliOptions) {
  log(options, '\n=== Example: Large Response (with size limit) ===\n');

  const client = createVouchClient();

  // Example: Polish fund quotation API
  const url = 'https://www.analizy.pl/api/quotation/fiz/PTN09';

  log(options, 'Generating proof with maxRecvData=92160...');
  const { proof, verification, responseData } = await generateAndVerifyProof(
    client,
    {
      url,
      method: 'GET',
      headers: buildHeaders({}),
      maxRecvData: 92160, // ~90KB limit
    }
  );

  if (verification && !options.quiet) {
    printVerificationResult(verification);

    if (responseData && typeof responseData === 'object') {
      const data = responseData as Record<string, unknown>;
      log(options, '\nVerified data keys:', Object.keys(data));
    }
  }

  const result = await outputProofArtifacts({
    proof,
    verification,
    output: {
      mode: options.outputMode,
      outputDir: options.outputDir,
      prefix: 'large-response',
    },
  });

  if (result.paths) {
    log(options, '\nSaved:', result.paths.proofPath);
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const options = parseArgs(process.argv.slice(2));

  try {
    switch (options.command) {
      case 'public':
        await examplePublicApi(options);
        break;

      case 'oauth': {
        const token = options.args[0] || process.env.GITHUB_TOKEN;
        if (!token) {
          console.error(
            'Usage: bun scripts/example-usage.ts oauth <github-token> [--stdout]'
          );
          console.error('Or set GITHUB_TOKEN env var');
          process.exit(1);
        }
        await exampleOAuthApi(options, token);
        break;
      }

      case 'gmail': {
        const emailId = options.args[0];
        const gmailToken = options.args[1] || process.env.GMAIL_ACCESS_TOKEN;
        if (!emailId || !gmailToken) {
          console.error(
            'Usage: bun scripts/example-usage.ts gmail <email-id> <access-token> [--stdout]'
          );
          process.exit(1);
        }
        await exampleGmailProof(options, emailId, gmailToken);
        break;
      }

      case 'cookie': {
        const auth = options.args[0];
        const cookies = options.args[1];
        if (!auth || !cookies) {
          console.error(
            'Usage: bun scripts/example-usage.ts cookie <auth-header> <cookies> [--stdout]'
          );
          process.exit(1);
        }
        await exampleCookieAuth(options, auth, cookies);
        break;
      }

      case 'large':
        await exampleLargeResponse(options);
        break;

      case 'help':
      default:
        console.log('Vouch Web Prover - Example Usage\n');
        console.log('Commands:');
        console.log('  public  - Test with public API (no auth needed)');
        console.log('  oauth   - Test with OAuth token (requires GITHUB_TOKEN)');
        console.log('  gmail   - Test Gmail email proof');
        console.log('  cookie  - Test cookie-based auth');
        console.log('  large   - Test large response with size limit');
        console.log('\nOutput options:');
        console.log('  --stdout, --json   Output proof JSON to stdout');
        console.log('  --quiet, -q        Suppress progress messages');
        console.log('  --output-dir DIR   Directory for proof files');
        console.log('\nExamples:');
        console.log('  bun scripts/example-usage.ts public');
        console.log('  bun scripts/example-usage.ts public --stdout');
        console.log('  bun scripts/example-usage.ts public --stdout --quiet');
        console.log('  bun scripts/example-usage.ts public --stdout | jq .verification.success');
        console.log('  GITHUB_TOKEN=xxx bun scripts/example-usage.ts oauth --json');
        console.log(
          '  bun scripts/example-usage.ts gmail <email-id> <token> --stdout'
        );
        break;
    }
  } catch (error) {
    console.error('\nError:', (error as Error).message);
    process.exit(1);
  }
}

main();
