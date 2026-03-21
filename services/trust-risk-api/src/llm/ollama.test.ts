import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isLlmEnabled, runOllamaAnalysis } from './ollama.js';
import type { RiskCheckRequest, RiskCheckSuccessResponse } from '../types.js';

const baseReq: RiskCheckRequest = {
  chainId: 43113,
  to: '0x1111111111111111111111111111111111111111',
  data: '0x',
  value: '0',
};

const baseRisk: RiskCheckSuccessResponse = {
  verified: false,
  reputationScore: 50,
  paidRiskScore: 47,
  paidFlags: ['UNVERIFIED_CONTRACT'],
  simulatedOutcome: 'Empty calldata with zero value',
  explanationSeed: 'Low surface transaction',
};

describe('isLlmEnabled', () => {
  const env = { ...process.env };

  afterEach(() => {
    process.env = { ...env };
  });

  it('is false by default', () => {
    delete process.env.TRUST_LLM_ENABLED;
    expect(isLlmEnabled()).toBe(false);
  });

  it('is true for true', () => {
    process.env.TRUST_LLM_ENABLED = 'true';
    expect(isLlmEnabled()).toBe(true);
  });
});

describe('runOllamaAnalysis', () => {
  const env = { ...process.env };
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    process.env = { ...env };
    process.env.TRUST_LLM_ENABLED = 'true';
    process.env.OLLAMA_BASE_URL = 'http://127.0.0.1:11434';
    process.env.OLLAMA_MODEL = 'test-model';
    process.env.TRUST_LLM_TIMEOUT_MS = '5000';
    process.env.TRUST_LLM_MAX_INPUT_CHARS = '10000';
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = { ...env };
  });

  it('returns analysis when Ollama responds 200', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: '  • Risk note  \n' } }),
    });

    const { analysis, skippedReason } = await runOllamaAnalysis(baseReq, baseRisk, 'standard');

    expect(skippedReason).toBeUndefined();
    expect(analysis).toMatchObject({
      text: '• Risk note',
      tier: 'standard',
      provider: 'ollama',
      model: 'test-model',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.model).toBe('test-model');
    expect(body.stream).toBe(false);
  });

  it('returns skippedReason on HTTP error', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'boom',
    });

    const { analysis, skippedReason } = await runOllamaAnalysis(baseReq, baseRisk, 'standard');

    expect(analysis).toBeNull();
    expect(skippedReason).toContain('500');
  });

  it('returns skippedReason when LLM disabled', async () => {
    process.env.TRUST_LLM_ENABLED = 'false';
    const { analysis, skippedReason } = await runOllamaAnalysis(baseReq, baseRisk, 'deep');
    expect(analysis).toBeNull();
    expect(skippedReason).toContain('disabled');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
