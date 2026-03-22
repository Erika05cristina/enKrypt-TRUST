import type { ContractProbeRun } from '../chain/getCode.js';
import type { ExplorerSourceRun } from '../chain/explorerSource.js';
import type {
  RiskCheckRequest,
  RiskCheckSuccessResponse,
  TrustAiVerdict,
  TrustLlmAnalysis,
} from '../types.js';

export type LlmTier = 'standard' | 'deep';

export const AI_ASSESSMENT_DISCLAIMER =
  'This AI assessment is heuristic only; it is not a security guarantee nor a substitute for professional audit.';

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

/** Default very high so calldata is rarely truncated (override via env). */
const getMaxInputChars = (): number => parsePositiveInt(process.env.TRUST_LLM_MAX_INPUT_CHARS, 1_000_000);

const getTimeoutMs = (): number => parsePositiveInt(process.env.TRUST_LLM_TIMEOUT_MS, 45_000);

const getOllamaBaseUrl = (): string => {
  const u = process.env.OLLAMA_BASE_URL?.trim();
  return u && u.length > 0 ? u.replace(/\/$/, '') : 'http://127.0.0.1:11434';
};

const getOllamaModel = (): string => {
  const m = process.env.OLLAMA_MODEL?.trim();
  return m && m.length > 0 ? m : 'llama3.2';
};

const includeBytecodeForStandardTier = (): boolean => {
  const v = process.env.TRUST_LLM_INCLUDE_BYTECODE_STANDARD?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
};

/** When verified Solidity is present, omit bytecode from the prompt unless disabled. */
const preferSourceOverBytecode = (): boolean => {
  const v = process.env.TRUST_LLM_PREFER_SOURCE_OVER_BYTECODE?.trim().toLowerCase();
  return v !== '0' && v !== 'false' && v !== 'no';
};

const getMaxBytecodeHexChars = (tier: LlmTier): number => {
  if (tier === 'deep') {
    return parsePositiveInt(process.env.TRUST_LLM_BYTECODE_MAX_CHARS_DEEP, 2_000_000);
  }
  return parsePositiveInt(process.env.TRUST_LLM_BYTECODE_MAX_CHARS_STANDARD, 1_000_000);
};

/** Max Solidity chars sent to the model (default 1M; increase if your Ollama context allows). */
const getMaxSolidityChars = (): number =>
  parsePositiveInt(process.env.TRUST_LLM_SOLIDITY_MAX_CHARS, 1_000_000);

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

const VERDICTS = new Set<string>(['safe', 'caution', 'malicious', 'unknown']);

const normalizeVerdict = (v: unknown): TrustAiVerdict | undefined => {
  if (typeof v !== 'string') return undefined;
  const x = v.trim().toLowerCase();
  return VERDICTS.has(x) ? (x as TrustAiVerdict) : undefined;
};

const normalizeFlags = (v: unknown): string[] => {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    .map((s) => s.trim().slice(0, 120));
};

const normalizeBullets = (v: unknown): string[] => {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    .map((s) => s.trim().slice(0, 500));
};

type ParsedLlmJson = {
  verdict?: TrustAiVerdict;
  flags: string[];
  summary?: string;
  bullets: string[];
};

const tryParseStructured = (raw: string): { ok: true; data: ParsedLlmJson } | { ok: false } => {
  const trimmed = raw.trim();
  try {
    const o = JSON.parse(trimmed) as Record<string, unknown>;
    const verdict = normalizeVerdict(o.verdict) ?? 'unknown';
    const flags = normalizeFlags(o.flags);
    const summary = typeof o.summary === 'string' ? o.summary.trim().slice(0, 2000) : undefined;
    const bullets = normalizeBullets(o.bullets);
    return { ok: true, data: { verdict, flags, summary, bullets } };
  } catch {
    return { ok: false };
  }
};

