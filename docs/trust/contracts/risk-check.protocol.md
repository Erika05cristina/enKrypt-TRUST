# TRUST Risk Check Protocol (B0 Locked)

## Endpoints

- Method: `GET`
- Path: `/agent-registration.json` — **EIP-8004** agent registration JSON document (no payment; CORS allowed). Includes the `POST` endpoints below and, if the server has `TRUST_ERC8004_*` configured, the `registrations` block.

- Method: `POST`
- Paths:
  - `/api/risk-check` — **standard** tier (price `TRUST_SETTLE_PRICE_USD`, default `$0.001`)
  - `/api/risk-check/deep` — **deep** tier (price `TRUST_SETTLE_DEEP_PRICE_USD`, default `$0.02`), larger LLM token budget
- Content-Type: `application/json`

The same JSON body is used for both POST routes. The `resource` field inside `accepts` must match the URL used for that flow exactly (including `/deep` when applicable).

## x402 retry headers

The backend must read payment headers in this order:

1. `PAYMENT-SIGNATURE`
2. `X-PAYMENT` (fallback)

If no valid payment headers are present, respond with `402`.

## HTTP status contract

- `200 OK`: successful paid response with risk evidence.
- `400 BAD_REQUEST`: invalid or missing payload.
- `402 PAYMENT_REQUIRED`: missing, invalid, or expired payment.
- `422 UNSUPPORTED_CHAIN`: `chainId` is not `43113`.
- `500 INTERNAL_ERROR`: unhandled server error.

## Required response headers

On every response:

- `x-request-id: <string>`

On paid responses, include facilitator headers when applicable:

- `x-payment-response` (optional, passthrough)

## MVP economics

- Scheme: `exact`
- Standard price: configurable (`TRUST_SETTLE_PRICE_USD`, default `$0.001` USDC)
- Deep price: configurable (`TRUST_SETTLE_DEEP_PRICE_USD`, default `$0.02` USDC)
- `maxAmountRequired` is set by the facilitator from that price (6 USDC decimals)
- Timeout: `maxTimeoutSeconds=600`

## 200 response body (B3 + contractProbe + explorerSourceProbe + optional LLM)

- B3 fields: `verified`, `reputationScore`, `paidRiskScore`, `paidFlags`, `simulatedOutcome`, `explanationSeed`
- Optional **EIP-8004:** `erc8004` (`agentRegistry`, `agentId`, `agentRegistration`, …) when the operator configured `TRUST_ERC8004_IDENTITY_REGISTRY` and `TRUST_ERC8004_AGENT_ID` on the server
- After payment, B3 may be enriched from the explorer: `EXPLORER_SOURCE_NOT_VERIFIED` (contract has no verified source on Routescan / Etherscan-compatible API), `EXPLORER_SOURCE_VERIFIED` (source published; `UNVERIFIED_CONTRACT` is removed), or `EXPLORER_LOOKUP_FAILED` if the explorer API fails
- `contractProbe`: result of `eth_getCode` on `to` on Fuji when `TRUST_FUJI_RPC_URL` is set (`kind` eoa|contract, `bytecodeLengthBytes`, optional `deterministicHints`); without RPC, `probeError` (e.g. `no_rpc_url`) and `200` is still valid
- `explorerSourceProbe`: metadata from `getsourcecode` (full Solidity is not included in this JSON); `TRUST_EXPLORER_DISABLED=true` skips the lookup
- If `TRUST_LLM_ENABLED=true` and Ollama succeeds: `llmAnalysis` with `text`, `verdict` (`safe`|`caution`|`malicious`|`unknown`), `flags[]`, `summary`, `disclaimer`, `tier`, `provider`, `model`, …; the prompt may include **full verified Solidity** (configurable limit) or bytecode when no verified source exists
- If the LLM is disabled or fails: `llmAnalysis` omitted or `null`, and optional `llmSkippedReason`

## Notes for client integration (Person A)

- The client may always start without a payment header.
- If it receives `402` with an x402 v1 body at the root, it must read `accepts[0]`. If the error is wrapped in `error.details`, use that `accepts`.
- The same JSON body must be preserved on the paid retry.
