<template>
  <div class="trust-risk-panel" :class="riskLevelClass">
    <div class="trust-header">
      <div class="trust-logo">🛡️ TRUST Agent</div>
      <div class="trust-badge">{{ assessment.finalRiskLevel.toUpperCase() }} RISK</div>
    </div>
    
    <div class="trust-score-bar">
      <div class="score-fill" :style="{ width: assessment.finalRiskScore + '%' }"></div>
    </div>

    <div class="trust-summary">
      <p>
        <strong>Riesgo (0–100, más alto = más peligroso):</strong>
        <span class="score-number">{{ assessment.finalRiskScore }}</span>/100
      </p>
      <p class="ai-summary">{{ assessment.aiSummary }}</p>
    </div>

    <ul class="trust-reasons">
      <li v-for="(reason, index) in assessment.reasons" :key="index">
        <span class="reason-indicator">👉</span> <span>{{ reason }}</span>
      </li>
    </ul>

    <div v-if="showDeepUpgrade" class="trust-deep-cta">
      <p class="trust-deep-hint">
        Segundo pago x402 en Fuji (≈ <strong>$0.02 USDC</strong>): análisis
        <strong>deep</strong> con más contexto LLM.
      </p>
      <button
        type="button"
        class="trust-deep-button"
        :disabled="deepLoading"
        @click="$emit('request-deep')"
      >
        {{
          deepLoading
            ? 'Firmando pago premium…'
            : 'Análisis premium (deep)'
        }}
      </button>
    </div>

    <!-- Sección que sólo aparece si hubo una consulta a la API de tu compañero -->
    <div v-if="assessment.paidEvidence" class="paid-evidence-section">
      <div class="divider"></div>
      <h4>🤖 Verificación Pagada (x402)</h4>
      <p v-if="assessment.paidEvidence.reputationScore !== undefined">
        Reputación x402: <strong>{{ assessment.paidEvidence.reputationScore }}/100</strong>
      </p>
      <div class="flags" v-if="assessment.paidEvidence.paidFlags && assessment.paidEvidence.paidFlags.length > 0">
        <span v-for="flag in assessment.paidEvidence.paidFlags" :key="flag" class="flag-badge">
          {{ flag }}
        </span>
      </div>
      </div>
      
      <!-- AI Analysis (Llm) -->
      <div v-if="assessment.paidEvidence?.llmAnalysis" class="llm-analysis-section">
        <div class="divider"></div>
        <h4>
          🧠 AI Analysis ({{ assessment.paidEvidence.llmAnalysis.model }})
          <span
            v-if="assessment.paidEvidence.llmAnalysis.tier === 'deep'"
            class="tier-badge tier-deep"
            >DEEP</span
          >
        </h4>
        <div v-if="assessment.paidEvidence.llmAnalysis.verdict" class="ai-verdict" :class="'verdict-' + assessment.paidEvidence.llmAnalysis.verdict">
          Verdict: <strong>{{ assessment.paidEvidence.llmAnalysis.verdict.toUpperCase() }}</strong>
        </div>
        <p class="ai-text">
          {{ assessment.paidEvidence.llmAnalysis.summary || assessment.paidEvidence.llmAnalysis.text }}
        </p>
        <div
          v-if="assessment.paidEvidence.llmAnalysis.technicalRationale"
          class="ai-technical-rationale"
        >
          <h5 class="ai-technical-title">Detalle técnico (premium)</h5>
          <p class="ai-technical-body">{{ assessment.paidEvidence.llmAnalysis.technicalRationale }}</p>
        </div>
        <p
          v-if="assessment.paidEvidence.llmAnalysis.llmRiskScore !== undefined"
          class="ai-llm-score"
        >
          Riesgo según IA: <strong>{{ assessment.paidEvidence.llmAnalysis.llmRiskScore }}/100</strong>
          <span class="ai-llm-score-hint"> (influye en Reputación / riesgo pagado arriba)</span>
        </p>
      </div>
      
      <!-- Contract Probe -->
      <div v-if="assessment.paidEvidence?.contractProbe" class="probe-section">
        <div class="divider"></div>
        <h4>🔍 Contract Probe</h4>
        <p>Type: <strong>{{ assessment.paidEvidence.contractProbe.kind === 'contract' ? 'Smart Contract' : 'Wallet (EOA)' }}</strong></p>
        <p v-if="assessment.paidEvidence.contractProbe.bytecodeLengthBytes">Bytecode: {{ assessment.paidEvidence.contractProbe.bytecodeLengthBytes }} bytes</p>
      </div>

    </div>
</template>

<script setup lang="ts">
import { computed, PropType } from 'vue';
import { FinalRiskAssessment } from '../types';

defineEmits<{
  'request-deep': [];
}>();

