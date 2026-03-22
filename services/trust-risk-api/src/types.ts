export interface RiskCheckRequest {
  chainId: number;
  to: string;
  data: string;
  value: string;
  origin?: string;
  localFlags?: string[];
  /** Opcional; ignorado por el motor B3 (dedupe / trazas en cliente). */
  clientRef?: string;
}

export interface TrustErrorEnvelope {
  error: {
    code: string;
    message: string;
    requestId: string;
    details: Record<string, unknown>;
  };
}

export interface X402AcceptOption {
  scheme: 'exact';
  network: 'avalanche-fuji';
  maxAmountRequired: string;
  /** URL absoluta del recurso (exigido por x402 / thirdweb). */
  resource: string;
  description: string;
  mimeType: string;
  payTo: string;
  asset: string;
  maxTimeoutSeconds: number;
}

/** Verdict from LLM JSON (heuristic; not a security guarantee). */
export type TrustAiVerdict = 'safe' | 'caution' | 'malicious' | 'unknown';

export type TrustContractProbeError =
  | 'no_rpc_url'
  | 'unsupported_chain'
  | 'invalid_address'
  | 'rpc_unavailable'
  | 'invalid_response'
  | 'timeout';

/** On-chain probe for `to` via `eth_getCode` (Fuji when configured). */
export interface TrustContractProbe {
  to: string;
  chainId: number;
  kind?: 'eoa' | 'contract';
  bytecodeLengthBytes?: number;
  probeError?: TrustContractProbeError;
  /** Deterministic hints derived from bytecode size (weak signals). */
  deterministicHints?: string[];
}

export type TrustExplorerLookupReason =
  | 'unsupported_chain'
  | 'not_a_contract'
  | 'invalid_address'
  | 'explorer_disabled'
  /** eth_getCode no corrió o falló (p. ej. TRUST_FUJI_RPC_URL vacío / timeout). */
  | 'contract_probe_unavailable';

export type TrustExplorerProbeError = 'api_error' | 'timeout' | 'invalid_response';

/** Explorer (Routescan / Etherscan-compatible) verified source for `to` on Fuji. */
export interface TrustExplorerSourceProbe {
  to: string;
  chainId: number;
  /** True when non-empty verified SourceCode was returned. */
  sourceVerified?: boolean;
  contractName?: string;
  compilerVersion?: string;
  /** Length of verified source fetched from API (before any LLM limit). */
  sourceLengthChars?: number;
  probeError?: TrustExplorerProbeError;
  /** Why the explorer was not queried. */
  lookupReason?: TrustExplorerLookupReason;
  /** Present when `probeError` came from HTTP. */
  httpStatus?: number;
}

export interface TrustLlmAnalysis {
  text: string;
  tier: 'standard' | 'deep';
  maxOutputTokens: number;
  truncatedInput?: boolean;
  provider: 'ollama';
  model: string;
  /** Parsed from model JSON when available. */
  verdict?: TrustAiVerdict;
  flags?: string[];
  summary?: string;
  /** Present when structured fields were parsed; static disclaimer text. */
  disclaimer?: string;
  bytecodeTruncatedForLlm?: boolean;
  /** When verified Solidity was sent to the model, true if it exceeded the configured max. */
  solidityTruncatedForLlm?: boolean;
  /** If the model returned non-JSON or invalid shape. */
  rawStructuredError?: string;
  /** 0–100 from model JSON `ai_risk_score` (higher = more risk). Used to blend top-level scores on the API for tiered depth. */
  llmRiskScore?: number;
  /** Premium/deep: longer rationale from model JSON `technical_rationale`. */
  technicalRationale?: string;
}

export interface RiskCheckSuccessResponse {
  verified: boolean;
  reputationScore: number;
  simulatedOutcome?: string;
  paidRiskScore: number;
  paidFlags: string[];
  explanationSeed: string;
  /** Resultado de `eth_getCode` / metadatos del contrato destino (sin bytecode completo). */
  contractProbe?: TrustContractProbe;
  /** Verificación de código fuente en explorador (sin enviar Solidity completo en el JSON). */
  explorerSourceProbe?: TrustExplorerSourceProbe;
  /** Presente si Ollama respondió; `null` si se omitió o falló sin abortar el 200. */
  llmAnalysis?: TrustLlmAnalysis | null;
  /** Por qué no hay análisis LLM (deshabilitado, timeout, error de red, etc.). */
  llmSkippedReason?: string;
}

