import { describe, expect, it } from 'vitest';
import { validateRiskCheckRequest } from './contracts.js';

describe('validateRiskCheckRequest', () => {
  it('acepta payload valido Fuji', () => {
    const v = validateRiskCheckRequest({
      chainId: 43113,
      to: '0x1111111111111111111111111111111111111111',
      data: '0x',
      value: '0',
    });
    expect(v.ok).toBe(true);
  });

  it('422 si chainId distinto de Fuji', () => {
    const v = validateRiskCheckRequest({
      chainId: 1,
      to: '0x1111111111111111111111111111111111111111',
      data: '0x',
      value: '0',
    });
    expect(v.ok).toBe(false);
    expect(v.statusCode).toBe(422);
  });

  it('400 si to invalido', () => {
    const v = validateRiskCheckRequest({
      chainId: 43113,
      to: '0xbad',
      data: '0x',
      value: '0',
    });
    expect(v.ok).toBe(false);
    expect(v.statusCode).toBe(400);
  });
});
