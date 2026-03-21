import { avalancheFuji } from 'thirdweb/chains';
import { settlePayment, type ThirdwebX402Facilitator } from 'thirdweb/x402';
import { validateRiskCheckRequest } from '../contracts.js';
import {
  ERROR_CODES,
  REQUEST_ID_HEADER,
  RISK_CHECK_RESOURCE,
  TRUST_SETTLE_PRICE_USD,
  TRUST_X402_MAX_TIMEOUT_SECONDS,
} from '../constants.js';
import type { RiskCheckSuccessResponse, TrustErrorEnvelope } from '../types.js';
import { createRequestId } from '../utils/requestId.js';
import { buildPaymentRequirement, readPaymentHeader } from '../x402/payment.js';

type RiskCheckRouteConfig = {
  merchantWalletAddress: string;
  publicBaseUrl: string;
  facilitator: ThirdwebX402Facilitator;
};

const jsonResponse = <T>(body: T, status: number, requestId: string): Response => {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      [REQUEST_ID_HEADER]: requestId,
    },
  });
};

const toErrorEnvelope = (
  code: string,
  message: string,
  requestId: string,
  details: Record<string, unknown> = {}
): TrustErrorEnvelope => ({
  error: {
    code,
    message,
    requestId,
    details,
  },
});

const mergeResponseHeaders = (
  requestId: string,
  extra: Record<string, string>,
  skipContentType = false
): Headers => {
  const headers = new Headers({
    'content-type': 'application/json',
    [REQUEST_ID_HEADER]: requestId,
  });
  for (const [key, value] of Object.entries(extra)) {
    if (skipContentType && key.toLowerCase() === 'content-type') continue;
    headers.set(key, value);
  }
  return headers;
};

type X402V1ErrorBody = {
  x402Version?: number;
  error?: string;
  errorMessage?: string;
  accepts?: unknown[];
};

const isX402V1ErrorBody = (body: unknown): body is X402V1ErrorBody =>
  Boolean(body && typeof body === 'object' && 'accepts' in (body as object));

/**
 * B2: x402 real via thirdweb settlePayment + servidor HTTP en listen.ts.
 */
export const handleRiskCheck = async (
  request: Request,
  config: RiskCheckRouteConfig
): Promise<Response> => {
  const requestId = createRequestId();

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse(
      toErrorEnvelope(ERROR_CODES.BAD_REQUEST, 'Malformed JSON body', requestId),
      400,
      requestId
    );
  }

  const validation = validateRiskCheckRequest(payload);
  if (!validation.ok) {
    const status = validation.statusCode ?? 400;
    const code = validation.errorCode ?? ERROR_CODES.BAD_REQUEST;
    return jsonResponse(
      toErrorEnvelope(code, validation.reason ?? 'Invalid request', requestId),
      status,
      requestId
    );
  }

  const paymentHeader = readPaymentHeader(request.headers);
  if (!paymentHeader) {
    return jsonResponse(
      toErrorEnvelope(
        ERROR_CODES.PAYMENT_REQUIRED,
        'Payment required for risk intelligence',
        requestId,
        {
          x402Version: 1,
          accepts: [buildPaymentRequirement(config.merchantWalletAddress)],
        }
      ),
      402,
      requestId
    );
  }

  const base = config.publicBaseUrl.replace(/\/$/, '');
  const resourceUrl = `${base}${RISK_CHECK_RESOURCE}`;

  const settleResult = await settlePayment({
    resourceUrl,
    method: 'POST',
    paymentData: paymentHeader,
    payTo: config.merchantWalletAddress,
    network: avalancheFuji,
    price: TRUST_SETTLE_PRICE_USD,
    scheme: 'exact',
    x402Version: 1,
    facilitator: config.facilitator,
    routeConfig: {
      description: 'TRUST paid risk check',
      mimeType: 'application/json',
      maxTimeoutSeconds: TRUST_X402_MAX_TIMEOUT_SECONDS,
    },
  });

  if (settleResult.status !== 200) {
    const headers = mergeResponseHeaders(requestId, settleResult.responseHeaders, true);
    headers.set('content-type', 'application/json');

    if (isX402V1ErrorBody(settleResult.responseBody)) {
      const v1 = settleResult.responseBody;
      return new Response(
        JSON.stringify(
          toErrorEnvelope(
            ERROR_CODES.PAYMENT_REQUIRED,
            v1.errorMessage ?? v1.error ?? 'Payment verification failed',
            requestId,
            {
              x402Version: v1.x402Version ?? 1,
              accepts: v1.accepts ?? [],
            }
          )
        ),
        { status: 402, headers }
      );
    }

    return new Response(
      JSON.stringify(
        toErrorEnvelope(
          ERROR_CODES.PAYMENT_REQUIRED,
          'Payment verification failed',
          requestId,
          {
            hint: 'x402 v2: revisa headers de respuesta del facilitador',
          }
        )
      ),
      { status: 402, headers }
    );
  }

  const riskBody: RiskCheckSuccessResponse = {
    verified: false,
    reputationScore: 22,
    simulatedOutcome: 'Approves unlimited token spending to unknown spender',
    paidRiskScore: 91,
    paidFlags: ['UNVERIFIED_CONTRACT', 'UNLIMITED_APPROVAL'],
    explanationSeed: 'High confidence risk signal',
  };

  const headers = mergeResponseHeaders(requestId, settleResult.responseHeaders, true);
  headers.set('content-type', 'application/json');

  return new Response(JSON.stringify(riskBody), {
    status: 200,
    headers,
  });
};
