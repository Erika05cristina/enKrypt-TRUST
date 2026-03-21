import {
  TRUST_FUJI_USDC_ADDRESS,
  TRUST_X402_MAX_TIMEOUT_SECONDS,
  TRUST_X402_NETWORK,
  TRUST_X402_PRICE_BASE_UNITS,
  TRUST_X402_RESOURCE,
  TRUST_X402_SCHEME,
} from '@/trust/constants';
import type { TrustX402AcceptOption } from '@/trust/types';

export const getTrustDefaultPaymentRequirement = (payTo: string): TrustX402AcceptOption => ({
  scheme: TRUST_X402_SCHEME,
  network: TRUST_X402_NETWORK,
  maxAmountRequired: TRUST_X402_PRICE_BASE_UNITS,
  resource: TRUST_X402_RESOURCE,
  description: 'TRUST paid risk check',
  payTo,
  asset: TRUST_FUJI_USDC_ADDRESS,
  maxTimeoutSeconds: TRUST_X402_MAX_TIMEOUT_SECONDS,
});

