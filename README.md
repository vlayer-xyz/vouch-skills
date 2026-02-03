# Vouch Skill

Skills for generating cryptographic proofs of HTTP responses using TLS notarization via the [Vouch](https://docs.getvouch.io).

## What is Vouch?

Vouch enables data verification from internet platforms. Users can generate cryptographic attestations that prove data authenticity (Proof of Traded Volume at Binance, Proof of Demographics at Instagram etc). This skill provides server-side web proof generation for use within Claude Code and other AI agents.

## Use Cases

- **Non-Doc KYC & KYB** - Verify identity, address, age, ownership, and financial details
- **Candidate Authenticity** - Confirm employment, income, and professional claims
- **Social & Audience Verification** - Validate account ownership and audience metrics
- **Email Authenticity** - Prove email content via Gmail API
- **Financial Data** - Verify portfolio data from authenticated APIs

## Project Structure

```
skills/server-side-web-proofs/
├── SKILL.md           # User guide and quick start
├── reference.md       # API reference and patterns
├── LICENSE.txt        # MIT license
└── scripts/
    ├── vouch-client.ts    # Core client implementation
    └── example-usage.ts   # CLI examples
```

## Documentation

- [Vouch Documentation](https://docs.getvouch.io)
- [Getting Started](https://docs.getvouch.io/getting-started/first-steps)
- [Verifying Proofs](https://docs.getvouch.io/getting-started/verifying-webproofs)
- [Widget Builder](https://docs.getvouch.io/getting-started/widget-builder)

## License

MIT - Copyright 2026, vlayer.xyz
