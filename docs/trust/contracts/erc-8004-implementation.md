# TRUST — ERC-8004 (EIP-8004) implementation notes

This document describes **what enKrypt-TRUST implemented** for [EIP-8004: Trustless Agents](https://eips.ethereum.org/EIPS/eip-8004) in the **trust-risk-api** and **Enkrypt extension**, and how it relates to **x402** (HTTP 402 payments). It complements the architecture section in [`../technical.md`](../technical.md).

---

## 1. Design principle

| Topic | TRUST behavior |
|--------|----------------|
| **EIP-8004** | Discoverable **agent identity** (Identity Registry URI, optional reputation registry address). |
| **x402** | **Payment** for `POST` risk-check resources — complementary; not defined by EIP-8004. |
| **Custody** | On-chain **`register`** / **`setAgentURI`** are **operator** responsibilities. The API does **not** hold registration private keys. |

---

## 2. HTTP: agent registration document

| Item | Detail |
|------|--------|
| **Method / path** | `GET /agent-registration.json` |
| **Constant** | `AGENT_REGISTRATION_RESOURCE` in `services/trust-risk-api/src/constants.ts` |
| **Handler** | `createServerHandler` in `services/trust-risk-api/src/server.ts` |
| **Builder** | `buildAgentRegistrationDocument(publicBaseUrl)` in `services/trust-risk-api/src/config/erc8004.ts` |
| **Response** | `200`, `Content-Type: application/json; charset=utf-8`, `Cache-Control: public, max-age=300`, plus `x-request-id`. |

The JSON is suitable for **`tokenURI` / off-chain discovery** after the operator calls **`setAgentURI(agentId, "https://<base>/agent-registration.json")`** on the Identity Registry.

**Document fields (logical):**

- `type`: `erc-8004-agent-registration`
- `name`, `description` — from env or defaults (see §4).
- `services` — HTTPS endpoints for standard and deep risk-check `POST` (built from `TRUST_PUBLIC_BASE_URL`).
- `supportedTrust` — e.g. `reputation`, `validation-offchain`.
- `payment` — declares **x402** / `exact` / `avalanche-fuji` / `chainId` **43113** (informational for consumers).
- **`registrations`** — present when both identity registry and `agentId` are configured: `[{ agentRegistry, agentId }]` with `agentRegistry` = `eip155:<chainId>:<identityRegistryLowercase>`.
- **`registrationsPending`** — if only the registry address is set (valid hex) but **`TRUST_ERC8004_AGENT_ID` is missing**: includes `message` and `suggestedAgentRegistry` so integrators know mint + env steps remain.

---

## 3. Paid risk-check `200`: optional `erc8004` block

After a successful x402 settlement and full risk pipeline, the success body may include an **`erc8004`** object **only if** env is complete (identity registry + agent id).

| Item | Detail |
|------|--------|
| **Attachment point** | `services/trust-risk-api/src/routes/riskCheck.ts` — merges `getErc8004AgentRef(config.publicBaseUrl)` into the response when defined. |
| **Scoring** | **Does not** change B3 scores, flags, or LLM blend — metadata only. |

**Shape** (`TrustErc8004AgentRef` in `services/trust-risk-api/src/types.ts`):

- `chainId` — number (default env **43113**).
- `identityRegistry` — checksummed/lowercased `0x` address.
- `reputationRegistry` — optional, if `TRUST_ERC8004_REPUTATION_REGISTRY` is a valid `0x` address.
- `agentRegistry` — CAIP-style string, e.g. `eip155:43113:0x8004…`.
- `agentId` — string token id from `register` (e.g. `"89"`).
- `agentRegistration` — absolute URL to `.../agent-registration.json`.
- `note` — clarifies registries vs x402 scope.

---

## 4. Environment variables

Documented in `services/trust-risk-api/.env.example`. Summary:

| Variable | Role |
|----------|------|
| `TRUST_ERC8004_CHAIN_ID` | Chain id (defaults to **43113** if unset). |
| `TRUST_ERC8004_IDENTITY_REGISTRY` | Identity Registry contract on Fuji (community reference e.g. `0x8004A818BFB912233c491871b3d84c89A494BD9e` — **verify on-chain**). |
| `TRUST_ERC8004_REPUTATION_REGISTRY` | Optional Reputation Registry (e.g. `0x8004B663056A597Dffe9eCcC1965A193B7388713`). |
| `TRUST_ERC8004_AGENT_ID` | ERC-721 `tokenId` string after operator `register`. Required for `erc8004` on `200` and for `registrations` in the registration JSON. |
| `TRUST_ERC8004_AGENT_NAME` | Overrides default agent name in registration JSON. |
| `TRUST_ERC8004_AGENT_DESCRIPTION` | Overrides default description. |

**`TRUST_PUBLIC_BASE_URL`** must match the URL clients use for x402 retries; it also builds `agentRegistration` and service endpoints in the registration document.

---

## 5. Fuji testnet — TRUST reference (contract + transactions)

This project uses the **ERC-8004 Identity Registry** on **Avalanche Fuji** (`chainId` **43113**) at:

`0x8004A818BFB912233c491871b3d84c89A494BD9e`

| Step | Link | Notes |
|------|------|--------|
| **Contract (proxy — write `register`, `setAgentURI`, …)** | [Snowtrace testnet — Write as Proxy](https://testnet.snowtrace.io/address/0x8004A818BFB912233c491871b3d84c89A494BD9e/contract/43113/writeProxyContract) | Use the wallet that will **own** the agent NFT / operate the agent. |
| **`register` (example tx)** | [Avalanche Subnet Explorer — transaction `0x0c36…48f9`](https://subnets-test.avax.network/c-chain/tx/0x0c36e6a520be79758de3a03611af8063d3797a0806a6d329462013be2d9b48f9?tab=details) | After minting, set **`TRUST_ERC8004_AGENT_ID`** to the **`tokenId`** from this transaction’s logs / receipt (ERC-721 `Transfer` or registry-specific event). |
| **`setAgentURI` (example tx)** | [Snowtrace testnet — transaction `0x559a…53d1`](https://testnet.snowtrace.io/tx/0x559a09485158c0086f8545c6e4998313983a9a6e1c75aecd0e78bfcb0f7253d1?chainid=43113) | URI must be the live **`https://<your-api-base>/agent-registration.json`** (same host as **`TRUST_PUBLIC_BASE_URL`**). |

Explorers differ by product (Snowtrace vs [subnets-test.avax.network](https://subnets-test.avax.network)); both index the same C-Chain testnet. Re-run **`register` / `setAgentURI`** from your own operator wallet if you fork the deployment; the links above document **this repo’s** testnet flow.

---

## 6. Operator checklist (off-server)

1. Fund **Fuji** gas (test AVAX).
2. Call **`register`** on the Identity Registry → record **`agentId`**.
3. Deploy/serve **trust-risk-api** at a stable **HTTPS** base URL; set **`TRUST_PUBLIC_BASE_URL`**.
4. Call **`setAgentURI(agentId, "<base>/agent-registration.json")`** so on-chain URI matches the served file.
5. Set **`TRUST_ERC8004_*`** in `.env`, restart the API.
6. Confirm **`GET /agent-registration.json`** and a paid **`POST /api/risk-check`** return the expected **`erc8004`** block when configured.

---

## 7. Enkrypt extension (wallet UI)

| Item | Detail |
|------|--------|
| **Component** | `packages/extension/src/trust/ui/TrustPanel.vue` |
| **When** | If `assessment.paidEvidence.erc8004` is present after a paid assessment. |
| **UI** | Shows EIP-8004 label, `agentId`, link to `agentRegistration`, and `agentRegistry` string. |
| **Types** | `TrustErc8004AgentRef` / `erc8004?:` on `TrustPaidRiskEvidence` in `packages/extension/src/trust/types.ts` |

No change to local vs paid risk **logic** — display and transparency only.

---

## 8. Explicit non-goals (current repo)

Aligned with [`../technical.md`](../technical.md) §10:

- Automatic transactions from the API to Identity / Reputation / Validation registries.
- Backend custody of registration keys.
- Writing on-chain reputation per analysis from the server.
- x402 validation generalized to `chainId` ≠ configured Fuji MVP (unless product extends it).

---

## 9. Code and tests

| Area | Path |
|------|------|
| Config + registration builder | `services/trust-risk-api/src/config/erc8004.ts` |
| Unit tests | `services/trust-risk-api/src/config/erc8004.test.ts` |
| GET route | `services/trust-risk-api/src/server.ts` |
| `200` merge | `services/trust-risk-api/src/routes/riskCheck.ts` |
| Startup log | `services/trust-risk-api/src/list.ts` (registration URL hint) |

Run API tests: `cd services/trust-risk-api && npm test`.

---

## 10. Related contract artifacts

- **Risk-check protocol / schemas:** `risk-check.protocol.md`, `risk-check.request.schema.json`, `risk-check.responses.json` — core A/B contract; optional `erc8004` on `200` can be added to response examples in a future doc pass.
- **Phase B0 freeze:** `phase-b0-contract-freeze.md` — x402 MVP scope; ERC-8004 is orthogonal metadata + discovery.

---

*Contract note — TRUST / enKrypt-TRUST: EIP-8004 registration JSON, optional `erc8004` on paid responses, extension TrustPanel.*
