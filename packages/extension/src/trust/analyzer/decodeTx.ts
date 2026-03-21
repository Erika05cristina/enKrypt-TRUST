import { PendingTxContext, LocalRiskSignals } from "../types";

const APPROVE_SELECTOR = "0x095ea7b3";
const TRANSFER_SELECTOR = "0xa9059cbb"; // ERC20 transfer

export function analyzeTxLocally(tx: PendingTxContext, allowlist: string[] = []): LocalRiskSignals {
  const data = tx.data ? tx.data.toLowerCase() : "0x";
  const value = tx.value ? tx.value : "0x0";
  const to = tx.to ? tx.to.toLowerCase() : "";
  
  const signals: LocalRiskSignals = {
    actionType: "unknown",
    isUnlimitedApproval: false,
    isNativeTransfer: false,
    isContractCall: false,
    isKnownContract: allowlist.includes(to),
    chainSupported: tx.chainId === 43113, // Fuji Chain ID target
    localRiskScore: 0,
    localFlags: [],
  };

  if (!to) {
    signals.isContractCall = true;
    signals.actionType = "contract_call";
    return signals;
  }

  // 1. Native Transfer
  if (data === "0x" || data === "") {
    if (value !== "0x0" && value !== "0" && value !== "") {
      signals.actionType = "transfer";
      signals.isNativeTransfer = true;
    }
  } else if (data.length >= 10) {
    signals.isContractCall = true;
    const selector = data.slice(0, 10);
    signals.methodSig = selector;

    if (selector === APPROVE_SELECTOR) {
      signals.actionType = "approve";
      signals.tokenAddress = to;
      
      // ABI encode adds 32 bytes (64 hex chars) per parameter
      // approve(address spender, uint256 amount)
      if (data.length >= 138) {
        signals.spender = "0x" + data.slice(34, 74);
        signals.approvalAmount = "0x" + data.slice(74, 138); 
        
        // check unlimited approval (max uint256 is ffff...)
        if (signals.approvalAmount.includes("ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff")) {
          signals.isUnlimitedApproval = true;
        }
      }
    } else if (selector === TRANSFER_SELECTOR) {
      signals.actionType = "transfer";
      signals.tokenAddress = to;
    } else {
      signals.actionType = "contract_call";
    }
  }

  return signals;
}
