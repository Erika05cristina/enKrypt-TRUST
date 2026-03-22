import { FUJI_CHAIN_ID } from './constants.js';
import type { RiskCheckRequest } from './types.js';

const EVM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const HEX_REGEX = /^0x([a-fA-F0-9]{2})*$/;
const NON_NEGATIVE_INT_STRING_REGEX = /^(0|[1-9][0-9]*)$/;
const FLAG_REGEX = /^[A-Z][A-Z0-9_]*$/;

export interface ValidationResult {
  ok: boolean;
  statusCode?: 400 | 422;
  reason?: string;
  errorCode?: string;
}

export const validateRiskCheckRequest = (payload: unknown): ValidationResult => {
  if (!payload || typeof payload !== 'object') {
    return {
      ok: false,
      statusCode: 400,
      reason: 'Request body must be a JSON object',
      errorCode: 'BAD_REQUEST',
    };
    
  }

  

  const req = payload as Partial<RiskCheckRequest>;

  if (!Number.isInteger(req.chainId)) {
    return {
      ok: false,
      statusCode: 400,
      reason: 'chainId must be an integer',
      errorCode: 'BAD_REQUEST',
    };
  }

  if (req.chainId !== FUJI_CHAIN_ID) {
    return {
      ok: false,
      statusCode: 422,
      reason: 'Only Avalanche Fuji (43113) is supported in MVP',
      errorCode: 'UNSUPPORTED_CHAIN',
    };
  }

  if (!req.to || !EVM_ADDRESS_REGEX.test(req.to)) {
    return {
      ok: false,
      statusCode: 400,
      reason: 'to must be a valid EVM address',
      errorCode: 'BAD_REQUEST',
    };
  }

  if (!req.data || !HEX_REGEX.test(req.data)) {
    return {
      ok: false,
      statusCode: 400,
      reason: 'data must be a valid hex string',
      errorCode: 'BAD_REQUEST',
    };
  }

  if (!req.value || !NON_NEGATIVE_INT_STRING_REGEX.test(req.value)) {
    return {
      ok: false,
      statusCode: 400,
      reason: 'value must be a non-negative decimal string',
      errorCode: 'BAD_REQUEST',
    };
  }

  if (req.origin) {
    try {
      new URL(req.origin);
    } catch {
      return {
        ok: false,
        statusCode: 400,
        reason: 'origin must be a valid URL when provided',
        errorCode: 'BAD_REQUEST',
      };
    }
  }

  if (req.localFlags) {
    const invalidFlag = req.localFlags.some((flag) => !FLAG_REGEX.test(flag));
    if (invalidFlag) {
      return {
        ok: false,
        statusCode: 400,
        reason: 'localFlags must be uppercase snake_case strings',
        errorCode: 'BAD_REQUEST',
      };
    }
  }

  return { ok: true };
};

