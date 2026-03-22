import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ExplorerSourceRun } from '../chain/explorerSource.js';
import type { RiskCheckRequest, TrustContractProbe } from '../types.js';
import { evaluatePaidRisk, mergeExplorerIntoPaidRisk } from './scoreRisk.js';

const clearFixtureEnv = (): void => {
  delete process.env.TRUST_FIXTURE_TRUSTED_CONTRACTS;
  delete process.env.TRUST_FIXTURE_MALICIOUS_CONTRACTS;
  delete process.env.TRUST_FIXTURE_SUSPICIOUS_CONTRACTS;
};

const baseReq = (over: Partial<RiskCheckRequest> = {}): RiskCheckRequest => ({
  chainId: 43113,
  to: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  data: '0x',
  value: '0',
  ...over,
});

describe('evaluatePaidRisk', () => {
  beforeEach(() => {
    clearFixtureEnv();
  });

  afterEach(() => {
    clearFixtureEnv();
  });

  it('unknown to + empty calldata => UNVERIFIED_CONTRACT y scores acotados', () => {
    const r = evaluatePaidRisk(baseReq());
    expect(r.paidFlags).toContain('UNVERIFIED_CONTRACT');
    expect(r.paidFlags).not.toContain('KNOWN_SAFE_TARGET');
    expect(r.verified).toBe(false);
    expect(r.reputationScore).toBeGreaterThanOrEqual(0);
    expect(r.reputationScore).toBeLessThanOrEqual(100);
    expect(r.paidRiskScore).toBeGreaterThanOrEqual(0);
    expect(r.paidRiskScore).toBeLessThanOrEqual(100);
    expect(r.explanationSeed).toBeTruthy();
  });

  it('TRUST_FIXTURE_TRUSTED_CONTRACTS => KNOWN_SAFE_TARGET y verified sin unlimited', () => {
    const trusted = '0x1111111111111111111111111111111111111111';
    process.env.TRUST_FIXTURE_TRUSTED_CONTRACTS = trusted;
    const r = evaluatePaidRisk(baseReq({ to: trusted }));
    expect(r.paidFlags).toContain('KNOWN_SAFE_TARGET');
    expect(r.verified).toBe(true);
    expect(r.reputationScore).toBeGreaterThan(80);
  });

  it('TRUST_FIXTURE_MALICIOUS_CONTRACTS => KNOWN_MALICIOUS_TARGET', () => {
    const bad = '0x2222222222222222222222222222222222222222';
    process.env.TRUST_FIXTURE_MALICIOUS_CONTRACTS = bad;
    const r = evaluatePaidRisk(baseReq({ to: bad }));
    expect(r.paidFlags).toContain('KNOWN_MALICIOUS_TARGET');
    expect(r.verified).toBe(false);
    expect(r.paidRiskScore).toBeGreaterThan(70);
  });

  it('TRUST_FIXTURE_SUSPICIOUS_CONTRACTS => SUSPICIOUS_TARGET', () => {
    const weird = '0x3333333333333333333333333333333333333333';
    process.env.TRUST_FIXTURE_SUSPICIOUS_CONTRACTS = weird;
    const r = evaluatePaidRisk(baseReq({ to: weird }));
    expect(r.paidFlags).toContain('SUSPICIOUS_TARGET');
    expect(r.verified).toBe(false);
  });

  it('native transfer hacia malicious sube riesgo', () => {
    const bad = '0x2222222222222222222222222222222222222222';
    process.env.TRUST_FIXTURE_MALICIOUS_CONTRACTS = bad;
    const r = evaluatePaidRisk(
      baseReq({
        to: bad,
        data: '0x',
        value: '1',
      })
    );
    expect(r.paidFlags).toContain('NATIVE_TRANSFER');
    expect(r.paidFlags).toContain('KNOWN_MALICIOUS_TARGET');
  });

  it('approve ilimitado a spender no trusted => UNLIMITED_APPROVAL + UNVERIFIED_SPENDER', () => {
    const data =
      '0x095ea7b30000000000000000000000002222222222222222222222222222222222222222ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const r = evaluatePaidRisk(baseReq({ data }));
    expect(r.paidFlags).toContain('UNLIMITED_APPROVAL');
    expect(r.paidFlags).toContain('UNVERIFIED_SPENDER');
    expect(r.verified).toBe(false);
    expect(r.simulatedOutcome).toMatch(/Unlimited ERC20 approval/i);
  });

  it('spender en trusted list => no UNVERIFIED_SPENDER', () => {
    const trustedSpender = '0x4444444444444444444444444444444444444444';
    process.env.TRUST_FIXTURE_TRUSTED_CONTRACTS = trustedSpender;
    const data =
      '0x095ea7b300000000000000000000000044444444444444444444444444444444444444440000000000000000000000000000000000000000000000000000000000000001';
    const r = evaluatePaidRisk(baseReq({ data }));
    expect(r.paidFlags).not.toContain('UNVERIFIED_SPENDER');
  });

  it('localFlags UNLIMITED_APPROVAL y UNKNOWN_CONTRACT', () => {
    const r = evaluatePaidRisk(
      baseReq({
        localFlags: ['UNLIMITED_APPROVAL', 'UNKNOWN_CONTRACT'],
      })
    );
    expect(r.paidFlags).toContain('UNLIMITED_APPROVAL');
    expect(r.paidFlags).toContain('UNKNOWN_CONTRACT');
  });

  it('selector desconocido => UNKNOWN_SELECTOR', () => {
    const r = evaluatePaidRisk(baseReq({ data: '0xcafebabe' }));
    expect(r.paidFlags).toContain('UNKNOWN_SELECTOR');
  });

  it('paidFlags orden estable (determinismo)', () => {
    const data =
      '0x095ea7b30000000000000000000000002222222222222222222222222222222222222222ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const a = evaluatePaidRisk(baseReq({ data })).paidFlags.join(',');
    const b = evaluatePaidRisk(baseReq({ data })).paidFlags.join(',');
    expect(a).toBe(b);
  });
});

