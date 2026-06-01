---
name: vouch-datasource-catalog
description: Complete reference for all Vouch datasources: IDs, required inputs, geography, and category. Use when selecting a datasourceId for getDataSourceUrl(), understanding what inputs a datasource requires, or identifying which datasources are mobile-only or suppress webProofs.
license: MIT. LICENSE.txt has complete terms
---

# Vouch Datasource Catalog

176 available datasources across 5 categories. Fetch the live catalog at any time:

```bash
curl -s https://app.getvouch.io/api/data-source/catalog | jq '.[] | { id, name, geography, inputs: [.inputs[].name] }'
```

## Key Concepts

**`inputs`** — datasource-specific values passed to `getDataSourceUrl()`. If empty, the user authenticates directly with no pre-filled fields.

**`mobile-only`** — only works via the React Native SDK (`VouchSDK.start()`), not the hosted web flow (`getDataSourceUrl()`).

**`webProofs` suppression** — sensitive datasources (financial identity, address, credit) omit the `webProofs` array from the webhook payload. Verified `outputs` are still delivered.

**Geography** — `Global` works everywhere. `USA`, `United Kingdom`, `Poland`, `Rest of the World` are regionally restricted.

---

## Social & Digital Accounts

### Instagram

| ID | Name | Inputs |
|----|------|--------|
| `b3ce6074-5fd0-43cb-a9a1-230c8e0686b5` | Proof of Account Ownership | — |
| `687d6f6f-5346-4fb1-9552-222d4a225451` | Proof of Account with Stats and Demographics | `ig_handle` |
| `31503c92-29a9-4bb3-a1dc-ccd1512a46f2` | Proof of Account with Stats | `ig_handle` |
| `46338b90-bfec-4ef2-8de5-ba40a051be62` | Proof of Handle and Followers | — |
| `ec4a1734-a032-4a0e-bf10-0ddd25c455e1` | Proof of Demographics | `handle` |
| `1941113a-e9bb-4135-8838-324e8ecb4afa` | Proof of Demographics (with gender) | `handle` |
| `03193267-933e-45dd-adbd-b2e8801b5946` | Proof of Like | `post_id` |
| `24bfb529-03de-435c-849d-5f42c41db300` | Proof of Story Stats | `story_id` |
| `45d8ef4e-c0e0-4e1a-8c74-ca015b12a710` | Proof of Video Stats (Reach + Followers vs Non-Followers) | `video_id` |
| `d4e3eadf-9346-4222-a987-29d6ac144e37` | Proof of Post Stats + Account Viewership Demographics | `post_id`, `ig_handle` |
| `d11aca46-a06d-45aa-b524-a78ee14150c6` | Proof of Posts with Views Stats & Account Audience Demographics | `post_id`, `ig_handle` |
| `0f8ed9c5-9ed2-4868-a2b3-331aaed0cc2e` | Proof of Carousel Posts with Views Stats (auto-redirect) | `post_id`, `ig_handle` |
| `d63ad139-3bdc-4d3c-bb07-ea6bc976c7c4` | Proof of Carousel Posts with Views Stats | `insights_url` |
| `bf69d512-af98-438c-aac5-c4c533df1dd9` | Proof of Video Upload | `video_id`, `upload_url` |

### TikTok

| ID | Name | Inputs | Notes |
|----|------|--------|-------|
| `a5e5f9fd-2c66-49d4-8493-6f6cac2836db` | Proof of Account Ownership | — | |
| `89d14f5c-d7ab-46f3-b97e-7726144a8389` | Proof of Detailed Account Stats (past 365 days) | `handle` | |
| `f6a72991-fdfa-4030-9f7c-f2bc15db391a` | Proof of Account Viewership Demographics | — | |
| `d228c146-767e-432d-afd5-ee3a6cd02d78` | Proof of Video Stats | `post_id` | |
| `50b4f1f7-ae40-4791-9c85-c72172c0d2a0` | Proof of Video Viewership Demographics | `post_id`, `handle` | |
| `2d8bc652-d285-4a51-9d08-52683b9a457f` | Proof of Video Upload | `post_id`, `upload_url` | USA only |

### YouTube

