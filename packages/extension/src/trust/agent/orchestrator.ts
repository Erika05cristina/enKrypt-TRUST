import {
  PendingTxContext,
  AgentDecision,
  FinalRiskAssessment,
  TrustPaidRiskEvidence,
} from "../types";
import { TRUST_FUJI_CHAIN_ID } from "../constants";
import { analyzeTxLocally } from "../analyzer/decodeTx";
import { applyDeterministicRules } from "../analyzer/localRules";
import {
  fetchPaidRiskEvidence,
  type TrustRiskCheckTier,
  type TrustX402Context,
} from "../x402/riskClient";

export type OrchestrateRiskOptions = {
  /** `deep` → POST `/api/risk-check/deep` (más USDC, LLM deep). */
  tier?: TrustRiskCheckTier;
};

export async function orchestrateRiskAssessment(
  txContext: PendingTxContext,
  allowlist: string[] = [],
  x402?: TrustX402Context | null,
  options?: OrchestrateRiskOptions,
): Promise<FinalRiskAssessment> {
  const tier = options?.tier ?? "standard";
  // 1. Análisis Local Rápido
  const rawSignals = analyzeTxLocally(txContext, allowlist);
  const localSignals = applyDeterministicRules(rawSignals);

  // 2. Política de Decisión (Agente TRUST)
  const decision: AgentDecision = {
    shouldQueryPaidApi: false,
    endpoint: null,
    reason: "Local assessment is sufficient",
    budgetMicrousdc: 0,
    queryPayload: null,
  };

  if (localSignals.isUnlimitedApproval) {
    decision.shouldQueryPaidApi = true;
    decision.endpoint = "risk-bundle";
    decision.reason = "Unlimited approval requires deep API verification";
    decision.budgetMicrousdc = 50000;
  } else if (!localSignals.isKnownContract && localSignals.isContractCall) {
    decision.shouldQueryPaidApi = true;
    decision.endpoint = "reputation";
    decision.reason = "Unknown contract interaction";
    decision.budgetMicrousdc = 10000;
  }

  let finalScore = localSignals.localRiskScore;
  let paidEvidence: TrustPaidRiskEvidence | null = null;
  const reasons: string[] = [];

  // Agregar razones locales determinísticas
  if (localSignals.isUnlimitedApproval) reasons.push("Approval Amount: Unlimited (Peligroso)");
  if (!localSignals.isKnownContract && localSignals.isContractCall) reasons.push("Target Contract no verificado localmente");
  if (localSignals.actionType === "unknown") reasons.push("Método de interacción no estándar");

  // 3. Ejecución de Inteligencia Pagada si se requirió
  // HACKATHON OVERRIDE: Llamar siempre a la API para demostrar la respuesta del server en todas las transacciones.
  decision.shouldQueryPaidApi = true;
  
  if (decision.shouldQueryPaidApi) {
    paidEvidence = await fetchPaidRiskEvidence(
      txContext,
      localSignals.localFlags,
      x402,
      tier,
    );
    
    if (paidEvidence) {
      // Merge de Scoring
      // Ej: Penalidad en base a la reputación recibida (100 - repScore)
      const repPenalty = Math.floor((100 - (paidEvidence.reputationScore || 100)) * 0.3);
      finalScore += repPenalty;
      
      if (paidEvidence.paidFlags && paidEvidence.paidFlags.includes("UNVERIFIED_CONTRACT")) {
        finalScore += 20;
        reasons.push("x402 API flag: Contrato sin historial conocido");
      }
      if (paidEvidence.paidFlags && paidEvidence.paidFlags.includes("UNLIMITED_APPROVAL")) {
         // ya cobramos penalty en local, pero agregarlo visual
      }
      
      if (paidEvidence.simulatedOutcome) {
        reasons.push(
          `Decodificación local (payload enviado): ${paidEvidence.simulatedOutcome}`,
        );
      }
    } else {
      reasons.push("⚠️ Falló la consulta al Risk Engine externo, aplicando score local");
      if (txContext.chainId === TRUST_FUJI_CHAIN_ID && !x402) {
        reasons.push(
          "Para x402 en Fuji: define VITE_THIRDWEB_CLIENT_ID, VITE_TRUST_RISK_API_BASE_URL y ten USDC en Fuji para firmar el pago.",
        );
      }
    }
  }

  // Cap de seguridad a 100 max
  finalScore = Math.min(finalScore, 100);

  // 4. Threshold determinista
  let finalLevel: "low" | "medium" | "high" = "low";
  if (finalScore >= 70) finalLevel = "high";
  else if (finalScore >= 30) finalLevel = "medium";

  if (reasons.length === 0) {
    reasons.push("Interacción estándar. No se encontraron riesgos");
  }

  const tierLabel =
    tier === "deep"
      ? " (análisis premium / deep)"
      : "";

  return {
    finalRiskLevel: finalLevel,
    finalRiskScore: finalScore,
    reasons,
    aiSummary: `TRUST Agent Assessment: Nivel ${finalLevel.toUpperCase()} con Score: ${finalScore}/100.${tierLabel}`,
    paidEvidence: paidEvidence || undefined
  };
}
