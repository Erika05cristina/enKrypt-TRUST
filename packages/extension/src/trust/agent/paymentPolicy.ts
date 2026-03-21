import {
  TRUST_FUJI_USDC_ADDRESS,
  TRUST_X402_DEEP_RESOURCE,
  TRUST_X402_MAX_TIMEOUT_SECONDS,
  TRUST_X402_NETWORK,
  TRUST_X402_PRICE_BASE_UNITS_DEEP,
  TRUST_X402_PRICE_BASE_UNITS_STANDARD,
  TRUST_X402_RESOURCE,
  TRUST_X402_SCHEME,
} from '@/trust/constants';
import type { TrustX402AcceptOption } from '@/trust/types';

/** `publicBaseUrl` sin barra final; mismo valor que TRUST_PUBLIC_BASE_URL en el API. */
export const getTrustDefaultPaymentRequirement = (
  payTo: string,
  publicBaseUrl: string
): TrustX402AcceptOption => {
  const base = publicBaseUrl.replace(/\/$/, '');
  return {
    scheme: TRUST_X402_SCHEME,
    network: TRUST_X402_NETWORK,
    maxAmountRequired: TRUST_X402_PRICE_BASE_UNITS_STANDARD,
    resource: `${base}${TRUST_X402_RESOURCE}`,
    description: 'TRUST paid risk check',
    mimeType: 'application/json',
    payTo,
    asset: TRUST_FUJI_USDC_ADDRESS,
    maxTimeoutSeconds: TRUST_X402_MAX_TIMEOUT_SECONDS,
  };
};

export const getTrustDeepPaymentRequirement = (
  payTo: string,
  publicBaseUrl: string
): TrustX402AcceptOption => {
  const base = publicBaseUrl.replace(/\/$/, '');
  return {
    scheme: TRUST_X402_SCHEME,
    network: TRUST_X402_NETWORK,
    maxAmountRequired: TRUST_X402_PRICE_BASE_UNITS_DEEP,
    resource: `${base}${TRUST_X402_DEEP_RESOURCE}`,
    description: 'TRUST paid risk check (deep LLM analysis)',
    mimeType: 'application/json',
    payTo,
    asset: TRUST_FUJI_USDC_ADDRESS,
    maxTimeoutSeconds: TRUST_X402_MAX_TIMEOUT_SECONDS,
  };
};