| ID | Name | Inputs |
|----|------|--------|
| `d004be86-3af3-4874-92f6-eb6635e4dd76` | Proof of Account | `channel_id` |
| `ee29f289-98a5-4367-ac5e-7b821f0c4cab` | Proof of Account with Stats | `channel_id` |
| `349b1e1e-dace-4149-b46b-3bf1509176ed` | Proof of Account with Demographics (last 365 days) | `channel_id` |
| `d91b8326-e22f-4679-a55c-4dbc9a94cd67` | Proof of Detailed Account Stats | `channel_name`, `studio_id` |
| `ffe88da7-0af0-421c-8aea-5bbc43bae9d2` | Proof of Video Stats | `video_id`, `channel_name` |
| `3a723c80-1f81-4a18-aff0-73e55654aeff` | Proof of Video Stats (Gender and Age) | `video_id`, `channel_name` |
| `8d712364-39ec-4ac1-9e0d-a6216d3f4bf2` | Proof of Video Demographics | `video_id` |
| `0ab93cf0-2528-4679-8951-6b64f3644d42` | Proof of Video Demographics (Last 7 days) | `video_id` |
| `a0784631-b211-4730-9eb7-86588836ec39` | Proof of Video Demographics (past year) | `video_id` |
| `f88090dd-afe3-40b8-a4f3-4497de06ec33` | Proof of Video Demographics (lifetime) | `video_id`, `channel_name` |
| `dff4797f-32fa-4e01-832c-a228393f35cb` | Proof of Video Upload | `video_id`, `channel_name`, `upload_url` |

### X (Twitter)

| ID | Name | Inputs |
|----|------|--------|
| `dcded570-8ba7-40f4-8e77-b2fcd9d39028` | Proof of Account Ownership | — |
| `12ea08f3-ae24-4bce-bf2c-6f59459b40b2` | Proof of Followership | `twitter_username` |
| `828fedd7-ef91-441b-9061-c380317a5d33` | Proof of Daily User Engagement Metrics | — |
| `e3981c4a-d52f-48ad-80b7-2b788eb8a4cc` | Proof of Tweet | `post_url` |
| `08e67def-906c-40e0-a4c4-16f8b7c38ba9` | Proof of Tweet Stats | `post_id` |
| `2e79ef11-a4cb-4e05-a12d-718dc845ace4` | Proof of Tweet Audience Demographics | `post_id` |

### LinkedIn

| ID | Name | Inputs |
|----|------|--------|
| `47d19d17-4697-4c75-b608-94a9a8d9c195` | Proof of Account Ownership | — |
| `5221e1bc-7973-43e2-bdcd-87dd1d1fd5e5` | Proof of Account Age | — |
| `a964443e-a08c-4d62-8b47-da14ce1e3713` | Proof of Account Age (with email) | — |
| `1cd42f5b-cf6d-4508-9bf2-d98515f69a08` | Proof of Followership (desktop) | `username`, `account_id` |

### GitHub

| ID | Name | Inputs |
|----|------|--------|
| `7a098552-b6e9-4771-bbb4-7e3fe04caaf7` | Proof of Account Ownership | — |
| `ee72bdf7-cf47-424a-9705-75a96e39153e` | Proof of Contributions | `github_owner`, `github_repo`, `github_username` |

### Twitch

| ID | Name | Inputs |
|----|------|--------|
| `688f711a-a061-4f65-a03f-5e58956c8fb6` | Proof of Account | — |
| `7155b0b9-ddb7-49d4-b238-f85f8fd12f20` | Proof of Stream Viewer Location Demographics | `username`, `stream_id` |

### Other Social & Digital

| ID | Name | Inputs | Geography |
|----|------|--------|-----------|
| `73555d97-24bb-4786-ad2f-3d34a03739da` | Gmail — Proof of Email (Web) | — | Global |
| `2c4faf94-f5c8-4fcc-8c3e-463eef4ece5c` | Airbnb — Proof of Guest Identity | — | Global |
| `7d68a7b4-dca6-42e2-ae23-bae5ce2818d5` | Amazon — Proof of Prime Account | — | USA |
| `d323206a-81ba-4150-9e2b-f6cf86dfcca1` | Apple — Proof of Device History | — | Global |
| `9ae811fe-0ccb-4fc1-8686-e45eb74f66d9` | PayPal — Proof of Account | — | Global |
| `06f90d90-aeea-4988-93a7-e4e1a382e908` | PayPal — Proof of Address | — | Global |
| `0986bcc5-3e9e-4aa6-9eec-b3122b5caf12` | Spotify — Proof of Subscription | — | USA |
| `dca3ae09-1f1a-4dc0-a06f-15b850417d65` | Naver — Proof of Account Ownership | — | Global |
| `6ff9dbd0-1311-4a7e-9b32-0c7dace502f5` | Lumina Clippers — Proof of Campaign Submission | — | Global |

