# Integración TRUST — Guía para Persona A (estado actual)

Este documento describe **cómo integrar el flujo pagado** contra `trust-risk-api` hasta el punto actual del proyecto: **x402 en Avalanche Fuji**, motor de riesgo **B3** (determinista), **sondeo on-chain** (`contractProbe` vía `eth_getCode`), **dos tiers de precio** (estándar / deep) y **análisis opcional vía Ollama** (JSON con `verdict` / `flags` / `summary`) tras el pago.

---

## 1. Objetivo

Persona A debe poder, desde **su cliente** (extensión enKrypt, dApp, agente, etc.):

1. Enviar el **contexto de la transacción** que el usuario va a firmar (`to`, `data`, `value`, `chainId`, …).
2. Completar el flujo **HTTP 402 → pago USDC (x402) → HTTP 200** con thirdweb.
3. Consumir la **respuesta de riesgo** (y opcionalmente el texto del LLM).

El **x402-starter-kit** en el monorepo `T.R.U.S.T` es **solo referencia de prueba**; la integración real vive en el producto de Persona A.

---

## 2. Prerrequisitos

| Requisito | Notas |
|-----------|--------|
| Red | **Avalanche Fuji** (`chainId` **43113**). |
| Token de pago | **USDC Fuji** en la wallet que firma el x402 (no basta solo AVAX para gas). |
| Thirdweb | **Client ID** en front; **Secret Key** donde corresponda; **Server Wallet** y **Merchant** alineados con el despliegue del API (mismo proyecto que `trust-risk-api`). |
| URL del API | Base pública sin barra final, p. ej. `https://api.tu-dominio.com` o `http://127.0.0.1:8787` en local. |

---

## 3. Endpoints (dos recursos x402 distintos)

Deben usarse **exactamente** estas rutas respecto a la base configurada:

| Ruta | Uso | Precio (configurable en servidor) |
|------|-----|-------------------------------------|
| `POST {base}/api/risk-check` | Análisis **estándar** | `TRUST_SETTLE_PRICE_USD` (default **`$0.001`**) |
| `POST {base}/api/risk-check/deep` | Mismo motor B3 + **más tokens** para el LLM | `TRUST_SETTLE_DEEP_PRICE_USD` (default **`$0.02`**) |

**Importante (x402 `exact`):** el campo `resource` dentro de `accepts` debe coincidir **byte a byte** con la URL que el cliente usa para ese flujo (incluye `/deep` si aplica). No mezclar `localhost` vs `127.0.0.1` con lo que el servidor tiene en `TRUST_PUBLIC_BASE_URL`.

---

## 4. Cuerpo del `POST` (JSON)

Mínimo requerido (validado por el API):

```json
{
  "chainId": 43113,
  "to": "0x…40 hex…",
  "data": "0x…",
  "value": "0"
}
```

Opcionales:

- `origin` — URL válida si la envías.
- `localFlags` — array de strings `UPPER_SNAKE_CASE` (p. ej. hints del cliente).
- `clientRef` — string libre para trazas/dedupe en el cliente (el motor B3 lo ignora).

Esquema de referencia: [risk-check.request.schema.json](./contracts/risk-check.request.schema.json).

**Responsabilidad de Persona A:** en producción, `to` / `data` / `value` deben reflejar la **transacción real o el preview** que el usuario va a firmar. Los demos que usan `0x1111…` y `data: "0x"` son solo para E2E.

---

## 5. Flujo x402 (orden obligatorio)

1. **Primera petición:** `POST` con `Content-Type: application/json` y el body anterior **sin** cabecera de pago (`X-PAYMENT` / `PAYMENT-SIGNATURE` vacías).
2. **Respuesta esperada:** **402** con cuerpo **x402 v1** en la raíz: `x402Version`, `error`, `accepts[]` (thirdweb `wrapFetchWithPayment` entiende este formato).
3. **Cliente:** con thirdweb, construir el pago a partir de `accepts` (especialmente `resource` absoluto, `mimeType`, `payTo`, `maxAmountRequired`, red Fuji, USDC).
4. **Segunda petición:** **mismo body JSON** que en el paso 1, más la cabecera de pago (`X-PAYMENT` en v1).
5. **Respuesta esperada:** **200** con el JSON de riesgo (ver §6).

