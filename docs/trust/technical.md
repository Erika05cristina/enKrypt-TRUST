# TRUST — Technical documentation (enKrypt-TRUST)

Architecture and integration notes for **TRUST** (Transaction Risk & User Security Toolkit) on the fork of **[Enkrypt](https://github.com/enkryptcom/enKrypt)**. Covers the **risk-assessment agent** design, the **HTTP x402** micropayment flow, alignment with **[EIP-8004](https://eips.ethereum.org/EIPS/eip-8004) (Trustless Agents)**, external services composed by the backend, and explicit scope boundaries.

> **Setup & Execution:** Looking to spin up the architecture locally? See our comprehensive **[Installation Guide](INSTALLATION.md)**.

---

## 1. System vision

TRUST adds a layer to the wallet that **evaluates EVM transaction risk before signing**, on **Avalanche Fuji** (`chainId` **43113**). Analysis may include:

- local rules in the extension;
- a **paid API** via **x402** (USDC, on-chain settlement through the thirdweb facilitator);
- **RPC** and **block explorer** data;
- **heuristics** on verified Solidity;
- an optional **language model** (Ollama) on the server.

The design separates: **(a)** user custody and signing in the wallet, **(b)** business logic and billing in `trust-risk-api`, **(c)** discoverable agent identity per EIP-8004 **without** the server holding on-chain registration keys.

---

## 2. Upstream Enkrypt baseline

- **Official repo:** [github.com/enkryptcom/enKrypt](https://github.com/enkryptcom/enKrypt) — multi-chain wallet (TypeScript, Vue).
- **Starting point:** fork or worktree aligned with public `main` history (on the order of **~3084 commits** on GitHub; pin the exact hash with `git merge-base HEAD upstream/main` per clone).
- **Changes in this repo:** `services/trust-risk-api`, `packages/extension/src/trust/`, `docs/trust/`, and hooks in Ethereum transaction verification screens.

---

## 3. Reference brief (x402 + ERC-8004 + agent)

### 3.1 Typical requirement wording

Build an **agent** aligned with **ERC-8004** that uses **x402** to **pay per API call on-chain**, backed by **real services** (data, compute), with **per-invocation micropayments** instead of global prepaid balances.

### 3.2 How TRUST maps to that

| Dimension | TRUST design |
|-----------|----------------|
| **x402 / pay per call** | Each `POST` to `/api/risk-check` or `/api/risk-check/deep` is a distinct x402 **resource**. Flow: first request **402** + `accepts`; client (`wrapFetchWithPayment`) signs **EIP-3009** on Fuji USDC; second request with payment header → **settlePayment** → **200** with evidence. |
| **On-chain settlement** | The thirdweb facilitator executes the USDC transfer per x402 / EIP-3009. |
| **Per-invocation economics** | No global credit store replacing this: each `accepts` caps amount via `maxAmountRequired`. Natural x402 pattern; distinct from unlimited ERC-20 allowance or annual subscription. |
| **User role** | Enkrypt **signs** the payment authorization (user custody). Software **orchestrates** 402→pay→200 **after** that signature. A future deployment could use a service wallet or session keys; not in the current product. |
| **Real services** | **Data:** `eth_getCode`, explorer API (verified source). **Compute:** optional LLM. **Code persistence:** explorer publishes verified Solidity; no separate object-storage product. |
| **EIP-8004** | The agent may **register** on the **IdentityRegistry** on the same network family (Fuji `43113`). The API serves a stable registration document at `GET /agent-registration.json` and, when environment variables are set, returns an **`erc8004`** block on the risk-check **200** JSON. **Mint** and **setAgentURI** txs are signed by the **operator**: the server does not custody registration keys, reducing attack surface and clarifying roles. |

### 3.3 EIP-8004 vs x402

**EIP-8004 does not define payment rails.** HTTP **x402** is a **complementary** layer: the agent registration JSON declares the payment scheme (`payment`) and the `POST` endpoints protected by 402.

---

## 4. Agent identity (EIP-8004)

### 4.1 Normative reference and registries

[EIP-8004](https://eips.ethereum.org/EIPS/eip-8004) defines, among other things, the **Identity Registry** (ERC-721-style identities with a registration URI) and the **Reputation Registry** (feedback signals). Community deployments list multiple chains; on **Avalanche (C-Chain) Testnet / Fuji**, `chainId` **43113**, reference addresses are:

| Contract | Address (Fuji / Avalanche testnet) |
|----------|-----------------------------------|
| **IdentityRegistry** | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |
| **ReputationRegistry** | `0x8004B663056A597Dffe9eCcC1965A193B7388713` |

*(Aligned with the ERC-8004 contracts documentation; confirm on-chain that the deployment matches Fuji 43113.)*

**TRUST on Fuji (this project):** registration uses the proxy Identity Registry above. Operator-facing links:

- **Write contract (proxy):** [Snowtrace testnet — `0x8004…BD9e` / Write as Proxy](https://testnet.snowtrace.io/address/0x8004A818BFB912233c491871b3d84c89A494BD9e/contract/43113/writeProxyContract) — call `register`, `setAgentURI`, etc.
- **Example `register` tx:** [subnets-test.avax.network — `0x0c36…48f9`](https://subnets-test.avax.network/c-chain/tx/0x0c36e6a520be79758de3a03611af8063d3797a0806a6d329462013be2d9b48f9?tab=details)
- **Example `setAgentURI` tx:** [Snowtrace testnet — `0x559a…53d1`](https://testnet.snowtrace.io/tx/0x559a09485158c0086f8545c6e4998313983a9a6e1c75aecd0e78bfcb0f7253d1?chainid=43113)

More detail: [`docs/trust/contracts/erc-8004-implementation.md`](contracts/erc-8004-implementation.md) §5.

### 4.2 Logical agent identifier

- **`agentRegistry`:** string like `eip155:<chainId>:<identityRegistryAddress>` (registry address lowercased).
- **`agentId`:** ERC-721 `tokenId` from `register` on the IdentityRegistry.

**Illustrative example:** a successful `Register` tx minting token **#89** to the operator wallet → configure `agentId` as `"89"`.

### 4.3 Implementation in `trust-risk-api`

| Piece | Location / behavior |
|-------|---------------------|
| **Registration document** | `GET {baseUrl}/agent-registration.json` — JSON with `type`, `name`, `description`, `services` (standard and deep `POST` URLs), `supportedTrust`, `payment` (x402, Fuji). |
| **Registrations in JSON** | With `TRUST_ERC8004_IDENTITY_REGISTRY` and `TRUST_ERC8004_AGENT_ID`, includes `registrations: [{ agentRegistry, agentId }]`. With only the registry address, may include `registrationsPending` and `suggestedAgentRegistry` until `agentId` is set. |
| **Risk-check 200** | Optional **`erc8004`**: `chainId`, `identityRegistry`, optional `reputationRegistry`, `agentRegistry`, `agentId`, `agentRegistration`, `note`. **Does not change** B3 scores. |
| **Code** | `src/config/erc8004.ts`, `src/server.ts` (GET route), `src/routes/riskCheck.ts`, tests `src/config/erc8004.test.ts`. |
| **CORS** | **GET** allowed in addition to **POST** for registration document consumption. |

### 4.4 Operator responsibility (outside the Node process)

1. Fund **Fuji** gas (test AVAX).
2. Call **`register`** on IdentityRegistry → record **`agentId`**.
3. Expose the API at a **stable base URL**; set **`TRUST_PUBLIC_BASE_URL`** to that base (shared requirement with x402).
4. Call **`setAgentURI(agentId, "https://<base>/agent-registration.json")`** so on-chain **tokenURI** matches the served document (avoid `http://127.0.0.1` in production).
5. Set API `.env` per `services/trust-risk-api/.env.example` (`TRUST_ERC8004_*`) and restart.

### 4.5 Enkrypt extension

When the paid response includes **`erc8004`**, **`TrustPanel.vue`** shows the identifier, link to the registration JSON, and `agentRegistry`, without changing risk logic or x402 flow.

---

## 5. x402 protocol (summary)

- **Resource:** absolute URL of the `POST` (`/api/risk-check` or `/api/risk-check/deep`).
- **Scheme:** `exact`, Fuji USDC, `maxAmountRequired` from configured price.
- **Client:** `wrapFetchWithPayment` + adapted wallet (`createEnkryptTrustX402Wallet`) with explicit **EIP712Domain** in EIP-712 types for USDC / facilitator compatibility.
- **Server:** `readPaymentHeader` (order `PAYMENT-SIGNATURE`, then `X-PAYMENT`), `settlePayment`, then risk pipeline.

**`TRUST_PUBLIC_BASE_URL`** must match the URL the client uses for the second POST.

---

## 6. Services composed by the API

| Service | Implementation | Role |
|---------|------------------|------|
| Target bytecode | `eth_getCode` (`TRUST_FUJI_RPC_URL`) | `contractProbe` |
| Verified source | Etherscan-style API (Routescan Fuji) | Metadata on 200; full Solidity internal only (LLM + scan) |
| B3 engine | `evaluatePaidRisk`, env fixtures | Deterministic scores and flags |
| Static Solidity | `solidityStaticScan.ts` | `SOLIDITY_*` flags |
| LLM | Ollama, `TRUST_LLM_ENABLED` | Verdict, summary, optional score blend |
| Facilitator | thirdweb x402 | USDC settlement |

---

## 7. Extension orchestration

**`orchestrateRiskAssessment`** (`trust/agent/orchestrator.ts`): local signals → `fetchPaidRiskEvidence` → **`mergePaidEvidenceIntoFinalRiskScore`** (weighted blend with `paidRiskScore`, floors for malicious patterns and LLM `malicious`) → **low / medium / high** and optional send blocking on **high** in Send flow.

**Policy override:** the paid API call may be forced for demos; production should gate it behind business rules again.

---

## 8. Server pipeline after valid payment

Fixed order in `riskCheck.ts`:

1. Body validation (`contracts.ts`).
2. `evaluatePaidRisk` (B3).
3. `runContractProbe`.
4. `runExplorerSourceLookup`.
5. `mergeExplorerIntoPaidRisk`.
6. `mergeSolidityStaticIntoPaidRisk`.
7. `runOllamaAnalysis` (optional).
8. `applyLlmScoreBlend` if the model returns `llmRiskScore`.
9. Attach **`erc8004`** when configured.

---

## 9. TRUST file layout

```
enKrypt-TRUST/
├── packages/extension/src/trust/
├── services/trust-risk-api/
├── docs/trust/
└── technical.md (repo root) / docs/trust/contracts/technical.md (this copy)
```

---

## 10. Scope: included and excluded

**Included:** dual-tier x402; B3 engine; RPC and explorer probes; Solidity scan; optional Ollama; EIP-8004 **HTTP registration document** and **`erc8004` echo**; extension panel; protocol docs (`risk-check.protocol.md`, `contracts/erc-8004-implementation.md`, `PERSON_A_INTEGRATION.md`, API README).

**Deliberately excluded or future work:** automatic txs to Identity/Reputation/Validation registries from the backend (operator custody); headless service wallet; x402 validation for `chainId` ≠ `43113`; on-chain reputation writes per analysis; formal audit or advanced Validation Registry ZK flows.

---

## 11. Automated tests

- **API:** `cd services/trust-risk-api && npm test` — includes `erc8004.test.ts`, contracts, calldata, scoring, static Solidity, explorer, getCode, mocked ollama, pricing.
- **Extension:** `orchestrator.mergePaid.test.ts` (Vitest) depending on package environment.

---

## 12. Upstream traceability

```bash
git remote add upstream https://github.com/enkryptcom/enKrypt.git   # if applicable
git fetch upstream
git merge-base HEAD upstream/main
```

Record the resulting hash in internal team docs alongside the upstream commit reference.

---

## 13. References

- [Installation Guide: Spinning up T.R.U.S.T Locally](INSTALLATION.md)
- [Enkrypt](https://github.com/enkryptcom/enKrypt)
- [EIP-8004: Trustless Agents](https://eips.ethereum.org/EIPS/eip-8004)
- thirdweb docs (x402: `settlePayment`, `wrapFetchWithPayment`) — see `services/trust-risk-api/README.md`

---

*Architecture document — **T.R.U.S.T** / **enKrypt-TRUST**: wallet risk assessment, x402 micropayments, EIP-8004–aligned agent identity.*