---

## Banking & Finance

> These datasources return verified financial data but **omit `webProofs`** from the webhook payload.

### Crypto Exchanges

| ID | Name | Inputs | Notes |
|----|------|--------|-------|
| `829dd4fa-0976-40be-b04b-a518ab2ba19b` | Binance — Proof of Trading Volume (with Account Creation Time) | — | |
| `a3d15595-76f0-4e2f-9fbb-e98bcbe2782a` | Binance — Proof of Balance | `currency` | |
| `3ead6fb0-38d9-4e4b-822c-17dc9d3b7633` | Binance — Proof of KYC | — | |
| `be60d8af-d689-4911-a624-2b5b1249b7cc` | Binance — Proof of Age | — | |
| `7c7df629-da3e-4d43-87d5-37bec0616648` | Binance — Proof of Address | — | |
| `f0d24713-ae71-468a-9f4d-e6fb1d465f1a` | Binance — Proof of P2P Trade | `orderId`, `merchantId` | |
| `b55a46fd-aa42-490a-8dee-e8adeacfec4c` | Coinbase — Proof of Total Assets Value | — | |
| `d3bd1cee-30f8-4808-8e01-578a1164be22` | Coinbase — Proof of Historical Crypto Trade Volume | — | |
| `336d5207-038f-4fa5-9af5-29d7402fbc65` | Coinbase — Proof of Account Creation Time | — | mobile-only |
| `473165ab-2f50-4786-ae7f-a35213a59e25` | Kraken — Proof of Trading Volume (with Account Creation Time) | — | |
| `79688d9c-8a24-4ef1-a03f-18d8ca282143` | Kraken — Proof of Transactions | — | |
| `a2807d78-cfff-4a8a-a4fe-2b07f7158103` | Kraken — Proof of Account Creation Time | — | |
| `d5922000-dded-480d-89d7-3dcad12deaaf` | Kraken Pro — Proof of Trading Volume (with Account Creation Time) | — | |
| `175c6078-7da0-40a7-a2c0-2fbdb38526c2` | Kraken Pro — Proof of Trading Volume (with Account Creation Time) | — | |
| `5a039856-59c7-4c45-815c-abf814e200d4` | Kraken Pro — Proof of Trading Volume History (with Account Creation Time) | — | |
| `abec35ad-8697-42d7-9bd9-bf86f512bb9b` | Robinhood — Proof of Crypto Trade Volume | — | |
| `0cc77974-50a8-434c-b958-e45444d02aca` | Robinhood — Proof of Stock Positions | — | |
| `22f803f2-34e9-4ac7-84a5-3a7f0d7d3240` | Robinhood — Proof of Orders | — | |
| `c2a41933-91e8-400c-8b76-69bc9f573a0e` | Robinhood — Proof of Account Balance | — | |
| `a436ce68-83b8-4024-94a9-b442183a4fec` | Fidelity — Proof of Crypto Trade Volume | — | |
| `f5ea5032-d148-4298-b787-2574636c1d92` | Bitpanda — Proof of User ID and Volume | — | |
| `f68e6644-b208-4206-a3f6-64612c05e703` | Coinlist — Proof of Karma | — | |
| `149fa0ad-e718-4f8f-9cb4-b2d2b0a8d40c` | ether.fi — Proof of Account Ownership | — | |
| `f02ed032-d32c-4f5d-842f-dacc49b15496` | ether.fi — Proof of Balance | — | |
| `3d3f851f-1439-411b-949a-54eaea6b324f` | Echo.xyz — Proof of Total Contributions | — | |
| `aeaaab0d-3621-4ce6-a652-7ed90c4affae` | Glider — Proof of Funds and Verified X Account | — | |
| `f3df7645-03a6-458a-b0cf-90e8e160ca40` | Glider — Proof of Token Purchase History | — | |

### Traditional Banking

