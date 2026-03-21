# TRUST Risk API (x402 + Fuji)

API para riesgo de transacción con pago x402 usando [thirdweb `settlePayment`](https://portal.thirdweb.com/x402/server).

- `POST /api/risk-check` — tier **estándar** (precio env `TRUST_SETTLE_PRICE_USD`, default `$0.001`).
- `POST /api/risk-check/deep` — tier **deep** (más tokens LLM; precio `TRUST_SETTLE_DEEP_PRICE_USD`, default `$0.02`).

Mismo JSON de cuerpo en ambos; el `resource` en x402 debe coincidir con la ruta llamada.

## Requisitos

- Node 18+
- Cuenta thirdweb + **Secret Key**
- **Server Wallet** (ERC-4337) en **Avalanche Fuji**
- **MERCHANT_WALLET_ADDRESS** (destinatario de negocio; se envía al facilitador como `recipientAddress`)
- Test USDC en Fuji para la wallet que paga (ver [Avalanche x402 setup](https://build.avax.network/academy/blockchain/x402-payment-infrastructure/05-hands-on-implementation/01-environment-setup))

**Facilitador thirdweb:** el primer **402** y el **settle** usan la misma llamada `facilitator.accepts()`. El `payTo` dentro de `accepts` (lo que MetaMask firma) suele ser el **server wallet**, no el merchant; si antes armábamos `accepts` a mano con el merchant aparecía `Recipient mismatch` en el segundo POST.

## Configuracion

```bash
cp .env.example .env
# Edita .env con tus valores reales
```

**Importante:** `TRUST_PUBLIC_BASE_URL` debe ser **exactamente** la URL base que usara el cliente al llamar al API (incluye host y puerto). Si llamas con `http://127.0.0.1:8787`, no uses `http://localhost:8787` en el env.

**Precios:** `TRUST_SETTLE_PRICE_USD` y `TRUST_SETTLE_DEEP_PRICE_USD` (ver `.env.example`). Montos muy pequeños pueden ser rechazados por el facilitador; sube el valor solo en env.

**LLM (Ollama):** con `TRUST_LLM_ENABLED=true` y Ollama en marcha, la respuesta `200` puede incluir `llmAnalysis` además del motor B3. Si Ollama falla, el `200` sigue con B3 y `llmSkippedReason`.

## Arrancar

```bash
npm run dev
```

## Probar (sin pago → 402)

El servidor debe responder **HTTP 402** con cuerpo **x402 v1** en la raíz del JSON (compatible con `wrapFetchWithPayment` de thirdweb):

- `x402Version`, `error`, `accepts` (no va envuelto en `error.details`).

Sigue existiendo la cabecera `x-request-id`.

### Por que PowerShell muestra “error” en rojo

**Eso es normal.** `Invoke-WebRequest` (y a veces `Invoke-RestMethod`) tratan cualquier status **4xx** como fallo y lanzan excepcion, **aunque el cuerpo sea el JSON correcto del protocolo x402**. Tu salida ya demuestra que el API funciona: el JSON incluye `accepts` con `payTo`, `asset` (USDC Fuji), `maxAmountRequired`, etc.

### Opcion A — PowerShell 7+ (`-SkipHttpErrorCheck`)

```powershell
$body = @{
  chainId = 43113
  to = "0x1111111111111111111111111111111111111111"
  data = "0x"
  value = "0"
} | ConvertTo-Json

$r = Invoke-WebRequest -Method POST `
  -Uri "http://127.0.0.1:8787/api/risk-check" `
  -ContentType "application/json" `
  -Body $body `
  -SkipHttpErrorCheck

$r.StatusCode   # debe ser 402
$r.Content | ConvertFrom-Json
```

### Opcion B — Capturar la respuesta en el `catch` (Windows PowerShell 5.1)

```powershell
$body = @{
  chainId = 43113
  to = "0x1111111111111111111111111111111111111111"
  data = "0x"
  value = "0"
} | ConvertTo-Json

try {
  Invoke-WebRequest -Method POST `
    -Uri "http://127.0.0.1:8787/api/risk-check" `
    -ContentType "application/json" `
    -Body $body
} catch {
  $_.ErrorDetails.Message | ConvertFrom-Json
}
```

En el **primer 402** (cuerpo x402 v1 en la raíz) verás `accepts` con `payTo`, `maxAmountRequired`, etc. (según el facilitador). Si el cliente recibe un envelope `error.details`, es otro formato de error.

## Probar (con pago → thirdweb)

1. Repite la peticion anterior y copia los requisitos de `accepts`.
2. Con una wallet con USDC Fuji, firma y envia el payload x402 segun el cliente (header `PAYMENT-SIGNATURE` o `X-PAYMENT`).
3. Reintenta el mismo `POST` anadiendo el header de pago.

Si el pago es valido, respuesta **200** con el cuerpo de riesgo del **motor B3** (`evaluatePaidRisk`) y, si LLM habilitado, `llmAnalysis` opcional desde Ollama.

## Fase B3 — Motor de riesgo (deterministico)

Tras un pago x402 valido, la respuesta `200` incluye:

- `reputationScore` / `paidRiskScore` (0–100)
- `paidFlags` (orden estable)
- `simulatedOutcome` / `explanationSeed`
- `verified`: `true` solo si `to` esta en la lista **trusted**, no es **malicious**, y no hay `UNLIMITED_APPROVAL` en los flags finales.

Reglas principales:

- Decodifica `approve(address,uint256)` y detecta **approval ilimitado** (`uint256` max).
- Clasifica calldata: transfer nativo (`data` vacio + `value` > 0), `approve`, u **selector desconocido**.
- Mezcla `localFlags` del cliente (`UNLIMITED_APPROVAL`, `UNKNOWN_CONTRACT`, etc.).

### Fixtures (3 perfiles: bueno / malo / raro)

Sin variables de entorno, todos los `to` se tratan como no verificados salvo que edites `src/engine/fixtures.ts`.

Opcional en `.env` (comas, sin espacios problematicos):

- `TRUST_FIXTURE_TRUSTED_CONTRACTS` — allowlist “buena”
- `TRUST_FIXTURE_MALICIOUS_CONTRACTS` — “mala”
- `TRUST_FIXTURE_SUSPICIOUS_CONTRACTS` — “rara” / alta incertidumbre

Reinicia `npm run dev` tras cambiar el env.

## Pruebas automaticas (Vitest)

```bash
npm run test
npm run test:watch
```

Cubre: validacion de request (`contracts`), parsing de calldata (`approve`, nativo, selector), motor `evaluatePaidRisk` con fixtures por env, pricing (`usdPriceToUsdcBaseUnits`), Ollama (`ollama.test.ts` con fetch mock).

## Scripts

- `npm run dev` — servidor con recarga
- `npm run typecheck` — TypeScript
- `npm run test` — Vitest una pasada
- `npm run test:watch` — Vitest en modo watch