const buildContractSection = (
  probe: ContractProbeRun['public'],
  bytecodeSnippet: string | undefined,
  bytecodeTruncated: boolean
): string => {
  const lines: string[] = [
    'Contract probe (eth_getCode metadata):',
    `  to: ${probe.to}`,
    `  chainId: ${probe.chainId}`,
  ];
  if (probe.probeError) {
    lines.push(`  probeError: ${probe.probeError}`);
  } else {
    lines.push(`  kind: ${probe.kind ?? 'unknown'}`, `  bytecodeLengthBytes: ${probe.bytecodeLengthBytes ?? 0}`);
    if (probe.deterministicHints?.length) {
      lines.push(`  deterministicHints: ${probe.deterministicHints.join(', ')}`);
    }
  }
  if (bytecodeSnippet) {
    lines.push(
      `  bytecodeHex (only if Solidity source was not used; may be truncated by server limit): ${bytecodeSnippet}`
    );
    if (bytecodeTruncated) lines.push('  (bytecode truncated — raise TRUST_LLM_BYTECODE_MAX_CHARS_* if needed)');
  }
  return lines.join('\n');
};

const buildExplorerSection = (
  explorer: ExplorerSourceRun | undefined,
  soliditySnippet: string | undefined,
  solidityTruncated: boolean
): string => {
  const lines: string[] = ['Explorer verified source (Routescan / Etherscan-compatible API):'];
  if (!explorer) {
    lines.push('  (explorer context not attached)');
    return lines.join('\n');
  }
  const p = explorer.public;
  if (p.lookupReason) {
    lines.push(`  lookupSkipped: ${p.lookupReason}`);
    return lines.join('\n');
  }
  if (p.probeError) {
    lines.push(`  probeError: ${p.probeError}`);
    return lines.join('\n');
  }
  lines.push(`  sourceVerifiedOnExplorer: ${p.sourceVerified ? 'yes' : 'no'}`);
  if (p.contractName) lines.push(`  contractName: ${p.contractName}`);
  if (p.compilerVersion) lines.push(`  compilerVersion: ${p.compilerVersion}`);
  if (p.sourceLengthChars != null) lines.push(`  sourceLengthCharsFromApi: ${p.sourceLengthChars}`);

  if (p.sourceVerified && soliditySnippet) {
    lines.push('', '--- Verified Solidity (full text from explorer unless truncated by server env) ---', soliditySnippet);
    if (solidityTruncated) {
      lines.push(
        '',
        '[Solidity truncated — increase TRUST_LLM_SOLIDITY_MAX_CHARS or use a larger context model]'
      );
    }
  } else if (!p.sourceVerified) {
    lines.push(
      '',
      'IMPORTANT: No verified Solidity on the explorer for this address. Treat as suspicious; prefer verdict "caution" or "malicious" unless the deterministic engine shows an obviously benign empty call with zero value.'
    );
  }
  return lines.join('\n');
};

const buildUserPrompt = (
  req: RiskCheckRequest,
  risk: RiskCheckSuccessResponse,
  dataSnippet: string,
  dataTruncated: boolean,
  contractSection: string,
  explorerSection: string
): string => {
  const originLine = req.origin ? `origin: ${req.origin}\n` : '';
  const flagsLine =
    req.localFlags && req.localFlags.length > 0
      ? `localFlags: ${req.localFlags.join(', ')}\n`
      : '';
  return `You are a security assistant for EVM transaction previews. Do not claim you executed anything on-chain.

Transaction context:
chainId: ${req.chainId}
to: ${req.to}
value (wei string): ${req.value}
data (hex; full length unless server env TRUST_LLM_MAX_INPUT_CHARS is exceeded): ${dataSnippet}
${dataTruncated ? '(calldata was truncated — raise TRUST_LLM_MAX_INPUT_CHARS if you need more)\n' : ''}${originLine}${flagsLine}
${contractSection}

${explorerSection}

Deterministic risk engine output (JSON; includes explorer-based flags such as EXPLORER_SOURCE_VERIFIED / EXPLORER_SOURCE_NOT_VERIFIED):
${JSON.stringify(risk)}

Task: Return ONLY a single JSON object (no markdown fences) with exactly these keys:
- "verdict": one of "safe", "caution", "malicious", "unknown"
- "flags": array of short snake_case strings (risk signals you infer; may be empty)
- "summary": one clear sentence for a wallet user
- "bullets": array of 0–6 short user-facing bullet strings

Rules:
- If verified Solidity is present above, reason about concrete code patterns (access control, external calls, fund flows) but stay humble; you are not a formal verifier.
- If there is NO verified Solidity on the explorer, do not pretend you read source; align with EXPLORER_SOURCE_NOT_VERIFIED and bias toward caution.
- Bytecode (if present without full source) is machine code; prefer "unknown" or "caution" when unsure.
- Align with the deterministic engine paidFlags; do not contradict obvious high-risk patterns without flagging caution.
- Respond in English unless the transaction context is clearly Spanish (e.g. origin or localFlags).`;
};

