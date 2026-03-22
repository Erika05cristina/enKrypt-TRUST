# TRUST Risk Check Protocol (B0 Locked)

## Endpoints

- Method: `POST`
- Paths:
  - `/api/risk-check` — pago **estándar** (precio `TRUST_SETTLE_PRICE_USD`, default `$0.001`)
  - `/api/risk-check/deep` — pago **deep** (precio `TRUST_SETTLE_DEEP_PRICE_USD`, default `$0.02`), mayor cupo de tokens LLM
- Content-Type: `application/json`

Mismo cuerpo JSON en ambos. El `resource` en `accepts` debe coincidir exactamente con la URL usada (incluye `/deep` si aplica).

## x402 retry headers

Backend debe leer en este orden:
1. `PAYMENT-SIGNATURE`
2. `X-PAYMENT` (fallback)

Si no existen headers de pago validos, responder `402`.

## HTTP status contract

- `200 OK`: respuesta pagada exitosa con evidencia de riesgo.
- `400 BAD_REQUEST`: payload invalido o faltante.
- `402 PAYMENT_REQUIRED`: pago faltante/invalido/expirado.
- `422 UNSUPPORTED_CHAIN`: `chainId` distinto de `43113`.
- `500 INTERNAL_ERROR`: error no controlado.

## Required response headers

En todas las respuestas:
- `x-request-id: <string>`

En respuestas de pago, incluir headers de facilitador si aplica:
- `x-payment-response` (opcional, passthrough)

## MVP economics

- Scheme: `exact`
- Precio estándar: configurable (`TRUST_SETTLE_PRICE_USD`, default `$0.001` USDC)
- Precio deep: configurable (`TRUST_SETTLE_DEEP_PRICE_USD`, default `$0.02` USDC)
- `maxAmountRequired` lo fija el facilitador según ese precio (6 decimales USDC)
- Timeout: `maxTimeoutSeconds=600`

## Respuesta 200 (B3 + contractProbe + explorerSourceProbe + LLM opcional)

- Campos B3: `verified`, `reputationScore`, `paidRiskScore`, `paidFlags`, `simulatedOutcome`, `explanationSeed`
- Tras el pago, B3 puede enriquecerse con explorador: `EXPLORER_SOURCE_NOT_VERIFIED` (contrato sin fuente verificada en Routescan/Etherscan-compatible), `EXPLORER_SOURCE_VERIFIED` (fuente publicada; se retira `UNVERIFIED_CONTRACT`), o `EXPLORER_LOOKUP_FAILED` si la API falla
- `contractProbe`: resultado de `eth_getCode` sobre `to` en Fuji si `TRUST_FUJI_RPC_URL` está configurado (`kind` eoa|contract, `bytecodeLengthBytes`, `deterministicHints` opcionales); si no hay RPC, `probeError` (p. ej. `no_rpc_url`) y el `200` igualmente válido
- `explorerSourceProbe`: metadatos de `getsourcecode` (sin enviar el Solidity en el JSON); `TRUST_EXPLORER_DISABLED=true` omite la consulta
- Si `TRUST_LLM_ENABLED=true` y Ollama responde: `llmAnalysis` con `text`, `verdict` (`safe`|`caution`|`malicious`|`unknown`), `flags[]`, `summary`, `disclaimer`, `tier`, `provider`, `model`, …; el prompt puede incluir **Solidity verificado completo** (límite configurable) o bytecode si no hay fuente
- Si LLM deshabilitado o falla: `llmAnalysis` omitido o `null` y opcional `llmSkippedReason`

## Notes for Person A integration

- El cliente puede arrancar siempre sin header de pago.
- Si recibe `402` con cuerpo x402 v1 en la raíz, debe leer `accepts[0]`. Si el error viene envuelto en `error.details`, usar ese `accepts`.
- Debe preservar el mismo body en el reintento pagado.

