interface ImportMetaEnv {
  VITE_DEBUG_LOG?: string;
  /** Client ID de thirdweb (dashboard) — necesario para firmar pago x402 USDC Fuji. */
  VITE_THIRDWEB_CLIENT_ID?: string;
  /** Base URL del trust-risk-api, sin barra final (ej. https://tu-ngrok.ngrok.io). */
  VITE_TRUST_RISK_API_BASE_URL?: string;
}
