import { createThirdwebClient } from 'thirdweb';
import { facilitator } from 'thirdweb/x402';
import { handleRiskCheck } from './routes/riskCheck.js';

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

    if (request.method === 'POST' && url.pathname === '/api/risk-check') {
      return handleRiskCheck(request, {
        merchantWalletAddress: config.merchantWalletAddress,
        publicBaseUrl: config.publicBaseUrl,
        facilitator: twFacilitator,
      });
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
