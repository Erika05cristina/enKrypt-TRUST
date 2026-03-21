export const TRUST_FUJI_CHAIN_ID = 43113;

export const TRUST_X402_RESOURCE = '/api/risk-check';
export const TRUST_X402_DEEP_RESOURCE = '/api/risk-check/deep';
export const TRUST_X402_SCHEME = 'exact';
export const TRUST_X402_NETWORK = 'avalanche-fuji';
/** Alineado con precio estándar por defecto del API (~$0.001 USDC). */
export const TRUST_X402_PRICE_BASE_UNITS_STANDARD = '1000';
/** Alineado con precio deep por defecto del API (~$0.02 USDC). */
export const TRUST_X402_PRICE_BASE_UNITS_DEEP = '20000';
/** @deprecated Usa STANDARD o DEEP según el endpoint. */
export const TRUST_X402_PRICE_BASE_UNITS = TRUST_X402_PRICE_BASE_UNITS_STANDARD;
/** Máximo para wrapFetchWithPayment si puedes llamar al endpoint deep. */
export const TRUST_X402_WRAP_MAX_VALUE_BIGINT = BigInt(TRUST_X402_PRICE_BASE_UNITS_DEEP);
export const TRUST_X402_MAX_TIMEOUT_SECONDS = 600;
export const TRUST_FUJI_USDC_ADDRESS = '0x5425890298aed601595a70AB815c96711a31Bc65';

export const TRUST_PAYMENT_HEADER_PRIMARY = 'PAYMENT-SIGNATURE';
export const TRUST_PAYMENT_HEADER_FALLBACK = 'X-PAYMENT';
export const TRUST_REQUEST_ID_HEADER = 'x-request-id';

export const TRUST_ERROR_CODES = {
  BAD_REQUEST: 'BAD_REQUEST',
  PAYMENT_REQUIRED: 'PAYMENT_REQUIRED',
  UNSUPPORTED_CHAIN: 'UNSUPPORTED_CHAIN',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

