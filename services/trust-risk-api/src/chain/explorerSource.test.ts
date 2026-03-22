import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getExplorerTimeoutMs, runExplorerSourceLookup } from './explorerSource.js';
import type { RiskCheckRequest, TrustContractProbe } from '../types.js';

describe('runExplorerSourceLookup', () => {
  const env = { ...process.env };
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    process.env = { ...env };
    delete process.env.TRUST_EXPLORER_DISABLED;
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = { ...env };
  });

  const req = (over: Partial<RiskCheckRequest> = {}): RiskCheckRequest => ({
    chainId: 43113,
    to: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    data: '0x',
    value: '0',
    ...over,
  });

  const contractProbe = (kind: 'eoa' | 'contract'): TrustContractProbe => ({
    to: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    chainId: 43113,
    kind,
    bytecodeLengthBytes: kind === 'contract' ? 100 : 0,
  });

  it('skips with not_a_contract when probe is eoa', async () => {
    const r = await runExplorerSourceLookup(req(), contractProbe('eoa'));
    expect(r.public.lookupReason).toBe('not_a_contract');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('skips when explorer disabled', async () => {
    process.env.TRUST_EXPLORER_DISABLED = 'true';
    const r = await runExplorerSourceLookup(req(), contractProbe('contract'));
    expect(r.public.lookupReason).toBe('explorer_disabled');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns unverified when SourceCode empty', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: '1',
        result: [
          {
            SourceCode: '',
            ABI: 'Contract source code not verified',
            ContractName: '',
          },
        ],
      }),
    });
    const r = await runExplorerSourceLookup(req(), contractProbe('contract'));
    expect(r.public.sourceVerified).toBe(false);
    expect(r.sourceCodeForLlm).toBeUndefined();
    expect(fetchMock).toHaveBeenCalled();
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/getsourcecode/);
    expect(String(url)).toContain('43113');
  });

  it('returns verified source when SourceCode present', async () => {
    const src = 'pragma solidity ^0.8.0;\ncontract C {}';
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: '1',
        result: [{ SourceCode: src, ContractName: 'C', CompilerVersion: '0.8.0' }],
      }),
    });
    const r = await runExplorerSourceLookup(req(), contractProbe('contract'));
    expect(r.public.sourceVerified).toBe(true);
    expect(r.public.contractName).toBe('C');
    expect(r.sourceCodeForLlm).toBe(src);
  });

  it('returns api_error on HTTP failure', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503 });
    const r = await runExplorerSourceLookup(req(), contractProbe('contract'));
    expect(r.public.probeError).toBe('api_error');
    expect(r.public.httpStatus).toBe(503);
  });
});

describe('getExplorerTimeoutMs', () => {
  const env = { ...process.env };
  afterEach(() => {
    process.env = { ...env };
  });

  it('defaults to 12000', () => {
    delete process.env.TRUST_EXPLORER_TIMEOUT_MS;
    expect(getExplorerTimeoutMs()).toBe(12_000);
  });
});