| ID | Name | Inputs | Geography |
|----|------|--------|-----------|
| `41b9a0c3-4339-40a1-af71-f36d1032502d` | Revolut — Proof of Address | — | Global |
| `1f7194f4-24f4-4e6d-b759-a7e5d85cec63` | Revolut — Proof of Account Ownership | — | Global |
| `e570c919-6043-4acc-9344-4e479c58b012` | Revolut — Proof of Account Ownership (No PII) | — | Global |
| `9f3db8c1-e0df-4ba3-b84a-b1747b33e27a` | Revolut — Proof of Full Name | — | Global |
| `6c2d930d-3e29-45ca-ab05-2dfabb505fcf` | Revolut — Proof of Age | — | Global |
| `1fc6118f-ec40-4030-9387-2a468b183a35` | Revolut — Proof of Balances | — | Global |
| `c3a28efc-f4d0-4781-94a7-df84f46064b0` | Revolut — Proof of Bank Account Numbers | — | Global |
| `694515f2-15c1-4828-a200-8feee075e700` | Revolut — Proof of Trading Transactions | — | Global |
| `81d655ed-f4f6-4e0c-9909-f26d0b1ad70f` | Revolut — Proof of Crypto Transactions | — | Global |
| `bd0273f1-c41c-4a41-aafd-9fd8f146d109` | Revolut — Proof of Last Transaction | — | Global |
| `a81d369b-98c8-4cbc-b69d-9bb97c0860da` | Revolut — Proof of Transaction | `recipient`, `currency`, `amount` | Global |
| `ba5e3412-ef40-456d-9410-cd08a60cd0fc` | Revolut — Proof of Transaction (Interactive) | — | Global |
| `2596c731-200f-4f66-a39a-5083a43badba` | Revolut — Proof of Full Name + PESEL | — | Global |
| `c217a801-3cfd-4772-b61c-a0f642bc787a` | Monzo — Proof of Last Transaction | — | Global |
| `b88c6ac2-5240-4035-95d9-2d4e2f636f5d` | Monzo — Proof of Identity | — | Global |
| `b36626e5-1c0a-4bf9-bf6f-8c87ebd9bbe6` | Monzo — Proof of Bank Account Number | — | Global |
| `7ae41772-d2b3-43a2-8587-365a51fbeeaa` | Monzo — Proof of Transactions | — | Global |
| `7c2dbaf1-e75e-4dec-a3c1-d1ab71f241a1` | Experian — Proof of Credit Score (US) | — | USA |
| `a37635ce-effb-4c93-9d6f-5687620b8936` | Experian — Proof of Address | — | United Kingdom |
| `28d17640-30fa-4c19-bc34-66ca09bc9750` | Wise — Proof of Account Ownership | — | Global |
| `a65f6996-a6c6-4bf5-a86f-87eeea238e40` | Wise — Proof of Address | — | Global |
| `7308a0b5-de75-44b2-80a2-778747f7f07a` | Wise — Proof of Bank Account Number | — | Global |
| `f95e0274-7b56-452e-bb01-1e4b6578bea2` | Wise — Proof of KYC | — | Global |
| `4a443312-1e92-4080-b0e5-3d5a1a46930b` | Wise — Proof of Total Balance | — | Global |
| `736ba397-e3dc-428d-b2f7-6bac03523edd` | Wise — Proof of Transaction (Interactive) | — | Global |
| `d9804a55-40d7-406b-98d9-70a593835291` | NatWest — Proof of Address | — | United Kingdom |
| `b6237f13-b025-4cab-a21d-e4df0cbc3f62` | Banco Sabadell — Proof of Balance | — | Global |
| `1d6520e1-7708-47e5-8b9d-27d0f24c7059` | Banco Sabadell — Proof of Transaction | `counterparty` | Global |
| `24a1ab97-4201-4b92-8026-e54770bc0564` | Bank of America — Proof of Balance | — | USA |
| `10c13566-61b7-4e4a-830e-02a31d2a361d` | Bank of America — Proof of Last Transaction | — | USA · mobile-only |
| `4f1cbf5c-c1ad-4d71-94ae-f9a4ea859694` | Bank of America — Proof of Zelle (automated) | `recipient`, `amount` | USA |
| `086ce552-2663-485e-861f-942ad372b10d` | Venmo — Proof of Account | — | Global |
| `9cdf4d70-5c8c-4d71-ba7f-9f7abab91e64` | Plaid Layer — Proof of Account Ownership (Sandbox) | — | Global |
| `51f43d3f-3f1d-4f8c-a89f-6d416a1590d7` | Triumph Payments — Proof of Account Ownership | — | Global |
| `2c0e79b4-6bb9-42d1-bdd8-66fece36d674` | Kuda — Proof of Account Ownership | — | Rest of the World |
| `b95dc453-3ab5-4338-8ba0-38ecfe8698a1` | Kuda — Proof of Balance | — | Rest of the World |
| `d9c83dd2-013b-48b3-b125-31768f459f98` | Kuda — Proof of Transactions | — | Global · mobile-only |
| `8a515705-a02e-4755-95e8-bcd16745d5a3` | Access Bank — Proof of Account Ownership | — | Rest of the World |
| `bc5434ab-6459-4874-a1a6-9596d70f903a` | Access Bank — Proof of Transactions | — | Rest of the World |
| `b7eef587-6052-4ead-9375-a0f79f84fc97` | Zenith Bank — Proof of Transactions | — | Rest of the World |
| `f3900ccf-9c73-4f8b-ae8e-f1412fb804bd` | Ariba — Proof of Account Ownership | — | Global |
| `c78c8047-40f9-4d04-b6e1-4116bae0939a` | Coupa — Proof of Account Ownership | — | Global |
| `d9b1656b-2cf5-45d4-93e4-e12bf97bf8c6` | Interactive Brokers — Proof of Balance | — | Global · mobile-only |
| `37a9b2c2-1143-4560-b7b0-3a83d5243f16` | Interactive Brokers — Proof of Positions | — | Global |
| `0be91a62-13ec-4cc1-a1c4-912b39bc8b6d` | Superbet — Proof of Bonus | — | Poland |
| `077f08d5-031d-4b0a-a144-abc573d63700` | Superbet — Proof of User ID and Active Bets | — | Poland |

