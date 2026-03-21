const APPROVE_SELECTOR = '095ea7b3';

const MAX_UINT256 = 2n ** 256n - 1n;

export type CalldataKind =
  | 'empty'
  | 'native_transfer'
  | 'approve'
  | 'unknown';

export interface ApproveDecode {
  spender: string;
  amount: bigint;
  isUnlimited: boolean;
}

const normalizeHex = (data: string): string => {
  const d = data.toLowerCase();
  if (d === '0x') return '';
  return d.startsWith('0x') ? d.slice(2) : d;
};

export const parseCalldata = (data: string, valueWei: bigint): CalldataKind => {
  const hex = normalizeHex(data);
  if (hex.length === 0) {
    return valueWei > 0n ? 'native_transfer' : 'empty';
  }
  if (hex.length >= 8 && hex.slice(0, 8) === APPROVE_SELECTOR) {
    return 'approve';
  }
  return 'unknown';
};

export const decodeApprove = (data: string): ApproveDecode | null => {
  const hex = normalizeHex(data);
  if (hex.length < 8 + 64 + 64) return null;
  if (hex.slice(0, 8) !== APPROVE_SELECTOR) return null;

  const spenderPadded = hex.slice(8, 8 + 64);
  const amountHex = hex.slice(8 + 64, 8 + 128);
  const spender = `0x${spenderPadded.slice(24)}`.toLowerCase();
  const amount = BigInt(`0x${amountHex}`);
  const isUnlimited = amount >= MAX_UINT256;

  return { spender, amount, isUnlimited };
};

export const parseValueWei = (value: string): bigint => {
  try {
    return BigInt(value);
  } catch {
    return 0n;
  }
};

export { MAX_UINT256 };