El servidor acepta cabecera de pago en este orden: `PAYMENT-SIGNATURE` luego `X-PAYMENT` (detalle en [risk-check.protocol.md](./contracts/risk-check.protocol.md)).

---

## 6. Respuesta HTTP 200

Campos del **motor B3** (siempre presentes tras pago válido):

- `verified`, `reputationScore`, `paidRiskScore`, `paidFlags`, `explanationSeed`
- `simulatedOutcome` (opcional según caso)

Campo **contractProbe** (siempre presente en el `200` actual):

- Metadatos de `eth_getCode` sobre `to` en **Fuji** cuando el servidor tiene `TRUST_FUJI_RPC_URL`: `kind` (`eoa` | `contract`), `bytecodeLengthBytes`, opcional `deterministicHints`.
- Si no hay URL RPC u otro fallo: `probeError` (`no_rpc_url`, `timeout`, `rpc_unavailable`, etc.) — el cliente debe degradar la UI sin bloquear el flujo.

Campo **explorerSourceProbe** (siempre presente):

- Indica si el contrato tiene **código fuente verificado** en el explorador (Routescan / API tipo Etherscan para Fuji): `sourceVerified`, `contractName`, `compilerVersion`, `sourceLengthChars` (tamaño devuelto por la API; el **texto Solidity no** viaja en el JSON por tamaño).
- Si la consulta se omitió: `lookupReason` (p. ej. `not_a_contract`, `explorer_disabled`). Si falló la API: `probeError`.
- Los **flags B3** pueden incluir `EXPLORER_SOURCE_NOT_VERIFIED` (sospecha si no hay verificación pública) o `EXPLORER_SOURCE_VERIFIED` cuando sí la hay.

Campos **LLM** (si el operador activó Ollama en el servidor):

- `llmAnalysis` — además de `text` y `tier` (`standard` | `deep`), puede incluir **`verdict`** (`safe` | `caution` | `malicious` | `unknown`), **`flags`** (array de strings), **`summary`**, **`disclaimer`** (obligatorio leer en UI: la IA no garantiza seguridad).
- `llmSkippedReason` — si el LLM está desactivado o falló (el **200**, B3 y `contractProbe` siguen llegando).

**Sugerencia de UI:** mostrar chips o badges a partir de `paidFlags` y, si existen, `llmAnalysis.verdict` + `llmAnalysis.flags`; no presentar el veredicto IA como verdad absoluta.

Ejemplos: [risk-check.responses.json](./contracts/risk-check.responses.json).

---

## 7. Alineación servidor ↔ cliente

En `trust-risk-api`, **`TRUST_PUBLIC_BASE_URL`** debe ser **exactamente** la base con la que el navegador o la extensión construye la URL del `POST` (host + puerto + esquema). Si no coincide, el facilitador puede rechazar el pago o haber **mismatch** de `resource`.

Variables relevantes del servidor (ver [services/trust-risk-api/.env.example](../../services/trust-risk-api/.env.example)):

- `THIRDWEB_SECRET_KEY`, `THIRDWEB_SERVER_WALLET_ADDRESS`, `MERCHANT_WALLET_ADDRESS`
- `TRUST_PUBLIC_BASE_URL`, `PORT`
- `TRUST_SETTLE_PRICE_USD`, `TRUST_SETTLE_DEEP_PRICE_USD`
- `TRUST_FUJI_RPC_URL`, `TRUST_RPC_TIMEOUT_MS` (sondeo `eth_getCode`)
- `TRUST_EXPLORER_API_URL`, `TRUST_EXPLORER_API_KEY`, `TRUST_EXPLORER_TIMEOUT_MS`, `TRUST_EXPLORER_DISABLED` (fuente verificada + flags)
- `TRUST_LLM_ENABLED`, `OLLAMA_*`, límites de tokens, `TRUST_LLM_MAX_INPUT_CHARS`, `TRUST_LLM_SOLIDITY_MAX_CHARS`, `TRUST_LLM_PREFER_SOURCE_OVER_BYTECODE`, `TRUST_LLM_BYTECODE_MAX_CHARS_*` (opcional)

