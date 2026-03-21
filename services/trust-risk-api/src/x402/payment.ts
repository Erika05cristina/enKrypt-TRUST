import {
  FUJI_NETWORK,
  FUJI_USDC_ADDRESS,
  PAYMENT_HEADER_FALLBACK,
  PAYMENT_HEADER_PRIMARY,
  RISK_CHECK_RESOURCE,
  TRUST_X402_MAX_TIMEOUT_SECONDS,
  TRUST_X402_PRICE_BASE_UNITS,
  TRUST_X402_SCHEME,
} from '../constants.js';
import type { X402AcceptOption } from '../types.js';

export const readPaymentHeader = (headers: Headers): string | null => {
  const primary = headers.get(PAYMENT_HEADER_PRIMARY);
  if (primary) return primary;
  return headers.get(PAYMENT_HEADER_FALLBACK);
};

export const buildPaymentRequirement = (payTo: string): X402AcceptOption => ({
  scheme: TRUST_X402_SCHEME,
  network: FUJI_NETWORK,
  maxAmountRequired: TRUST_X402_PRICE_BASE_UNITS,
  resource: RISK_CHECK_RESOURCE,
  description: 'TRUST paid risk check',
  payTo,
  asset: FUJI_USDC_ADDRESS,
  maxTimeoutSeconds: TRUST_X402_MAX_TIMEOUT_SECONDS,
});

