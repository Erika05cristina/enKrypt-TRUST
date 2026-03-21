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

export interface TrustLlmAnalysis {
  text: string;
  tier: 'standard' | 'deep';
  maxOutputTokens: number;
  truncatedInput?: boolean;
  provider: 'ollama';
  model: string;
}

export interface TrustPaidRiskEvidence {
  verified: boolean;
  reputationScore: number;
  simulatedOutcome?: string;
  paidRiskScore: number;
  paidFlags: string[];
  explanationSeed: string;
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

