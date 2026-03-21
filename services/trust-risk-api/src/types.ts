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

export interface TrustLlmAnalysis {
  text: string;
  tier: 'standard' | 'deep';
  maxOutputTokens: number;
  truncatedInput?: boolean;
  provider: 'ollama';
  model: string;
}

export interface RiskCheckSuccessResponse {
  verified: boolean;
  reputationScore: number;
  simulatedOutcome?: string;
  paidRiskScore: number;
  paidFlags: string[];
  explanationSeed: string;
  /** Presente si Ollama respondió; `null` si se omitió o falló sin abortar el 200. */
  llmAnalysis?: TrustLlmAnalysis | null;
  /** Por qué no hay análisis LLM (deshabilitado, timeout, error de red, etc.). */
  llmSkippedReason?: string;
}

