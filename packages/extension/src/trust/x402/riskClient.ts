import type { ThirdwebClient } from 'thirdweb';
import type { Wallet } from 'thirdweb/wallets';
import {
  TRUST_FUJI_CHAIN_ID,
  TRUST_X402_DEEP_RESOURCE,
  TRUST_X402_RESOURCE,
  TRUST_X402_WRAP_MAX_VALUE_BIGINT,
} from '../constants';
import type { PendingTxContext, TrustPaidRiskEvidence } from '../types';
import { createNormalizedFetch } from './normalizeFetch';

export type TrustX402Context = {
  client: ThirdwebClient;
  wallet: Wallet;
};

/**
 * El trust-risk-api valida `origin` con `new URL()` si viene en el body.
 * Textos como "Enkrypt Internal", "unknown" o solo hostname sin esquema → 400.
 */
/** Contrato “sin `to`” (creación) — el API exige dirección EVM válida. */
const RISK_CHECK_ZERO_ADDRESS =
  '0x0000000000000000000000000000000000000000' as const;

const EVM_ADDRESS_BODY = /^[a-fA-F0-9]{40}$/;

/**
 * trust-risk-api: `to` debe cumplir /^0x[a-fA-F0-9]{40}$/.
 * Creación de contrato y `tx.to` vacío llegaban como "" → 400.
 */
function normalizeToForRiskApi(to: string | undefined | null): string {
  let s = (to ?? '').trim();
  if (!s) {
    return RISK_CHECK_ZERO_ADDRESS;
  }
  if (!s.startsWith('0x')) {
    if (EVM_ADDRESS_BODY.test(s)) {
      s = `0x${s}`;
    }
  }
  if (/^0x[a-fA-F0-9]{40}$/i.test(s)) {
    return `0x${s.slice(2).toLowerCase()}`;
  }
  const m = s.match(/\b(0x)?([a-fA-F0-9]{40})\b/i);
  if (m) {
    return `0x${m[2].toLowerCase()}`;
  }
  console.warn(
    'TRUST: `to` no es una dirección EVM reconocida; usando 0x0 para el risk-check.',
    to,
  );
  return RISK_CHECK_ZERO_ADDRESS;
}

function normalizeOriginForRiskApi(origin?: string): string | undefined {
  if (!origin || typeof origin !== 'string') return undefined;
  const t = origin.trim();
  if (!t || t.toLowerCase() === 'unknown') return undefined;
  try {
    if (/^https?:\/\//i.test(t)) {
      new URL(t);
      return t;
    }
    const withScheme = `https://${t}`;
    new URL(withScheme);
    return withScheme;
  } catch {
    return undefined;
  }
}

function buildRiskCheckPayload(
  txContext: PendingTxContext,
  localFlags: string[],
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    chainId: txContext.chainId,
    to: normalizeToForRiskApi(txContext.to),
    data: txContext.data,
    value: txContext.value,
    localFlags,
  };
  const o = normalizeOriginForRiskApi(txContext.origin);
  if (o) payload.origin = o;
  return payload;
}

export type TrustRiskCheckTier = 'standard' | 'deep';

function getRiskCheckUrl(tier: TrustRiskCheckTier = 'standard'): string {
  const raw = (import.meta.env.VITE_TRUST_RISK_API_BASE_URL as string | undefined)?.trim();
  const base = (raw && raw.length > 0 ? raw : 'http://127.0.0.1:8787').replace(
    /\/$/,
    '',
  );
  const path =
    tier === 'deep' ? TRUST_X402_DEEP_RESOURCE : TRUST_X402_RESOURCE;
  return `${base}${path}`;
}

/**
 * POST al risk-check con pago x402 (thirdweb `wrapFetchWithPayment` + firma Enkrypt).
 * Requiere `VITE_THIRDWEB_CLIENT_ID`, cuenta con USDC en Fuji y URL del API accesible (CORS).
 */
export async function fetchPaidRiskEvidence(
  txContext: PendingTxContext,
  localFlags: string[],
  x402?: TrustX402Context | null,
  tier: TrustRiskCheckTier = 'standard',
): Promise<TrustPaidRiskEvidence | null> {
  const url = getRiskCheckUrl(tier);
  const payload = buildRiskCheckPayload(txContext, localFlags);

  const onFuji = txContext.chainId === TRUST_FUJI_CHAIN_ID;

  if (!x402 || !onFuji) {
    if (onFuji && !x402) {
      console.warn(
        'TRUST: falta VITE_THIRDWEB_CLIENT_ID o wallet x402; no se puede completar el pago USDC (402).',
      );
    }
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        cache: 'no-store',
      });
      if (response.status === 402) {
        return null;
      }
      if (!response.ok) {
        throw new Error(`Risk API HTTP Status: ${response.status}`);
      }
      return (await response.json()) as TrustPaidRiskEvidence;
    } catch (error) {
      console.warn('TRUST: fallo al llamar al Risk API sin pago.', error);
      return null;
    }
  }

  try {
    const { wrapFetchWithPayment } = await import('thirdweb/x402');
    const normalizedFetch = createNormalizedFetch(TRUST_FUJI_CHAIN_ID);
    const fetchWithPay = wrapFetchWithPayment(
      normalizedFetch,
      x402.client,
      x402.wallet,
      { maxValue: TRUST_X402_WRAP_MAX_VALUE_BIGINT },
    );

    const response = await fetchWithPay(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let detail: string;
      try {
        detail = JSON.stringify(await response.json());
      } catch {
        detail = await response.text();
      }
      throw new Error(
        `Risk API HTTP ${response.status}: ${detail.slice(0, 500)}`,
      );
    }

    return (await response.json()) as TrustPaidRiskEvidence;
  } catch (error) {
    console.warn('TRUST: pago x402 o Risk API falló.', error);
    return null;
  }
}
