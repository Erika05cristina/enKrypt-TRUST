import { avalancheFuji } from 'thirdweb/chains';
import { settlePayment, type ThirdwebX402Facilitator } from 'thirdweb/x402';
import { getDeepSettlePriceUsd, getStandardSettlePriceUsd } from '../config/pricing.js';
import { validateRiskCheckRequest } from '../contracts.js';
import {
  ERROR_CODES,
  REQUEST_ID_HEADER,
  RISK_CHECK_DEEP_RESOURCE,
  RISK_CHECK_RESOURCE,
  TRUST_X402_MAX_TIMEOUT_SECONDS,
} from '../constants.js';
import { runOllamaAnalysis, type LlmTier } from '../llm/ollama.js';
import type { RiskCheckRequest, RiskCheckSuccessResponse, TrustErrorEnvelope } from '../types.js';
import { evaluatePaidRisk } from '../engine/scoreRisk.js';
import { createRequestId } from '../utils/requestId.js';
import { readPaymentHeader } from '../x402/payment.js';

export type RiskCheckTier = 'standard' | 'deep';

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

const tierConfig = (tier: RiskCheckTier) => {
  if (tier === 'deep') {
    return {
      resourcePath: RISK_CHECK_DEEP_RESOURCE,
      priceUsd: getDeepSettlePriceUsd(),
      routeDescription: 'TRUST paid risk check (deep LLM analysis)',
      llmTier: 'deep' as LlmTier,
    };
  }
  return {
    resourcePath: RISK_CHECK_RESOURCE,
    priceUsd: getStandardSettlePriceUsd(),
    routeDescription: 'TRUST paid risk check',
    llmTier: 'standard' as LlmTier,
  };
};

/**
 * x402 + motor B3 + opcional Ollama. `tier` define URL de recurso y precio (exact).
 */
export const handleRiskCheck = async (
  request: Request,
  config: RiskCheckRouteConfig,
  tier: RiskCheckTier = 'standard'
): Promise<Response> => {
  const requestId = createRequestId();
  const { resourcePath, priceUsd, routeDescription, llmTier } = tierConfig(tier);

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
  const base = config.publicBaseUrl.replace(/\/$/, '');
  const resourceUrl = `${base}${resourcePath}`;

  if (!paymentHeader) {
    try {
      const facilitatorAccepts = await config.facilitator.accepts({
        resourceUrl,
        method: 'POST',
        network: avalancheFuji,
        price: priceUsd,
        scheme: 'exact',
        x402Version: 1,
        routeConfig: {
          description: routeDescription,
          mimeType: 'application/json',
          maxTimeoutSeconds: TRUST_X402_MAX_TIMEOUT_SECONDS,
        },
        payTo: config.merchantWalletAddress,
      });
      const body = facilitatorAccepts.responseBody;
      return new Response(
        JSON.stringify({
          x402Version: body.x402Version ?? 1,
          error: 'X-PAYMENT header is required',
          accepts: body.accepts,
        }),
        {
          status: 402,
          headers: {
            'content-type': 'application/json',
            [REQUEST_ID_HEADER]: requestId,
          },
        }
      );
    } catch (err) {
      return jsonResponse(
        toErrorEnvelope(
          ERROR_CODES.INTERNAL_ERROR,
          err instanceof Error ? err.message : 'Failed to build x402 payment requirements',
          requestId
        ),
        500,
        requestId
      );
    }
  }

  const settleResult = await settlePayment({
    resourceUrl,
    method: 'POST',
    paymentData: paymentHeader,
    payTo: config.merchantWalletAddress,
    network: avalancheFuji,
    price: priceUsd,
    scheme: 'exact',
    x402Version: 1,
    facilitator: config.facilitator,
    routeConfig: {
      description: routeDescription,
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

  const riskBody = evaluatePaidRisk(payload as RiskCheckRequest);
  const { analysis, skippedReason } = await runOllamaAnalysis(
    payload as RiskCheckRequest,
    riskBody,
    llmTier
  );

  const responseBody: RiskCheckSuccessResponse = {
    ...riskBody,
    llmAnalysis: analysis,
    ...(!analysis && skippedReason ? { llmSkippedReason: skippedReason } : {}),
  };

  const headers = mergeResponseHeaders(requestId, settleResult.responseHeaders, true);
  headers.set('content-type', 'application/json');

  return new Response(JSON.stringify(responseBody), {
    status: 200,
    headers,
  });
};
