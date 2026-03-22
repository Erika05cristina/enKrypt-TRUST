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

const clamp0to100 = (n: number): number =>
  Math.min(100, Math.max(0, Math.round(n)));

/**
 * El API devuelve `paidRiskScore` (0–100, más alto = más riesgo) y `reputationScore` (más alto = mejor).
 * Antes solo mezclábamos un 30% de (100 − reputación) sobre el score local, ignorando `paidRiskScore`,
 * lo que dejaba el malicioso ~40 y podía invertir el orden frente al veredicto del LLM.
 */
export function mergePaidEvidenceIntoFinalRiskScore(
  localRiskScore: number,
  paid: TrustPaidRiskEvidence,
): number {
  const paidRisk = Number.isFinite(paid.paidRiskScore)
    ? paid.paidRiskScore
    : 50;
  const local = clamp0to100(localRiskScore);
  let score = clamp0to100(Math.round(0.62 * paidRisk + 0.38 * local));

  const flags = paid.paidFlags ?? [];

  if (flags.includes("UNVERIFIED_CONTRACT")) {
    score = clamp0to100(score + 10);
  }

  if (
    flags.includes("SOLIDITY_TX_ORIGIN_RISK") ||
    flags.includes("SOLIDITY_UNGUARDED_ETH_CALL")
  ) {
    score = Math.max(score, 78);
  }

  if (flags.includes("KNOWN_MALICIOUS_TARGET")) {
    score = Math.max(score, 92);
  }

  const verdict = paid.llmAnalysis?.verdict;
  if (verdict === "malicious") {
    score = Math.max(score, 80);
  }

  return clamp0to100(score);
}

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
      finalScore = mergePaidEvidenceIntoFinalRiskScore(
        localSignals.localRiskScore,
        paidEvidence,
      );

      if (
        paidEvidence.paidFlags?.includes("UNVERIFIED_CONTRACT")
      ) {
        reasons.push("x402 API flag: Contrato sin historial conocido");
      }
      if (paidEvidence.paidFlags?.includes("UNLIMITED_APPROVAL")) {
        // Penalidad ya reflejada en local + paidRiskScore del API
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

  finalScore = clamp0to100(finalScore);

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