---

## 8. Cliente web (patrón de referencia)

En el repo hay un flujo completo en **x402-starter-kit**:

- `wrapFetchWithPayment` + `createNormalizedFetch` (Fuji) + `maxValue` en USDC base units **≥** el `maxAmountRequired` del tier que puedas usar (si soportas **deep**, el tope debe cubrir el deep; ver constantes en el starter).

Guía paso a paso local: [x402-starter-kit/TRUST-E2E.md](../../../x402-starter-kit/TRUST-E2E.md).

---

## 9. Extensión enKrypt (referencia de código)

Bajo `packages/extension/src/trust/`:

- **Constantes:** rutas, red, unidades USDC de ejemplo, `TRUST_X402_WRAP_MAX_VALUE_BIGINT` — [constants.ts](../../packages/extension/src/trust/constants.ts)
- **Tipos:** request + evidencia + `TrustLlmAnalysis` — [types.ts](../../packages/extension/src/trust/types.ts)
- **Requisitos x402 por defecto (manual / debugging):** `getTrustDefaultPaymentRequirement`, `getTrustDeepPaymentRequirement` — [paymentPolicy.ts](../../packages/extension/src/trust/agent/paymentPolicy.ts)

Persona A puede copiar el patrón del starter o cablear la extensión para llamar al mismo endpoint con el body real de la tx interceptada.

---

## 10. Errores habituales

| Síntoma | Causa probable |
|---------|----------------|
| `Recipient mismatch` | `accepts` del primer 402 no generados por el mismo facilitador/precio que el settle; o cliente firmó para otro `resource` / precio. |
| CORS en el 2.º POST | El API debe permitir cabeceras del retry (`X-PAYMENT`, etc.); en `listen.ts` ya está pensado para thirdweb. |
| 402 en el 2.º POST | Saldo USDC insuficiente, pago expirado, o `resource`/precio no coinciden. |
| Sin `llmAnalysis` | `TRUST_LLM_ENABLED` false, Ollama caído, o timeout — revisar `llmSkippedReason`. |
| 422 | `chainId` ≠ 43113. |

---

## 11. Checklist para Persona A

- [ ] Definir URL base de prod/staging y fijar `TRUST_PUBLIC_BASE_URL` igual en el servidor.
- [ ] Confirmar precios (`TRUST_SETTLE_*`) y que el wallet tenga USDC suficiente para pruebas.
- [ ] Implementar 402 → firma → retry con **mismo body**.
- [ ] `maxValue` (o equivalente) ≥ `maxAmountRequired` del tier usado.
- [ ] Sustituir payload demo por **calldata real** desde el flujo del producto.
- [ ] Mapear UI a `paidFlags`, `contractProbe`, scores y, si aplica, `llmAnalysis.verdict` / `flags` / `text` y el `disclaimer`.
- [ ] Leer contrato formal: [risk-check.protocol.md](./contracts/risk-check.protocol.md).

---

## 12. Documentos de contrato (índice)

| Documento | Contenido |
|-----------|-----------|
| [risk-check.protocol.md](./contracts/risk-check.protocol.md) | Endpoints, códigos HTTP, x402, economía, LLM |
| [risk-check.request.schema.json](./contracts/risk-check.request.schema.json) | Schema JSON del body |
| [risk-check.responses.json](./contracts/risk-check.responses.json) | Ejemplos 200 / 402 estándar y deep |
| [services/trust-risk-api/README.md](../../services/trust-risk-api/README.md) | Arranque, pruebas, fixtures B3 |

---

*Última actualización: alineado con `trust-risk-api` (rutas estándar + deep, `contractProbe`, pricing por env, Ollama JSON opcional).*
