import { TRUST_FUJI_CHAIN_ID } from '@/trust/constants';
import type { TrustRiskCheckRequest } from '@/trust/types';

const EVM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const HEX_REGEX = /^0x([a-fA-F0-9]{2})*$/;
const NON_NEGATIVE_INT_STRING_REGEX = /^(0|[1-9][0-9]*)$/;
const FLAG_REGEX = /^[A-Z][A-Z0-9_]*$/;

export interface ValidationResult {
  ok: boolean;
  reason?: string;
}

export const validateTrustRiskCheckRequest = (
  payload: TrustRiskCheckRequest
): ValidationResult => {
  if (!Number.isInteger(payload.chainId)) {
    return { ok: false, reason: 'chainId must be an integer' };
  }

  if (payload.chainId !== TRUST_FUJI_CHAIN_ID) {
    return { ok: false, reason: 'unsupported chainId for TRUST MVP' };
  }

  if (!EVM_ADDRESS_REGEX.test(payload.to)) {
    return { ok: false, reason: 'to must be a valid EVM address' };
  }

  if (!HEX_REGEX.test(payload.data)) {
    return { ok: false, reason: 'data must be a valid hex string' };
  }

  if (!NON_NEGATIVE_INT_STRING_REGEX.test(payload.value)) {
    return { ok: false, reason: 'value must be a non-negative decimal string' };
  }

  if (payload.origin) {
    try {
      // URL constructor gives us an inexpensive RFC-aware format check.
      new URL(payload.origin);
    } catch {
      return { ok: false, reason: 'origin must be a valid URL when provided' };
    }
  }

  if (payload.localFlags) {
    const hasInvalidFlag = payload.localFlags.some((flag) => !FLAG_REGEX.test(flag));
    if (hasInvalidFlag) {
      return { ok: false, reason: 'localFlags must be uppercase snake_case strings' };
    }
  }

  return { ok: true };
};

