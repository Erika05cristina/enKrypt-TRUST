# TRUST / enKrypt-TRUST — Installation Guide

This guide explains how to **clone**, **install dependencies**, and **run** the Enkrypt monorepo with the **TRUST** additions: the browser extension and the **`trust-risk-api`** service. All steps assume a Unix-like shell or **PowerShell** on Windows.

---

## 1. Prerequisites

| Requirement | Notes |
|-------------|--------|
| **Node.js** | **20.x** recommended (see upstream [Enkrypt README](https://github.com/enkryptcom/enKrypt) and `.nvmrc` if present). |
| **Yarn** | **4.x** (Berry). The repo uses `packageManager: yarn@4.5.1` in `package.json`. Install globally: `npm install -g yarn` or use Corepack: `corepack enable`. |
| **Git** | For cloning. |
| **Optional: Ollama** | Only if you want LLM summaries from the risk API (`TRUST_LLM_ENABLED=true`). |
| **Optional: ngrok / tunnel** | If the extension or x402 must reach your API from a device that cannot use `localhost`. |

---

## 2. Clone the repository

```bash
git clone <your-fork-or-remote-url> enKrypt-TRUST
cd enKrypt-TRUST
```

If you track upstream Enkrypt separately:

```bash
git remote add upstream https://github.com/enkryptcom/enKrypt.git
git fetch upstream
```

---

## 3. Install monorepo dependencies (extension and workspaces)

From the **repository root** (`enKrypt-TRUST/`):

```bash
yarn install
```

This installs workspace packages under `packages/*` (extension, keyring, utils, etc.).

**Note:** `services/trust-risk-api` is **not** a Yarn workspace in this layout. It has its **own** `package.json` and must be installed separately (next section).

---

## 4. Install and run `trust-risk-api`

### 4.1 Install

```bash
cd services/trust-risk-api
npm install
```

### 4.2 Configure environment

```bash
cp .env.example .env
```

Edit **`.env`** in `services/trust-risk-api/` (not only `.env.example`). Required variables typically include:

| Variable | Purpose |
|----------|---------|
| `THIRDWEB_SECRET_KEY` | thirdweb dashboard secret key (facilitator). |
| `THIRDWEB_SERVER_WALLET_ADDRESS` | Server wallet (ERC-4337) on **Avalanche Fuji**. |
| `MERCHANT_WALLET_ADDRESS` | Recipient for x402 USDC (business wallet). |
| `TRUST_PUBLIC_BASE_URL` | **Exact** public base URL clients use (e.g. `http://127.0.0.1:8787` locally, or `https://your-tunnel.ngrok-free.app`). Must match what the extension calls and what x402 signs. |

Optional but recommended for full features:

- `TRUST_FUJI_RPC_URL` — Fuji JSON-RPC for `eth_getCode` (`contractProbe`).
- Explorer / Ollama / ERC-8004 — see `.env.example` comments.

**Important:** The API loads `.env` from **`services/trust-risk-api/.env`**, regardless of your current shell directory. If you change `.env`, restart the process.

### 4.3 Start the server

```bash
npm run dev
```

Default listen: **`0.0.0.0:8787`** (configurable via `PORT` and `HOST` in `.env`).

### 4.4 Quick checks

- **Health / discovery:** `GET http://127.0.0.1:8787/agent-registration.json` — EIP-8004 registration JSON (no payment).
- **Paid risk check:** `POST http://127.0.0.1:8787/api/risk-check` with JSON body → expect **402** without payment headers; with x402 client, **200** after payment.

See `services/trust-risk-api/README.md` for PowerShell examples and x402 behavior.

### 4.5 Tests (API only)

```bash
cd services/trust-risk-api
npm test
```

---

## 5. Browser extension (Enkrypt + TRUST)

### 5.1 Configure Vite env

Copy the example file:

```bash
cd packages/extension
cp .env.example .env
```

Edit **`packages/extension/.env`**:

| Variable | Purpose |
|----------|---------|
| `VITE_THIRDWEB_CLIENT_ID` | thirdweb **Client ID** (browser-safe) for `wrapFetchWithPayment` on Fuji. |
| `VITE_TRUST_RISK_API_BASE_URL` | Base URL of `trust-risk-api` **without** trailing slash (same logical host as `TRUST_PUBLIC_BASE_URL` on the server). |

### 5.2 Build prerequisites (upstream)

Some Enkrypt packages require a prebuild step (e.g. Kadena). From **repo root**, follow the main [README.md](./README.md):

```bash
yarn install
yarn build:all
```

Or use the watch flow you prefer (`yarn watch-extension`, etc.) as documented upstream.

### 5.3 Develop the extension

Typical flow from root or `packages/extension`:

```bash
cd packages/extension
yarn watch
```

Select the browser via env (e.g. `BROWSER=chrome`) per upstream docs. Load the **unpacked** extension from `packages/extension/dist` (or the path your build outputs).

### 5.4 TRUST in the UI

TRUST runs on **Avalanche Fuji** (`43113`) when verifying transactions (Send flow and dApp signing). You need:

- Extension configured as above.
- Wallet with **test USDC** on Fuji for x402 micropayments.
- Running **`trust-risk-api`** reachable from the browser (CORS is open on the API for development).

---

## 6. Public URL and x402 (tunnels)

If the extension runs on a machine where `localhost` is not the same host as the API, or you need HTTPS:

1. Run **`trust-risk-api`** and expose it (e.g. ngrok): `https://abc123.ngrok-free.app` → port `8787`.
2. Set **`TRUST_PUBLIC_BASE_URL=https://abc123.ngrok-free.app`** in the API `.env`.
3. Set **`VITE_TRUST_RISK_API_BASE_URL=https://abc123.ngrok-free.app`** in the extension `.env`.
4. Rebuild/reload the extension and restart the API.

Mismatch between signed `resource` and server config is a common cause of x402 settlement failures.

---

## 7. Optional: Ollama (LLM)

1. Install and run [Ollama](https://ollama.com/) locally.
2. In `services/trust-risk-api/.env`: `TRUST_LLM_ENABLED=true`, `OLLAMA_BASE_URL`, `OLLAMA_MODEL` as needed.
3. Restart the API. Paid responses may include `llmAnalysis`; if Ollama is down, `200` still returns with B3 and optional `llmSkippedReason`.

---

## 8. Optional: EIP-8004 agent registration

After minting an agent on the Fuji IdentityRegistry and calling `setAgentURI` to your public `.../agent-registration.json`, set `TRUST_ERC8004_*` in the API `.env` as documented in `.env.example`. Restart the API. The risk-check **200** may include `erc8004`; the extension **TrustPanel** can display it.

---

## 9. Troubleshooting

| Issue | What to check |
|-------|----------------|
| `contractProbe.probeError: no_rpc_url` | Set `TRUST_FUJI_RPC_URL` in API `.env` and restart. |
| x402 `Recipient mismatch` / invalid signature | `payTo` / facilitator vs merchant docs in `trust-risk-api/README.md`; EIP-712 domain fixes are in `enkryptX402Wallet.ts`. |
| Extension gets **402** forever | `VITE_THIRDWEB_CLIENT_ID`, USDC balance on Fuji, API URL and CORS. |
| Wrong risk URL | `TRUST_PUBLIC_BASE_URL` must equal the client’s base URL (including `127.0.0.1` vs `localhost`). |
| `.env` ignored | API only reads `services/trust-risk-api/.env`. |

---

## 10. Documentation index

| Document | Content |
|----------|---------|
| [README.md](./README.md) | Upstream Enkrypt build & browser load. |
| [technical.md](./technical.md) | TRUST architecture (repo root). |
| [docs/trust/contracts/risk-check.protocol.md](./docs/trust/contracts/risk-check.protocol.md) | HTTP contract for risk check + x402. |
| [docs/trust/PERSON_A_INTEGRATION.md](./docs/trust/PERSON_A_INTEGRATION.md) | Client integration (may still be non-English; see protocol for English contract). |
| [services/trust-risk-api/README.md](./services/trust-risk-api/README.md) | API env, thirdweb, ngrok, tests. |

---

*Installation guide for **enKrypt-TRUST** — clone, dependencies, `trust-risk-api`, and extension configuration.*
