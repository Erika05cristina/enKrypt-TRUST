import { createThirdwebClient } from 'thirdweb';
import { facilitator } from 'thirdweb/x402';
import { buildAgentRegistrationDocument } from './config/erc8004.js';
import { handleRiskCheck } from './routes/riskCheck.js';
import {
  AGENT_REGISTRATION_RESOURCE,
  REQUEST_ID_HEADER,
  RISK_CHECK_DEEP_RESOURCE,
  RISK_CHECK_RESOURCE,
} from './constants.js';
import { createRequestId } from './utils/requestId.js';

export type ServerConfig = {
  merchantWalletAddress: string;
  thirdwebSecretKey: string;
  thirdwebServerWalletAddress: string;
  /** Sin barra final; debe coincidir con la URL que usa el cliente al pagar. */
  publicBaseUrl: string;
};

export const createServerHandler = (config: ServerConfig) => {
  const client = createThirdwebClient({
    secretKey: config.thirdwebSecretKey,
  });

  const twFacilitator = facilitator({
    client,
    serverWalletAddress: config.thirdwebServerWalletAddress,
  });

  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === AGENT_REGISTRATION_RESOURCE) {
      const body = buildAgentRegistrationDocument(config.publicBaseUrl);
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: {
          'content-type': 'application/json; charset=utf-8',
          [REQUEST_ID_HEADER]: createRequestId(),
          'cache-control': 'public, max-age=300',
        },
      });
    }

    if (request.method === 'POST' && url.pathname === RISK_CHECK_RESOURCE) {
      return handleRiskCheck(
        request,
        {
          merchantWalletAddress: config.merchantWalletAddress,
          publicBaseUrl: config.publicBaseUrl,
          facilitator: twFacilitator,
        },
        'standard'
      );
    }

    if (request.method === 'POST' && url.pathname === RISK_CHECK_DEEP_RESOURCE) {
      return handleRiskCheck(
        request,
        {
          merchantWalletAddress: config.merchantWalletAddress,
          publicBaseUrl: config.publicBaseUrl,
          facilitator: twFacilitator,
        },
        'deep'
      );
    }

    return new Response(
      JSON.stringify({
        error: {
          code: 'NOT_FOUND',
          message: 'Route not found',
          requestId: 'req_not_found',
          details: {},
        },
      }),
      {
        status: 404,
        headers: { 'content-type': 'application/json' },
      }
    );
  };
};
