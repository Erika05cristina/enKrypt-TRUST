import { describe, expect, it } from 'vitest';
import { mergePaidEvidenceIntoFinalRiskScore } from './orchestrator';
import type { TrustPaidRiskEvidence } from '../types';

const basePaid = (over: Partial<TrustPaidRiskEvidence>): TrustPaidRiskEvidence => ({
  verified: false,
  reputationScore: 50,
  paidRiskScore: 50,
  paidFlags: [],
  explanationSeed: '',
  ...over,
});

describe('mergePaidEvidenceIntoFinalRiskScore', () => {
  it('prioriza paidRiskScore sobre el score local (no solo reputación)', () => {
    const malicious = mergePaidEvidenceIntoFinalRiskScore(
      20,
      basePaid({
        paidRiskScore: 88,
        paidFlags: ['UNVERIFIED_CONTRACT'],
      }),
    );
    const safeish = mergePaidEvidenceIntoFinalRiskScore(
      20,
      basePaid({
        paidRiskScore: 22,
        paidFlags: ['EXPLORER_SOURCE_VERIFIED', 'SOLIDITY_REENTRANCY_MITIGATION'],
      }),
    );
    expect(malicious).toBeGreaterThan(safeish);
  });

  it('suelo alto si hay patrones Solidity peligrosos aunque paidRiskScore sea moderado', () => {
    const s = mergePaidEvidenceIntoFinalRiskScore(
      20,
      basePaid({
        paidRiskScore: 48,
        paidFlags: [
          'EXPLORER_SOURCE_VERIFIED',
          'SOLIDITY_TX_ORIGIN_RISK',
          'SOLIDITY_UNGUARDED_ETH_CALL',
        ],
      }),
    );
    expect(s).toBeGreaterThanOrEqual(78);
  });

  it('verdict malicious del LLM sube el score mostrado', () => {
    const without = mergePaidEvidenceIntoFinalRiskScore(
      10,
      basePaid({ paidRiskScore: 30, paidFlags: [] }),
    );
    const withMal = mergePaidEvidenceIntoFinalRiskScore(
      10,
      basePaid({
        paidRiskScore: 30,
        paidFlags: [],
        llmAnalysis: {
          text: '',
          tier: 'standard',
          maxOutputTokens: 256,
          provider: 'ollama',
          model: 'x',
          verdict: 'malicious',
        },
      }),
    );
    expect(withMal).toBeGreaterThanOrEqual(80);
    expect(withMal).toBeGreaterThan(without);
  });
});
