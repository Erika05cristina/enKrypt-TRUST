/**
 * Precios x402 (thirdweb Money string). Defaults baratos para pruebas; override con env en producción.
 */
const DEFAULT_STANDARD_USD = '$0.001';
const DEFAULT_DEEP_USD = '$0.02';

export const getStandardSettlePriceUsd = (): string => {
  const v = process.env.TRUST_SETTLE_PRICE_USD?.trim();
  return v && v.length > 0 ? v : DEFAULT_STANDARD_USD;
};

export const getDeepSettlePriceUsd = (): string => {
  const v = process.env.TRUST_SETTLE_DEEP_PRICE_USD?.trim();
  return v && v.length > 0 ? v : DEFAULT_DEEP_USD;
};

/**
 * Convierte un precio tipo "$0.001" o "0.02" a unidades mínimas USDC (6 decimales).
 * Útil para clientes que fijan maxValue en wrapFetchWithPayment.
 */
export const usdPriceToUsdcBaseUnits = (usd: string): bigint => {
  const s = usd.trim().replace(/^\$/, '');
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) {
    return 0n;
  }
  return BigInt(Math.round(n * 1_000_000));
};
