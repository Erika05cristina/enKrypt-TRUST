# TRUST Phase B0 - Contract Freeze

Este documento congela los contratos entre cliente (Person A) y backend (Person B) para iniciar B1 sin ambiguedad.

## Scope congelado

- Endpoint: `POST /api/risk-check`
- Red: `avalanche-fuji`
- `chainId`: `43113`
- Esquema de pago x402 MVP: `exact`
- Precio inicial MVP: `$0.01` (USDC)
- Timeout de autorizacion: `maxTimeoutSeconds=600`

## Header strategy (retry)

Orden de lectura para reintentos pagados:
1. `PAYMENT-SIGNATURE`
2. `X-PAYMENT` (fallback)
3. Si no existe ninguno: responder `402 PAYMENT_REQUIRED`

## Respuestas obligatorias

- Todas las respuestas deben incluir `x-request-id`.
- `402` debe traer metadata accionable de pago.
- `200` debe retornar evidencia de riesgo pagada.
- `400/402/422/500` usan envelope de error unificado.

## Referencias implementadas

- Request schema: `risk-check.request.schema.json`
- Ejemplos de respuestas: `risk-check.responses.json`
- Reglas de headers y codigos: `risk-check.protocol.md`

## Exit criteria B0

- Contratos escritos y compartidos: completado.
- Payloads de ejemplo para A/B: completado.
- Validacion de Person A ("sin dudas de schema"): pendiente.

