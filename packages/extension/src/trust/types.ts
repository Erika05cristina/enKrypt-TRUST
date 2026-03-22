export type TrustRiskFlag =
  | 'UNLIMITED_APPROVAL'
  | 'UNKNOWN_CONTRACT'
  | 'UNVERIFIED_CONTRACT'
  | 'SUSPICIOUS_ORIGIN'
  | 'HIGH_RISK_PATTERN';

export interface TrustRiskCheckRequest {
  chainId: number;
  to: string;
  data: string;
  value: string;
  origin?: string;
  localFlags?: string[];
}

export type TrustAiVerdict = 'safe' | 'caution' | 'malicious' | 'unknown';

export type TrustContractProbeError =
  | 'no_rpc_url'
  | 'unsupported_chain'
  | 'invalid_address'
  | 'rpc_unavailable'
  | 'invalid_response'
  | 'timeout';

export interface TrustContractProbe {
  to: string;
  chainId: number;
  kind?: 'eoa' | 'contract';
  bytecodeLengthBytes?: number;
  probeError?: TrustContractProbeError;
  deterministicHints?: string[];
}

export type TrustExplorerLookupReason =
  | 'unsupported_chain'
  | 'not_a_contract'
  | 'invalid_address'
  | 'explorer_disabled';

export type TrustExplorerProbeError = 'api_error' | 'timeout' | 'invalid_response';

export interface TrustExplorerSourceProbe {
  to: string;
  chainId: number;
  sourceVerified?: boolean;
  contractName?: string;
  compilerVersion?: string;
  sourceLengthChars?: number;
  probeError?: TrustExplorerProbeError;
  lookupReason?: TrustExplorerLookupReason;
  httpStatus?: number;
}

export interface TrustLlmAnalysis {
  text: string;
  tier: 'standard' | 'deep';
  maxOutputTokens: number;
  truncatedInput?: boolean;
  provider: 'ollama';
  model: string;
  verdict?: TrustAiVerdict;
  flags?: string[];
  summary?: string;
  disclaimer?: string;
  bytecodeTruncatedForLlm?: boolean;
  solidityTruncatedForLlm?: boolean;
  rawStructuredError?: string;
}

export interface TrustPaidRiskEvidence {
  verified: boolean;
  reputationScore: number;
  simulatedOutcome?: string;
  paidRiskScore: number;
  paidFlags: string[];
  explanationSeed: string;
  contractProbe?: TrustContractProbe;
  explorerSourceProbe?: TrustExplorerSourceProbe;
  llmAnalysis?: TrustLlmAnalysis | null;
  llmSkippedReason?: string;
}

export interface TrustErrorEnvelope {
  error: {
    code: string;
    message: string;
    requestId: string;
    details: Record<string, unknown>;
  };
}

export interface TrustX402AcceptOption {
  scheme: 'exact';
  network: 'avalanche-fuji';
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  payTo: string;
  asset: string;
  maxTimeoutSeconds: number;
}

