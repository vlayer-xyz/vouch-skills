# Vouch Skill

An installable `vouch` skill for building hosted Vouch verification flows with the SDK and webhooks.

## Install With `npx skills`

Install the skill:

```bash
npx skills add vlayer-xyz/vouch-skills --skill vouch
```

## What is Vouch?

Vouch enables data verification from internet platforms. Users can generate cryptographic attestations that prove data authenticity (Proof of Traded Volume at Binance, Proof of Demographics at Instagram etc). This skill provides server-side web proof generation for use within Claude Code and other AI agents.

## Use Cases

- **Non-Doc KYC & KYB** - Verify identity, address, age, ownership, and financial details
- **Candidate Authenticity** - Confirm employment, income, and professional claims
- **Social & Audience Verification** - Validate account ownership and audience metrics
- **Email Authenticity** - Prove email content via Gmail API
- **Financial Data** - Verify portfolio data from authenticated APIs

## What The Skill Covers

The skill covers the main pieces of a hosted Vouch verification flow:

- build a `verificationUrl` with `@getvouch/sdk`
- configure `datasourceId`, `redirectBackUrl`, `webhookUrl`, `metadata`, and `inputs`
- receive the Vouch webhook
- verify `Authorization: PSK <secret>`
- parse `metadata` and `outputs`
- persist the raw event idempotently by `requestId`
- upsert the verified external account into your own data model

## Recommended Patterns

- keep URL generation and webhook processing in separate modules
- encode only correlation fields in `metadata`
- select `datasourceId` from environment or configuration, not inline constants in handlers
- treat `requestId` as both your idempotency key and provider trace ID
- normalize provider-specific output fields before persistence
- store the raw webhook payload before side effects so retries stay safe

## Discover Datasource IDs

You can fetch the current datasource catalog directly:

```bash
curl -s https://app.getvouch.io/api/data-source/catalog
```

To inspect only ids and names:

```bash
curl -s https://app.getvouch.io/api/data-source/catalog | jq '.[] | { id, name, platformName, status }'
```

## React Native

For embedded mobile flows, see the dedicated React Native guide in this repo:

- [`skills/vouch/react-native.md`](skills/vouch/react-native.md)

## Repository Layout

```text
skills/
└── vouch/
    ├── react-native.md
    ├── SKILL.md
    ├── reference.md
    └── LICENSE.txt
```

## Documentation

- [Vouch Documentation](https://docs.getvouch.io)
- [Getting Started](https://docs.getvouch.io/getting-started/first-steps)
- [Widget Builder](https://docs.getvouch.io/getting-started/widget-builder)
- [React Native Guide](skills/vouch/react-native.md)

## License

MIT - Copyright 2026, vlayer.xyz
