/** Convierte `chainID` de red EVM (hex `0x…` o número) a entero decimal. */
export function evmChainIdToNumber(chainID: string | number): number {
  if (typeof chainID === 'number') {
    return chainID;
  }
  const s = String(chainID).trim();
  if (/^0x[0-9a-fA-F]+$/i.test(s)) {
    return Number.parseInt(s.slice(2), 16);
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}
