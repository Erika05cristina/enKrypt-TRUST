/**
 * Normaliza el valor `v` de firmas ECDSA para compatibilidad con verificadores x402 (27/28).
 * Copiado del patrón de x402-starter-kit.
 */
export function normalizeSignatureV(signature: string, chainId: number): string {
  const vHex = signature.slice(130);
  const vValue = parseInt(vHex, 16);

  let normalizedV: number;

  if (vValue === 0 || vValue === 1) {
    normalizedV = vValue + 27;
  } else if (vValue === 27 || vValue === 28) {
    normalizedV = vValue;
  } else if (vValue >= 35) {
    const yParity = (vValue - 35 - chainId * 2) % 2;
    normalizedV = yParity + 27;
  } else {
    console.warn('TRUST x402: unexpected v value:', vValue);
    normalizedV = vValue;
  }

  return signature.slice(0, 130) + normalizedV.toString(16).padStart(2, '0');
}

/** Envuelve `fetch` para normalizar el header X-PAYMENT antes de enviarlo al API. */
export function createNormalizedFetch(chainId: number): typeof fetch {
  return async (input, init) => {
    let paymentHeader: string | null = null;

    if (init?.headers instanceof Headers) {
      paymentHeader = init.headers.get('x-payment') || init.headers.get('X-PAYMENT');
    } else if (typeof init?.headers === 'object' && init.headers !== null) {
      const headers = init.headers as Record<string, string>;
      paymentHeader =
        headers['x-payment'] || headers['X-PAYMENT'] || null;
    }

    if (paymentHeader) {
      try {
        const decoded = JSON.parse(atob(paymentHeader));

        if (decoded.payload?.signature) {
          decoded.payload.signature = normalizeSignatureV(
            decoded.payload.signature,
            chainId,
          );
          const normalizedPaymentHeader = btoa(JSON.stringify(decoded));

          if (init?.headers instanceof Headers) {
            init.headers.set('X-PAYMENT', normalizedPaymentHeader);
          } else if (typeof init?.headers === 'object' && init.headers !== null) {
            const headers = init.headers as Record<string, string>;
            delete headers['x-payment'];
            delete headers['X-PAYMENT'];
            headers['X-PAYMENT'] = normalizedPaymentHeader;
          }
        }
      } catch (e) {
        console.error('TRUST x402: failed to normalize payment header', e);
      }
    }

    return fetch(input, {
      ...init,
      cache: init?.cache ?? 'no-store',
    });
  };
}
