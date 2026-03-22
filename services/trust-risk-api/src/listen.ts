import 'dotenv/config';
import http from 'node:http';
import { createServerHandler } from './server.js';

const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value?.trim()) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value.trim();
};

const port = Number(process.env.PORT ?? 8787);
if (Number.isNaN(port)) {
  throw new Error('PORT must be a number');
}

/** Bind IPv4 all interfaces so LAN / ngrok / túneles puedan llegar al puerto. */
const listenHost = process.env.HOST?.trim() || '0.0.0.0';

const publicBaseUrl =
  process.env.TRUST_PUBLIC_BASE_URL?.replace(/\/$/, '') ?? `http://127.0.0.1:${port}`;

const handler = createServerHandler({
  merchantWalletAddress: requireEnv('MERCHANT_WALLET_ADDRESS'),
  thirdwebSecretKey: requireEnv('THIRDWEB_SECRET_KEY'),
  thirdwebServerWalletAddress: requireEnv('THIRDWEB_SERVER_WALLET_ADDRESS'),
  publicBaseUrl,
});

/**
 * thirdweb wrapFetchWithPayment reintenta con cabeceras extra; el preflight debe permitirlas todas.
 * Incluye `access-control-expose-headers` (la envía el cliente en el 2º POST — ver fetchWithPayment.js).
 */
const CORS_ALLOW_HEADERS =
  'Content-Type, PAYMENT-SIGNATURE, X-PAYMENT, x-request-id, access-control-expose-headers, Access-Control-Expose-Headers';

const setCors = (res: http.ServerResponse): void => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', CORS_ALLOW_HEADERS);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Expose-Headers', 'X-PAYMENT-RESPONSE, x-request-id');
};

const server = http.createServer(async (req, res) => {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const host = req.headers.host ?? `127.0.0.1:${port}`;
  const url = new URL(req.url ?? '/', `http://${host}`);

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  const body = Buffer.concat(chunks);

  const init: RequestInit = {
    method: req.method,
    headers: req.headers as HeadersInit,
  };

  if (req.method !== 'GET' && req.method !== 'HEAD' && body.length > 0) {
    init.body = body;
  }

  const webRequest = new Request(url.toString(), init);
  const webResponse = await handler(webRequest);

  res.statusCode = webResponse.status;
  webResponse.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  res.end(Buffer.from(await webResponse.arrayBuffer()));
});

server.listen(port, listenHost, () => {
  console.log(`[trust-risk-api] bound http://${listenHost}:${port} (acepta conexiones externas si el firewall lo permite)`);
  console.log(
    `[trust-risk-api] x402 TRUST_PUBLIC_BASE_URL → ${publicBaseUrl} (debe coincidir con la URL pública del túnel, ej. ngrok)`
  );
  // No confundir con un POST entrante: solo documenta el método y la ruta.
  console.log(
    `[trust-risk-api] Paid risk check (standard) → POST ${publicBaseUrl}/api/risk-check`
  );
  console.log(
    `[trust-risk-api] Paid risk check (deep) → POST ${publicBaseUrl}/api/risk-check/deep`
  );
});
