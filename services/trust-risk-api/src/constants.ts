export const FUJI_CHAIN_ID = 43113;
export const FUJI_NETWORK = 'avalanche-fuji';
export const RISK_CHECK_RESOURCE = '/api/risk-check';
/** Precio en USD string para thirdweb settlePayment (USDC en la red indicada). */
export const TRUST_SETTLE_PRICE_USD = '$0.01';

export const TRUST_X402_SCHEME = 'exact';
export const TRUST_X402_PRICE_BASE_UNITS = '10000'; // $0.01 USDC (6 decimals)
export const TRUST_X402_MAX_TIMEOUT_SECONDS = 600;
export const FUJI_USDC_ADDRESS = '0x5425890298aed601595a70AB815c96711a31Bc65';

export const REQUEST_ID_HEADER = 'x-request-id';
export const PAYMENT_HEADER_PRIMARY = 'PAYMENT-SIGNATURE';
export const PAYMENT_HEADER_FALLBACK = 'X-PAYMENT';

export const ERROR_CODES = {
  BAD_REQUEST: 'BAD_REQUEST',
  PAYMENT_REQUIRED: 'PAYMENT_REQUIRED',
  UNSUPPORTED_CHAIN: 'UNSUPPORTED_CHAIN',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