const buildDisplayText = (data: ParsedLlmJson): string => {
  const lines: string[] = [];
  if (data.summary) lines.push(data.summary);
  for (const b of data.bullets) lines.push(`• ${b}`);
  lines.push(`Verdict: ${data.verdict}`);
  if (data.flags.length) lines.push(`Flags: ${data.flags.join(', ')}`);
  return lines.join('\n').trim();
};

type OllamaChatResponse = {
  message?: { content?: string };
  error?: string;
};

export type RunOllamaOptions = {
  contract?: ContractProbeRun;
  explorer?: ExplorerSourceRun;
};

/**
 * Llama a Ollama `/api/chat` (no streaming). No lanza: devuelve skip reason en fallo.
 */
export const runOllamaAnalysis = async (
  req: RiskCheckRequest,
  riskBody: RiskCheckSuccessResponse,
  tier: LlmTier,
  options: RunOllamaOptions = {}
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

  const contract = options.contract;
  const explorer = options.explorer;

  const hasFullSolidity = Boolean(
    explorer?.sourceCodeForLlm && explorer.sourceCodeForLlm.length > 0
  );
  const maxSol = getMaxSolidityChars();
  const solT = hasFullSolidity
    ? truncateForPrompt(explorer!.sourceCodeForLlm!, maxSol)
    : { snippet: '', truncated: false };
  const soliditySnippet = hasFullSolidity ? solT.snippet : undefined;
  const solidityTruncated = solT.truncated;

  let bytecodeSnippet: string | undefined;
  let bytecodeTruncated = false;
  const wantBytecode =
    Boolean(contract?.bytecodeHex) &&
    (tier === 'deep' || includeBytecodeForStandardTier()) &&
    !(preferSourceOverBytecode() && hasFullSolidity);

  if (wantBytecode && contract?.bytecodeHex) {
    const maxHex = getMaxBytecodeHexChars(tier);
    const t = truncateForPrompt(contract.bytecodeHex, maxHex);
    bytecodeSnippet = t.snippet;
    bytecodeTruncated = t.truncated;
  }

  const contractSection = contract
    ? buildContractSection(contract.public, bytecodeSnippet, bytecodeTruncated)
    : [
        'Contract probe (eth_getCode metadata):',
        '  (probe context not attached — treat contract metadata as unknown)',
        `  to: ${req.to}`,
        `  chainId: ${req.chainId}`,
      ].join('\n');

  const explorerSection = buildExplorerSection(explorer, soliditySnippet, solidityTruncated);

  const userContent = buildUserPrompt(
    req,
    riskBody,
    snippet,
    truncated,
    contractSection,
    explorerSection
  );

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
        format: 'json',
        messages: [
          {
            role: 'system',
            content:
              'You output only valid JSON objects. No markdown, no code fences, no prose outside JSON.',
          },
          { role: 'user', content: userContent },
        ],
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

    const textRaw = json.message?.content?.trim();
    if (!textRaw) {
      return { analysis: null, skippedReason: 'Ollama returned empty message content' };
    }

    const parsed = tryParseStructured(textRaw);
    if (!parsed.ok) {
      const analysis: TrustLlmAnalysis = {
        text: textRaw,
        tier,
        maxOutputTokens: maxOut,
        truncatedInput: truncated || undefined,
        provider: 'ollama',
        model,
        bytecodeTruncatedForLlm: bytecodeTruncated || undefined,
        solidityTruncatedForLlm: solidityTruncated || undefined,
        rawStructuredError: 'invalid_or_non_json_output',
        disclaimer: AI_ASSESSMENT_DISCLAIMER,
      };
      return { analysis };
    }

    const { data } = parsed;
    const analysis: TrustLlmAnalysis = {
      text: buildDisplayText(data),
      tier,
      maxOutputTokens: maxOut,
      truncatedInput: truncated || undefined,
      provider: 'ollama',
      model,
      verdict: data.verdict,
      flags: data.flags.length ? data.flags : undefined,
      summary: data.summary,
      disclaimer: AI_ASSESSMENT_DISCLAIMER,
      bytecodeTruncatedForLlm: bytecodeTruncated || undefined,
      solidityTruncatedForLlm: solidityTruncated || undefined,
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
