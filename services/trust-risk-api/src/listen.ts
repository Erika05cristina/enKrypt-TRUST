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

const publicBaseUrl =
  process.env.TRUST_PUBLIC_BASE_URL?.replace(/\/$/, '') ?? `http://127.0.0.1:${port}`;

const handler = createServerHandler({
  merchantWalletAddress: requireEnv('MERCHANT_WALLET_ADDRESS'),
  thirdwebSecretKey: requireEnv('THIRDWEB_SECRET_KEY'),
  thirdwebServerWalletAddress: requireEnv('THIRDWEB_SERVER_WALLET_ADDRESS'),
  publicBaseUrl,
});

const setCors = (res: http.ServerResponse): void => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, PAYMENT-SIGNATURE, X-PAYMENT, x-request-id'
  );
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
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

server.listen(port, () => {
  console.log(`[trust-risk-api] listening ${publicBaseUrl}`);
  console.log(`[trust-risk-api] POST ${publicBaseUrl}/api/risk-check`);
});