---

## Government & Identity Services

> These datasources return identity data and typically **omit `webProofs`**.

| ID | Name | Inputs | Geography |
|----|------|--------|-----------|
| `40aba356-0602-4e87-86eb-9432060a1559` | HMRC — Proof of Address | — | United Kingdom |
| `20ab39d3-aeab-42ec-ae7e-95020c6505b2` | HMRC — Proof of Full Name | — | United Kingdom |
| `8890060b-83ea-4b07-a087-f76235a868f3` | HMRC — Proof of Most Recent Employment | — | United Kingdom |
| `16715bc2-1da6-43a6-a494-99c1d86e02dd` | HMRC — Proof of National Insurance Number | — | United Kingdom |
| `438a878b-f141-4605-9907-b83785218541` | HMRC — Proof of Past Employments | — | United Kingdom |
| `18de362f-f8b3-4426-86a9-4e33703e968a` | mObywatel — Proof of Address | — | Poland |
| `1e3970c3-7636-4034-aa83-787c3919f991` | mObywatel — Proof of Full Name | — | Poland |
| `92083036-8a36-49b7-88e1-38b42295e423` | mObywatel — Proof of Full Name + PESEL | — | Poland |
| `5d876abd-0a48-4017-b10d-fe0ed8016c6d` | mObywatel — Proof of Full Name + PESEL + ID | — | Poland |
| `3ccf5dd7-2712-453e-89fb-dea85f935afc` | mObywatel — Proof of Full Name + PESEL (simplified) | — | Poland |
| `35cb8b25-ff59-43d7-a50f-b1613919bf5b` | mObywatel — Proof of PESEL Status | — | Poland |
| `a6598856-e244-43ba-be5e-91a330d99fdb` | mObywatel — Proof of eID (Poland) | — | Poland |
| `3b964324-71f5-4ac4-9f77-cc204421df2f` | mObywatel — Proof of eID (Poland) + Address | — | Poland |
| `09fbf7c1-64df-4e22-84c8-381a8eeb5ccf` | mObywatel — Proof of eID (sandbox) | — | Poland |
| `851782b6-7716-4919-8e39-4d8a998c9132` | ZUS PUE — Proof of Social Security Contributors | — | Poland |
| `33c511e5-bba8-418e-b7ec-17f099595670` | e-Urząd Skarbowy — Proof of Tax Settlements | — | Poland |
| `e7f744dc-6dde-427c-9d59-93baa362bdba` | e-Urząd Skarbowy — Proof of Taxpayer Report | — | Poland |
| `5c650fc9-e8ca-42d1-8c95-479c45da8e74` | ARiMR — Proof of Decyzja o Dopłatach Obszarowych (Upload) | `upload_url`, `type` | Global |
| `a37a6a5b-2962-4750-be7b-448c53f52af0` | ARiMR — Proof of Wniosek (Upload) | `upload_url` | Poland |
| `33cd651e-a1dc-4549-94ad-ba53fff139f8` | PKO Bank Polski — Proof of Address | — | Poland |
| `3dd19a7d-3df0-4af9-824d-6f64a245b01f` | ING Bank Śląski — Proof of Address | — | Poland |
| `dc4e0fe2-7b14-4feb-a535-7e843b93d3f0` | ING Bank Śląski — Proof of Transaction (Interactive) | — | Poland |
| `03ef8149-b835-4302-a3ab-f8aab748c739` | mBank — Proof of Address | — | Poland |

