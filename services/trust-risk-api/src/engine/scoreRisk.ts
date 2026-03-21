import type { RiskCheckRequest, RiskCheckSuccessResponse } from '../types.js';
import {
  decodeApprove,
  parseCalldata,
  parseValueWei,
  type CalldataKind,
} from './calldata.js';
import {
  getMaliciousTargets,
  getSuspiciousTargets,
  getTrustedTargets,
  isTrustedSpender,
} from './fixtures.js';

const clamp = (n: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, Math.round(n)));

const uniqSorted = (flags: string[]): string[] => [...new Set(flags)].sort();

/**
 * Motor de riesgo B3: misma entrada => misma salida (sin IO externo).
 * Usa `to`, `data`, `value`, `localFlags` y registros de fixtures.
 */
export const evaluatePaidRisk = (req: RiskCheckRequest): RiskCheckSuccessResponse => {
  const to = req.to.toLowerCase();
  const valueWei = parseValueWei(req.value);
  const kind: CalldataKind = parseCalldata(req.data, valueWei);

  const trusted = getTrustedTargets();
  const malicious = getMaliciousTargets();
  const suspicious = getSuspiciousTargets();

  const local = new Set((req.localFlags ?? []).map((f) => f.toUpperCase()));

  const paidFlags: string[] = [];

  let reputationScore = 50;
  let paidRiskScore = 45;

  if (malicious.has(to)) {
    reputationScore = 12;
    paidRiskScore = 88;
    paidFlags.push('KNOWN_MALICIOUS_TARGET');
  } else if (trusted.has(to)) {
    reputationScore = 92;
    paidRiskScore = 18;
    paidFlags.push('KNOWN_SAFE_TARGET');
  } else if (suspicious.has(to)) {
    reputationScore = 48;
    paidRiskScore = 62;
    paidFlags.push('SUSPICIOUS_TARGET');
  } else {
    paidFlags.push('UNVERIFIED_CONTRACT');
  }

  if (local.has('UNLIMITED_APPROVAL')) {
    paidFlags.push('UNLIMITED_APPROVAL');
    paidRiskScore += 22;
  }
  if (local.has('UNKNOWN_CONTRACT')) {
    paidFlags.push('UNKNOWN_CONTRACT');
    paidRiskScore += 12;
    reputationScore -= 8;
  }

  let simulatedOutcome: string | undefined;
  let explanationSeed: string;

  if (kind === 'native_transfer') {
    paidFlags.push('NATIVE_TRANSFER');
    simulatedOutcome = `Native token transfer to ${to.slice(0, 10)}…`;
    paidRiskScore += malicious.has(to) ? 25 : 5;
    explanationSeed = malicious.has(to)
      ? 'Native transfer toward a flagged destination'
      : 'Native transfer; verify recipient is intended';
  } else if (kind === 'approve') {
    const decoded = decodeApprove(req.data);
    if (decoded) {
      if (decoded.isUnlimited) {
        paidFlags.push('UNLIMITED_APPROVAL');
        paidRiskScore += 28;
      }
      if (!isTrustedSpender(decoded.spender)) {
        paidFlags.push('UNVERIFIED_SPENDER');
        paidRiskScore += 14;
        reputationScore -= 10;
      }
      simulatedOutcome = decoded.isUnlimited
        ? `Unlimited ERC20 approval to ${decoded.spender.slice(0, 10)}…`
        : `ERC20 approval with capped amount to ${decoded.spender.slice(0, 10)}…`;
      explanationSeed = decoded.isUnlimited
        ? 'Unlimited token approval increases drain risk'
        : 'Token approval; confirm spender and amount';
    } else {
      paidFlags.push('APPROVE_DECODE_FAILED');
      paidRiskScore += 10;
      simulatedOutcome = 'Approve-like calldata could not be fully decoded';
      explanationSeed = 'Incomplete approve calldata';
    }
  } else if (kind === 'unknown') {
    paidFlags.push('UNKNOWN_SELECTOR');
    paidRiskScore += 18;
    simulatedOutcome = 'Contract call with unknown or non-standard selector';
    explanationSeed = 'Unknown method; extra caution recommended';
  } else {
    simulatedOutcome = 'Empty calldata with zero value';
    explanationSeed = 'Low surface transaction';
    paidRiskScore -= 5;
  }

  paidRiskScore += Math.floor((100 - reputationScore) * 0.15);

  const verified = trusted.has(to) && !malicious.has(to) && !paidFlags.includes('UNLIMITED_APPROVAL');

  return {
    verified,
    reputationScore: clamp(reputationScore, 0, 100),
    paidRiskScore: clamp(paidRiskScore, 0, 100),
    paidFlags: uniqSorted(paidFlags),
    simulatedOutcome,
    explanationSeed,
  };
};
