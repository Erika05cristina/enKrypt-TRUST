import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AI_ASSESSMENT_DISCLAIMER, isLlmEnabled, runOllamaAnalysis } from './ollama.js';
import type { RiskCheckRequest, RiskCheckSuccessResponse } from '../types.js';
import type { ContractProbeRun } from '../chain/getCode.js';
import type { ExplorerSourceRun } from '../chain/explorerSource.js';

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

const sampleProbe = (): ContractProbeRun => ({
  public: {
    to: '0x1111111111111111111111111111111111111111',
    chainId: 43113,
    kind: 'eoa',
    bytecodeLengthBytes: 0,
  },
});

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

  it('returns structured analysis when Ollama returns valid JSON', async () => {
    const payload = {
      verdict: 'caution',
      flags: ['unverified_interaction'],
      summary: 'Exercise caution before signing.',
      bullets: ['Verify the recipient'],
      technical_rationale: '',
      ai_risk_score: 52,
    };
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        message: { content: JSON.stringify(payload) },
      }),
    });

    const { analysis, skippedReason } = await runOllamaAnalysis(
      baseReq,
      baseRisk,
      'standard',
      { contract: sampleProbe() }
    );

    expect(skippedReason).toBeUndefined();
    expect(analysis).toMatchObject({
      verdict: 'caution',
      flags: ['unverified_interaction'],
      summary: 'Exercise caution before signing.',
      llmRiskScore: 52,
      tier: 'standard',
      provider: 'ollama',
      model: 'test-model',
      disclaimer: AI_ASSESSMENT_DISCLAIMER,
    });
    expect(analysis?.text).toContain('Verdict: caution');
    expect(analysis?.text).toContain('Verify the recipient');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.model).toBe('test-model');
    expect(body.stream).toBe(false);
    expect(body.format).toBe('json');
    expect(body.messages[0].role).toBe('system');
    const user = body.messages.find((m: { role: string }) => m.role === 'user')?.content as string;
    expect(user).toContain('STANDARD (quick scan)');
    expect(user).toContain(`paidRiskScore (${baseRisk.paidRiskScore})`);
  });

  it('returns raw text with rawStructuredError when JSON parse fails', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: 'not json at all' } }),
    });

    const { analysis } = await runOllamaAnalysis(baseReq, baseRisk, 'standard', {
      contract: sampleProbe(),
    });

    expect(analysis?.text).toBe('not json at all');
    expect(analysis?.rawStructuredError).toBe('invalid_or_non_json_output');
    expect(analysis?.disclaimer).toBe(AI_ASSESSMENT_DISCLAIMER);
  });

  it('includes bytecode in prompt for deep tier when probe has code', async () => {
    process.env.TRUST_LLM_PREFER_SOURCE_OVER_BYTECODE = 'false';
    const longCode = `0x${'ab'.repeat(3000)}`;
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () =>
        ({
          message: {
            content: JSON.stringify({
              verdict: 'unknown',
              flags: [],
              summary: 'x',
              bullets: [],
              technical_rationale: 'Bytecode present; cannot fully verify without source.',
              ai_risk_score: 61,
            }),
          },
        }) as { message: { content: string } },
    });

    const { analysis } = await runOllamaAnalysis(baseReq, baseRisk, 'deep', {
      contract: {
        public: {
          to: baseReq.to,
          chainId: 43113,
          kind: 'contract',
          bytecodeLengthBytes: 3000,
        },
        bytecodeHex: longCode,
      },
    });

    expect(analysis?.llmRiskScore).toBe(61);
    expect(analysis?.technicalRationale).toContain('Bytecode');

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    const user = body.messages.find((m: { role: string }) => m.role === 'user')?.content as string;
    expect(user).toContain('bytecodeHex');
    expect(user).toContain('0xabab');
    expect(user).toContain('DEEP (premium)');
  });

  it('includes verified Solidity and omits bytecode when prefer source (default)', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        message: {
          content: JSON.stringify({
            verdict: 'safe',
            flags: [],
            summary: 'ok',
            bullets: [],
            technical_rationale: 'Simple external function; no fund custody in snippet.',
            ai_risk_score: 22,
          }),
        },
      }),
    });

    const src = 'pragma solidity ^0.8.0;\ncontract X { function f() external {} }';
    const explorer: ExplorerSourceRun = {
      public: {
        to: baseReq.to,
        chainId: 43113,
        sourceVerified: true,
        sourceLengthChars: src.length,
        contractName: 'X',
      },
      sourceCodeForLlm: src,
    };

    await runOllamaAnalysis(baseReq, baseRisk, 'deep', {
      contract: {
        public: {
          to: baseReq.to,
          chainId: 43113,
          kind: 'contract',
          bytecodeLengthBytes: 2,
        },
        bytecodeHex: '0xffaa',
      },
      explorer,
    });

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    const user = body.messages.find((m: { role: string }) => m.role === 'user')?.content as string;
    expect(user).toContain('pragma solidity');
    expect(user).not.toContain('0xffaa');
  });

  it('returns skippedReason on HTTP error', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'boom',
    });

    const { analysis, skippedReason } = await runOllamaAnalysis(baseReq, baseRisk, 'standard', {
      contract: sampleProbe(),
    });

    expect(analysis).toBeNull();
    expect(skippedReason).toContain('500');
  });

  it('returns skippedReason when LLM disabled', async () => {
    process.env.TRUST_LLM_ENABLED = 'false';
    const { analysis, skippedReason } = await runOllamaAnalysis(baseReq, baseRisk, 'deep', {
      contract: sampleProbe(),
    });
    expect(analysis).toBeNull();
    expect(skippedReason).toContain('disabled');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
