# TRUST Phase B0 — Contract Freeze

This document freezes the contract between the client (Person A) and the backend (Person B) so Phase B1 can start without ambiguity.

## Frozen scope

- Endpoint: `POST /api/risk-check`
- Network: `avalanche-fuji`
- `chainId`: `43113`
- x402 MVP payment scheme: `exact`
- Initial MVP price: `$0.01` (USDC)
- Authorization timeout: `maxTimeoutSeconds=600`

## Header strategy (retry)

Read order for paid retries:

1. `PAYMENT-SIGNATURE`
2. `X-PAYMENT` (fallback)
3. If neither is present: respond `402 PAYMENT_REQUIRED`

## Mandatory response behavior

- Every response must include `x-request-id`.
- `402` must return actionable payment metadata.
- `200` must return paid risk evidence.
- `400` / `402` / `422` / `500` use a unified error envelope.

## Implemented references

- Request schema: `risk-check.request.schema.json`
- Response examples: `risk-check.responses.json`
- Header and status rules: `risk-check.protocol.md`

## B0 exit criteria

- Written and shared contracts: **done**
- Example payloads for A/B: **done**
- Person A schema validation (“no open questions”): **pending**
