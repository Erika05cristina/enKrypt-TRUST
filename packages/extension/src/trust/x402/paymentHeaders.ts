import { TRUST_PAYMENT_HEADER_FALLBACK, TRUST_PAYMENT_HEADER_PRIMARY } from '@/trust/constants';

type HeaderReader = {
  get: (name: string) => string | null;
};

export const getTrustPaymentHeader = (headers: HeaderReader): string | null => {
  const primary = headers.get(TRUST_PAYMENT_HEADER_PRIMARY);
  if (primary) return primary;
  return headers.get(TRUST_PAYMENT_HEADER_FALLBACK);
};

