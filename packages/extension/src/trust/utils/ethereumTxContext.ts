import type { EthereumTransaction } from '@/providers/ethereum/libs/transaction/types';
import { bufferToHex } from '@enkryptcom/utils';

/** `value` del risk API: string decimal en wei (no hex). */
export function hexWeiToDecimalString(v?: string): string {
  if (v == null || v === '' || v === '0x' || v === '0x0') return '0';
  try {
    return BigInt(v).toString(10);
  } catch {
    return '0';
  }
}

export function txDataFieldToHex(
  data: `0x${string}` | Buffer | Uint8Array | undefined,
): string {
  if (data == null) return '0x';
  if (typeof data === 'string') return data;
  return bufferToHex(data);
}

/** Campos `to` / `data` / `value` reales del request EIP-1559/legacy (no uses `tx.to` en la clase Transaction). */
export function trustFieldsFromEthereumTransaction(
  etx: EthereumTransaction,
): { to: string; data: string; value: string } {
  return {
    to: etx.to ?? '',
    data: txDataFieldToHex(etx.data as `0x${string}` | Buffer | undefined),
    value: hexWeiToDecimalString(etx.value),
  };
}
