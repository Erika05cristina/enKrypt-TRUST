export type PendingTxContext = {
  chainId: number;
  from: string;
  to: string;
  value: string;
  data: string;
  origin?: string;
  gasLimit?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  nonce?: number;
};

export type LocalRiskSignals = {
  actionType: "transfer" | "approve" | "swap" | "contract_call" | "unknown";
  methodSig?: string;
  decodedMethod?: string;
  tokenAddress?: string;
  spender?: string;
  approvalAmount?: string;
  isUnlimitedApproval: boolean;
  isNativeTransfer: boolean;
  isContractCall: boolean;
  isKnownContract: boolean;
  knownContractLabel?: string;
  chainSupported: boolean;
  localRiskScore: number;
  localFlags: string[];
};

export type AgentDecision = {
  shouldQueryPaidApi: boolean;
  endpoint: "reputation" | "simulation" | "risk-bundle" | null;
  reason: string;
  budgetMicrousdc: number;
  queryPayload: Record<string, unknown> | null;
};

export type FinalRiskAssessment = {
  finalRiskLevel: "low" | "medium" | "high";
  finalRiskScore: number;
  reasons: string[];
  aiSummary: string;
  paidEvidence?: {
    reputationScore: number;
    paidRiskScore: number;
    paidFlags: string[];
    simulatedOutcome?: string;
  };
};