describe('mergeExplorerIntoPaidRisk', () => {
  beforeEach(() => {
    clearFixtureEnv();
  });
  afterEach(() => {
    clearFixtureEnv();
  });

  const probeContract = (to: string): TrustContractProbe => ({
    to,
    chainId: 43113,
    kind: 'contract',
    bytecodeLengthBytes: 10,
  });

  const makeBaseRisk = () =>
    evaluatePaidRisk(baseReq({ to: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' }));

  it('adds EXPLORER_SOURCE_NOT_VERIFIED when explorer has no source', () => {
    const baseRisk = makeBaseRisk();
    const explorer: ExplorerSourceRun = {
      public: {
        to: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        chainId: 43113,
        sourceVerified: false,
        sourceLengthChars: 0,
      },
    };
    const m = mergeExplorerIntoPaidRisk(baseRisk, probeContract(explorer.public.to), explorer);
    expect(m.paidFlags).toContain('EXPLORER_SOURCE_NOT_VERIFIED');
    expect(m.paidRiskScore).toBeGreaterThanOrEqual(baseRisk.paidRiskScore);
  });

  it('adds EXPLORER_SOURCE_VERIFIED and drops UNVERIFIED_CONTRACT when verified', () => {
    const baseRisk = makeBaseRisk();
    const explorer: ExplorerSourceRun = {
      public: {
        to: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        chainId: 43113,
        sourceVerified: true,
        sourceLengthChars: 42,
        contractName: 'Demo',
      },
    };
    const m = mergeExplorerIntoPaidRisk(baseRisk, probeContract(explorer.public.to), explorer);
    expect(m.paidFlags).toContain('EXPLORER_SOURCE_VERIFIED');
    expect(m.paidFlags).not.toContain('UNVERIFIED_CONTRACT');
  });

  it('no-op when lookupReason is set', () => {
    const baseRisk = makeBaseRisk();
    const explorer: ExplorerSourceRun = {
      public: {
        to: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        chainId: 43113,
        lookupReason: 'not_a_contract',
      },
    };
    const m = mergeExplorerIntoPaidRisk(baseRisk, probeContract(explorer.public.to), explorer);
    expect(m).toEqual(baseRisk);
  });
});
