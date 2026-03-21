import type { RiskCheckRequest, RiskCheckSuccessResponse, TrustLlmAnalysis } from '../types.js';

export type LlmTier = 'standard' | 'deep';

const parsePositiveInt = (raw: string | undefined, fallback: number): number => {
  if (!raw?.trim()) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export const isLlmEnabled = (): boolean => {
  const v = process.env.TRUST_LLM_ENABLED?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
};

const getMaxOutputTokens = (tier: LlmTier): number => {
  if (tier === 'deep') {
    return parsePositiveInt(process.env.TRUST_LLM_MAX_OUTPUT_TOKENS_DEEP, 1024);
  }
  return parsePositiveInt(process.env.TRUST_LLM_MAX_OUTPUT_TOKENS_STANDARD, 256);
};

const getMaxInputChars = (): number => parsePositiveInt(process.env.TRUST_LLM_MAX_INPUT_CHARS, 8000);

const getTimeoutMs = (): number => parsePositiveInt(process.env.TRUST_LLM_TIMEOUT_MS, 45_000);

const getOllamaBaseUrl = (): string => {
  const u = process.env.OLLAMA_BASE_URL?.trim();
  return u && u.length > 0 ? u.replace(/\/$/, '') : 'http://127.0.0.1:11434';
};

const getOllamaModel = (): string => {
  const m = process.env.OLLAMA_MODEL?.trim();
  return m && m.length > 0 ? m : 'llama3.2';
};

const truncateForPrompt = (
  data: string,
  maxChars: number
): { snippet: string; truncated: boolean } => {
  if (data.length <= maxChars) {
    return { snippet: data, truncated: false };
  }
  return {
    snippet: `${data.slice(0, maxChars)}…[truncated]`,
    truncated: true,
  };
};

const buildUserPrompt = (
  req: RiskCheckRequest,
  risk: RiskCheckSuccessResponse,
  dataSnippet: string,
  dataTruncated: boolean
): string => {
  const originLine = req.origin ? `origin: ${req.origin}\n` : '';
  const flagsLine =
    req.localFlags && req.localFlags.length > 0
      ? `localFlags: ${req.localFlags.join(', ')}\n`
      : '';
  return `You are a security assistant for EVM transaction previews. Respond in clear, concise English (or Spanish if the user context is Spanish). Do not claim you executed anything on-chain.

Transaction context:
chainId: ${req.chainId}
to: ${req.to}
value (wei string): ${req.value}
data (hex, may be truncated): ${dataSnippet}
${dataTruncated ? '(calldata was truncated for safety)\n' : ''}${originLine}${flagsLine}
Deterministic risk engine output (JSON):
${JSON.stringify(risk)}

Task: Summarize risks and safe-user recommendations in 2–6 short bullet points. If data is empty or unknown, say what is unknown and what the user should verify before signing.`;
};

type OllamaChatResponse = {
  message?: { content?: string };
  error?: string;
};

/**
 * Llama a Ollama `/api/chat` (no streaming). No lanza: devuelve skip reason en fallo.
 */
export const runOllamaAnalysis = async (
  req: RiskCheckRequest,
  riskBody: RiskCheckSuccessResponse,
  tier: LlmTier
): Promise<{ analysis: TrustLlmAnalysis | null; skippedReason?: string }> => {
  if (!isLlmEnabled()) {
    return { analysis: null, skippedReason: 'LLM disabled (set TRUST_LLM_ENABLED=true)' };
  }

  const maxOut = getMaxOutputTokens(tier);
  const maxIn = getMaxInputChars();
  const { snippet, truncated } = truncateForPrompt(req.data, maxIn);
  const model = getOllamaModel();
  const base = getOllamaBaseUrl();
  const url = `${base}/api/chat`;

  const userContent = buildUserPrompt(req, riskBody, snippet, truncated);

  const timeoutMs = getTimeoutMs();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        stream: false,
        messages: [{ role: 'user', content: userContent }],
        options: {
          num_predict: maxOut,
        },
      }),
    });

    if (!res.ok) {
      const t = await res.text().catch(() => '');
      return {
        analysis: null,
        skippedReason: `Ollama HTTP ${res.status}: ${t.slice(0, 200)}`,
      };
    }

    const json = (await res.json()) as OllamaChatResponse;
    if (json.error) {
      return { analysis: null, skippedReason: `Ollama error: ${json.error}` };
    }

    const text = json.message?.content?.trim();
    if (!text) {
      return { analysis: null, skippedReason: 'Ollama returned empty message content' };
    }

    const analysis: TrustLlmAnalysis = {
      text,
      tier,
      maxOutputTokens: maxOut,
      truncatedInput: truncated || undefined,
      provider: 'ollama',
      model,
    };
    return { analysis };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('abort')) {
      return { analysis: null, skippedReason: `Ollama timeout after ${timeoutMs}ms` };
    }
    return { analysis: null, skippedReason: `Ollama request failed: ${msg.slice(0, 200)}` };
  } finally {
    clearTimeout(timeout);
  }
};
