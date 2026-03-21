# TRUST Risk API (x402 + Fuji)

API minima para `POST /api/risk-check` con flujo x402 usando [thirdweb `settlePayment`](https://portal.thirdweb.com/x402/server).

## Requisitos

- Node 18+
- Cuenta thirdweb + **Secret Key**
- **Server Wallet** (ERC-4337) en **Avalanche Fuji**
- **MERCHANT_WALLET_ADDRESS** (recibe USDC del pago)
- Test USDC en Fuji para la wallet que paga (ver [Avalanche x402 setup](https://build.avax.network/academy/blockchain/x402-payment-infrastructure/05-hands-on-implementation/01-environment-setup))

## Configuracion

```bash
cp .env.example .env
# Edita .env con tus valores reales
```

**Importante:** `TRUST_PUBLIC_BASE_URL` debe ser **exactamente** la URL base que usara el cliente al llamar al API (incluye host y puerto). Si llamas con `http://127.0.0.1:8787`, no uses `http://localhost:8787` en el env.

## Arrancar

```bash
npm run dev
```

## Probar (sin pago → 402)

El servidor debe responder **HTTP 402** con `error.code: PAYMENT_REQUIRED` y `error.details.accepts`.

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

Debes ver `error.details.accepts` con los requisitos de pago (tu `payTo` = `MERCHANT_WALLET_ADDRESS`).

## Probar (con pago → thirdweb)

1. Repite la peticion anterior y copia los requisitos de `accepts`.
2. Con una wallet con USDC Fuji, firma y envia el payload x402 segun el cliente (header `PAYMENT-SIGNATURE` o `X-PAYMENT`).
3. Reintenta el mismo `POST` anadiendo el header de pago.

Si el pago es valido, respuesta **200** con el cuerpo de riesgo (motor deterministico real llega en fase siguiente).

## Scripts

- `npm run dev` — servidor con recarga
- `npm run typecheck` — TypeScript