const props = defineProps({
  assessment: {
    type: Object as PropType<FinalRiskAssessment>,
    required: true,
  },
  /** Muestra CTA para POST `/api/risk-check/deep` (otro x402). */
  showDeepUpgrade: {
    type: Boolean,
    default: false,
  },
  deepLoading: {
    type: Boolean,
    default: false,
  },
});

const riskLevelClass = computed(() => {
  return `risk-${props.assessment.finalRiskLevel}`;
});
</script>

<style scoped>
.trust-risk-panel {
  border-radius: 12px;
  padding: 16px;
  margin: 16px 0;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #ffffff;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
}

/* Gradientes estéticos según el riesgo */
.risk-low {
  background: linear-gradient(135deg, #1b4332, #2d6a4f);
  border: 1px solid #40916c;
}

.risk-medium {
  background: linear-gradient(135deg, #783f04, #b45f06);
  border: 1px solid #e69138;
}

.risk-high {
  background: linear-gradient(135deg, #4a0000, #800000);
  border: 1px solid #cc0000;
}

.trust-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.trust-logo {
  font-weight: 800;
  font-size: 14px;
  letter-spacing: 0.5px;
}

.trust-badge {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 800;
  background: rgba(0, 0, 0, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.trust-score-bar {
  height: 6px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  margin-bottom: 16px;
  overflow: hidden;
}

.score-fill {
  height: 100%;
  background: #ffffff;
  border-radius: 3px;
  transition: width 0.5s ease-in-out;
}

.trust-summary {
  margin-bottom: 16px;
}

.trust-summary p {
  margin: 4px 0;
  font-size: 14px;
}

.score-number {
  font-weight: 800;
  font-size: 16px;
}

.ai-summary {
  font-style: italic;
  opacity: 0.95;
  line-height: 1.4;
}

.trust-reasons {
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
}

.trust-reasons li {
  margin-bottom: 8px;
  display: flex;
  align-items: flex-start;
  background: rgba(0, 0, 0, 0.15);
  padding: 6px 10px;
  border-radius: 6px;
}

.reason-indicator {
  margin-right: 8px;
  opacity: 0.8;
}

.paid-evidence-section {
  margin-top: 16px;
  font-size: 13px;
  padding-top: 4px;
}

.divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.2);
  margin-bottom: 12px;
}

.paid-evidence-section h4 {
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 700;
}

.flags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.flag-badge {
  background: rgba(255, 255, 255, 0.25);
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: bold;
}

.llm-analysis-section, .probe-section {
  margin-top: 12px;
}

.llm-analysis-section h4, .probe-section h4 {
  margin: 0 0 6px 0;
  font-size: 13px;
  color: #fff;
  display: flex;
  align-items: center;
}

.ai-verdict {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 800;
  margin-bottom: 8px;
  background: rgba(255, 255, 255, 0.1);
}

.verdict-safe { color: #4ade80; border: 1px solid #4ade80; }
.verdict-caution { color: #facc15; border: 1px solid #facc15; }
.verdict-malicious { color: #f87171; border: 1px solid #f87171; }
.verdict-unknown { color: #a1a1aa; border: 1px solid #a1a1aa; }

.ai-text {
  font-size: 12px;
  line-height: 1.5;
  background: rgba(0, 0, 0, 0.2);
  padding: 8px;
  border-radius: 6px;
  border-left: 3px solid #6366f1;
}

.ai-llm-score {
  font-size: 12px;
  margin: 0 0 8px 0;
  opacity: 0.95;
}

.ai-llm-score-hint {
  font-size: 10px;
  opacity: 0.75;
  font-weight: 500;
}

.ai-technical-rationale {
  margin-top: 10px;
  padding: 10px;
  border-radius: 8px;
  background: rgba(99, 102, 241, 0.12);
  border: 1px solid rgba(139, 92, 246, 0.35);
}

.ai-technical-title {
  margin: 0 0 6px 0;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #c4b5fd;
}

.ai-technical-body {
  margin: 0;
  font-size: 12px;
  line-height: 1.55;
  white-space: pre-wrap;
}

.probe-section p {
  margin: 2px 0;
  font-size: 12px;
  opacity: 0.9;
}

.trust-deep-cta {
  margin: 14px 0;
  padding: 12px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.25);
}

.trust-deep-hint {
  margin: 0 0 10px 0;
  font-size: 12px;
  line-height: 1.45;
  opacity: 0.95;
}

.trust-deep-button {
  width: 100%;
  padding: 10px 14px;
  border-radius: 8px;
  border: none;
  font-weight: 800;
  font-size: 13px;
  cursor: pointer;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4);
}

.trust-deep-button:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.tier-badge {
  margin-left: 8px;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  vertical-align: middle;
}

.tier-deep {
  background: rgba(139, 92, 246, 0.35);
  border: 1px solid #a78bfa;
}
</style>
