export interface RiskCheckRequest {
  chainId: number;
  to: string;
  data: string;
  value: string;
  origin?: string;
  localFlags?: string[];
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
  resource: '/api/risk-check';
  description: string;
  payTo: string;
  asset: string;
  maxTimeoutSeconds: number;
}

export interface RiskCheckSuccessResponse {
  verified: boolean;
  reputationScore: number;
  simulatedOutcome?: string;
  paidRiskScore: number;
  paidFlags: string[];
  explanationSeed: string;
}

