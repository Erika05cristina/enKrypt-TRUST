import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bytecodeDeterministicHints, getRpcTimeoutMs, runContractProbe } from './getCode.js';
import type { RiskCheckRequest } from '../types.js';

describe('bytecodeDeterministicHints', () => {
  it('flags very large bytecode', () => {
    const hex = `0x${'00'.repeat(24_577)}`;
    expect(bytecodeDeterministicHints(hex)).toContain('very_large_bytecode');
  });

  it('flags tiny contract', () => {
    const hex = '0x60806040';
    expect(bytecodeDeterministicHints(hex)).toContain('tiny_contract_unusual');
  });
});

describe('runContractProbe', () => {
  const env = { ...process.env };
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    process.env = { ...env };
    process.env.TRUST_FUJI_RPC_URL = 'https://rpc.ankr.com/avalanche_fuji';
    process.env.TRUST_RPC_TIMEOUT_MS = '5000';
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = { ...env };
  });

  const req = (over: Partial<RiskCheckRequest> = {}): RiskCheckRequest => ({
    chainId: 43113,
    to: '0x1111111111111111111111111111111111111111',
    data: '0x',
    value: '0',
    ...over,
  });

  it('returns no_rpc_url when env missing', async () => {
    delete process.env.TRUST_FUJI_RPC_URL;
    const r = await runContractProbe(req());
    expect(r.public.probeError).toBe('no_rpc_url');
    expect(r.bytecodeHex).toBeUndefined();
  });

  it('returns unsupported_chain when chainId is not Fuji', async () => {
    const r = await runContractProbe(req({ chainId: 1 }));
    expect(r.public.probeError).toBe('unsupported_chain');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns invalid_address for bad to', async () => {
    const r = await runContractProbe(req({ to: '0xbad' }));
    expect(r.public.probeError).toBe('invalid_address');
  });

  it('returns eoa when eth_getCode is 0x', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ jsonrpc: '2.0', id: 1, result: '0x' }),
    });
    const r = await runContractProbe(req());
    expect(r.public.kind).toBe('eoa');
    expect(r.public.bytecodeLengthBytes).toBe(0);
    expect(r.bytecodeHex).toBeUndefined();
  });

  it('returns contract with bytecode when code present', async () => {
    const code = '0x6080604052';
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ jsonrpc: '2.0', id: 1, result: code }),
    });
    const r = await runContractProbe(req());
    expect(r.public.kind).toBe('contract');
    expect(r.public.bytecodeLengthBytes).toBe(5);
    expect(r.bytecodeHex).toBe(code);
  });

  it('returns rpc_unavailable on HTTP error', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503 });
    const r = await runContractProbe(req());
    expect(r.public.probeError).toBe('rpc_unavailable');
  });

  it('returns invalid_response when result is not hex string', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ jsonrpc: '2.0', id: 1, result: null }),
    });
    const r = await runContractProbe(req());
    expect(r.public.probeError).toBe('invalid_response');
  });

  it('returns timeout on abort', async () => {
    process.env.TRUST_RPC_TIMEOUT_MS = '20';
    fetchMock.mockImplementation((_url, init) => {
      return new Promise((_resolve, reject) => {
        const signal = (init as RequestInit).signal;
        if (!signal) {
          reject(new Error('no signal'));
          return;
        }
        const onAbort = (): void => {
          signal.removeEventListener('abort', onAbort);
          reject(new DOMException('The user aborted a request.', 'AbortError'));
        };
        signal.addEventListener('abort', onAbort);
      });
    });
    const r = await runContractProbe(req());
    expect(r.public.probeError).toBe('timeout');
  });
});

describe('getRpcTimeoutMs', () => {
  const env = { ...process.env };
  afterEach(() => {
    process.env = { ...env };
  });

  it('defaults to 5000', () => {
    delete process.env.TRUST_RPC_TIMEOUT_MS;
    expect(getRpcTimeoutMs()).toBe(5000);
  });
});
