import { describe, expect, it } from 'vitest';
import { decodeApprove, MAX_UINT256, parseCalldata, parseValueWei } from './calldata.js';

describe('calldata', () => {
  it('parseCalldata: empty + zero value => empty', () => {
    expect(parseCalldata('0x', 0n)).toBe('empty');
  });

  it('parseCalldata: empty data + value > 0 => native_transfer', () => {
    expect(parseCalldata('0x', 1n)).toBe('native_transfer');
    expect(parseCalldata('0x', 1000000000000000000n)).toBe('native_transfer');
  });

  it('parseCalldata: approve selector', () => {
    const data =
      '0x095ea7b300000000000000000000000022222222222222222222222222222222222222220000000000000000000000000000000000000000000000000000000000000001';
    expect(parseCalldata(data, 0n)).toBe('approve');
  });

  it('parseCalldata: unknown selector', () => {
    expect(parseCalldata('0xdeadbeef', 0n)).toBe('unknown');
  });

  it('decodeApprove: capped amount', () => {
    const data =
      '0x095ea7b300000000000000000000000022222222222222222222222222222222222222220000000000000000000000000000000000000000000000000000000000000001';
    const d = decodeApprove(data);
    expect(d).not.toBeNull();
    expect(d!.spender).toBe('0x2222222222222222222222222222222222222222');
    expect(d!.amount).toBe(1n);
    expect(d!.isUnlimited).toBe(false);
  });

  it('decodeApprove: unlimited (max uint256)', () => {
    const data =
      '0x095ea7b30000000000000000000000002222222222222222222222222222222222222222ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const d = decodeApprove(data);
    expect(d).not.toBeNull();
    expect(d!.isUnlimited).toBe(true);
    expect(d!.amount).toBe(MAX_UINT256);
  });

  it('parseValueWei', () => {
    expect(parseValueWei('0')).toBe(0n);
    expect(parseValueWei('123')).toBe(123n);
    expect(parseValueWei('bad')).toBe(0n);
  });
});
