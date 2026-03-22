/**
 * Heurísticas deterministas sobre Solidity verificado (sin parser AST).
 * Complementa B3/explorador cuando el LLM está apagado o no distingue bien.
 */

export type SolidityStaticScanResult = {
  flags: string[];
  paidRiskDelta: number;
  reputationDelta: number;
  notes: string[];
};

const uniqSorted = (flags: string[]): string[] => [...new Set(flags)].sort();

/** ETH enviado vía .call{value: ...} (bajo nivel). */
const hasLowLevelEthCall = (s: string): boolean =>
  /\.call\s*\{[^}]*\bvalue\s*:/.test(s) || /\.call\{value/.test(s);

export const scanVerifiedSolidity = (source: string): SolidityStaticScanResult => {
  const s = source;
  const flags: string[] = [];
  let paidRiskDelta = 0;
  let reputationDelta = 0;
  const notes: string[] = [];

  const hasTxOrigin = /\btx\.origin\b/.test(s);
  const hasReentrancyGuard = /\bReentrancyGuard\b/.test(s);
  const hasNonReentrant = /\bnonReentrant\b/.test(s);
  const hasReentrancyMitigation = hasReentrancyGuard || hasNonReentrant;
  const hasEthCall = hasLowLevelEthCall(s);
  const hasOzSecurity =
    /@openzeppelin\/contracts/.test(s) || /openzeppelin\/contracts\/security\//.test(s);

  if (hasTxOrigin) {
    flags.push('SOLIDITY_TX_ORIGIN_RISK');
    paidRiskDelta += 18;
    reputationDelta -= 12;
    notes.push('Solidity: tx.origin used (access control / phishing risk).');
  }

  if (hasEthCall && !hasReentrancyMitigation) {
    flags.push('SOLIDITY_UNGUARDED_ETH_CALL');
    paidRiskDelta += 15;
    reputationDelta -= 8;
    notes.push('Solidity: low-level ETH call without ReentrancyGuard/nonReentrant.');
  }

  if (hasReentrancyMitigation) {
    flags.push('SOLIDITY_REENTRANCY_MITIGATION');
    paidRiskDelta -= 8;
    reputationDelta += 6;
    notes.push('Solidity: reentrancy guard / nonReentrant present.');
  }

  if (hasOzSecurity) {
    flags.push('SOLIDITY_OPENZEPPELIN_SECURITY');
    paidRiskDelta -= 4;
    reputationDelta += 3;
    notes.push('Solidity: OpenZeppelin security contracts referenced.');
  }

  return {
    flags: uniqSorted(flags),
    paidRiskDelta,
    reputationDelta,
    notes,
  };
};