---

## Utilities & Telecom

> Address verification datasources. These typically **omit `webProofs`**.

| ID | Name | Inputs | Geography |
|----|------|--------|-----------|
| `79289093-f71d-4aca-88e9-cd97b3702ff8` | Netflix — Proof of Account | — | Global |
| `18d8ad77-4ece-4045-beb4-e4dd0c597713` | Uber — Proof of Account | — | Global |
| `ea01571b-613f-4e23-8f52-f172360c23e5` | Uber Eats — Proof of Account | — | Global |
| `6d28afaf-5255-452d-a6e3-19be025f5e1a` | NOW — Proof of Address | — | United Kingdom |
| `3d05783b-99f8-478b-9f12-4d50eaabc7d2` | Thames Water — Proof of Address | — | United Kingdom |
| `bae02dc5-c2b5-482c-8002-3aa3259a648f` | Thames Water — Proof of Address (with DOB) | — | United Kingdom |
| `d8def1ac-921c-47b5-b114-fddc9ff97391` | Orange.fr — Proof of Address | — | Rest of the World |
| `1a8679b2-ac2b-4c5c-a8e3-d5c3e5dce377` | Orange.fr — Proof of Number | — | Global |
| `7dc31a7c-5863-4470-8393-4c99c582b685` | ENEA — Proof of Address | — | Poland |
| `4d3a6ed4-4339-43c4-9da7-ac141aba510f` | PGNiG — Proof of Address | — | Poland |
| `6b8197a2-0280-4c5c-951b-aa1903ab359d` | Play — Proof of Address | — | Poland |
| `21ca67e5-bb0b-4d29-b619-3607359a5298` | e-on — Proof of Address | — | Poland |

---

## Test / Sandbox Datasources

Use these during development without real accounts.

| ID | Name | Inputs |
|----|------|--------|
| `e03b846f-58ce-4ae7-b96e-c454c5a1314e` | LOTR API — Proof of LOTR Characters | — |
| `e6b1db6b-9498-4dc6-b5a0-f665273e32a1` | LOTR API — Proof of LOTR Characters and Realms (multiproof) | `realm_number` |
| `5ca6b509-2608-4d0a-9586-a407b9f7d3e8` | LOTR API — Proof of LOTR Characters with alert | — |
| `5443ab11-5751-470e-b216-96daa5541e0a` | LOTR API — Proof of LOTR Realms with inputs | `realm_number` |
| `4ce5983b-06b6-4097-9dd4-bbf03a667560` | example.com — Proof of Custom user agent | — |

---

## Input Reference

| Input key | Used by | Description |
|-----------|---------|-------------|
| `ig_handle` | Instagram | Instagram username |
| `handle` | Instagram, TikTok | Platform handle |
| `post_id` | Instagram, TikTok, X | Platform post/video ID |
| `video_id` | TikTok, YouTube | Video ID |
| `story_id` | Instagram | Story ID |
| `insights_url` | Instagram | Insights page URL |
| `upload_url` | Instagram, TikTok, ARiMR | Pre-signed upload URL |
| `twitter_username` | X | X/Twitter handle to verify followership against |
| `post_url` | X | Full tweet URL |
| `channel_id` | YouTube | YouTube channel ID |
| `channel_name` | YouTube | YouTube channel name |
| `studio_id` | YouTube | YouTube Studio ID |
| `github_owner` | GitHub | Repo owner |
| `github_repo` | GitHub | Repository name |
| `github_username` | GitHub | GitHub username |
| `username` | LinkedIn, Twitch | Platform username |
| `account_id` | LinkedIn | LinkedIn account ID |
| `stream_id` | Twitch | Stream ID |
| `currency` | Binance | Currency code (e.g. `BTC`) |
| `recipient` | Revolut, Bank of America | Transaction recipient |
| `amount` | Revolut, Bank of America | Transaction amount |
| `counterparty` | Banco Sabadell | Transaction counterparty |
| `orderId` | Binance | P2P order ID |
| `merchantId` | Binance | Merchant ID |
| `realm_number` | LOTR API | Test input |
| `upload_url` | ARiMR, Instagram, TikTok | Pre-signed URL for file upload |
| `type` | ARiMR | Decision type: `onw`, `obszarowe`, `ekologiczne` |
