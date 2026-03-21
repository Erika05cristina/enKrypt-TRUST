import { PendingTxContext } from "../types";

const RISK_API_URL = "http://localhost:3000/api/risk-check"; // Endpoint backend temporal

export async function fetchPaidRiskEvidence(
  txContext: PendingTxContext,
  localFlags: string[]
): Promise<any> {
  const payload = {
    chainId: txContext.chainId,
    to: txContext.to,
    data: txContext.data,
    value: txContext.value,
    origin: txContext.origin || "unknown",
    localFlags: localFlags
  };

  try {
    // 1. Initial call without payment header (expecting 402)
    let response = await fetch(RISK_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    // 2. Handle x402 Payment Required Handshake
    if (response.status === 402) {
      console.log("TRUST: 402 Payment Required interceptado. Simulando pago x402...");
      const dummySignature = "0x-payment-signature-mock";
      
      // 3. Retry with payment header
      response = await fetch(RISK_API_URL, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "PAYMENT-SIGNATURE": dummySignature 
        },
        body: JSON.stringify(payload)
      });
    }

    if (!response.ok) {
      throw new Error(`Risk API HTTP Status: ${response.status}`);
    }

    const evidence = await response.json();
    return evidence;
  } catch (error) {
    console.warn("TRUST: Fallo al consumir API x402 pagada. Omitiendo...", error);
    return null; // Graceful fallback local
  }
}
