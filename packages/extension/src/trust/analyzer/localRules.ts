import { LocalRiskSignals } from "../types";

export function applyDeterministicRules(signals: LocalRiskSignals): LocalRiskSignals {
  let score = 0;
  
  if (signals.isUnlimitedApproval) {
    score += 40;
    signals.localFlags.push("UNLIMITED_APPROVAL");
  }

  if (!signals.isKnownContract && signals.isContractCall) {
    score += 20;
    signals.localFlags.push("UNKNOWN_CONTRACT");
  }

  if (signals.actionType === "unknown") {
    score += 10;
    signals.localFlags.push("UNKNOWN_ACTION");
  }
  
  if (!signals.chainSupported) {
    signals.localFlags.push("UNSUPPORTED_CHAIN");
  }

  signals.localRiskScore = Math.min(score, 100);
  return signals;
}
