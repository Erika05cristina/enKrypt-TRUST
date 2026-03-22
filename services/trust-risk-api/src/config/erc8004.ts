import { RISK_CHECK_DEEP_RESOURCE, RISK_CHECK_RESOURCE } from '../constants.js';
import type { TrustErc8004AgentRef } from '../types.js';

const lower0x = (a: string): string =>
  a.startsWith('0x') ? `0x${a.slice(2).toLowerCase()}` : `0x${a.toLowerCase()}`;

const isHexAddr = (s: string): boolean => /^0x[a-fA-F0-9]{40}$/.test(s);

/**
 * ERC-8004: referencia on-chain del agente TRUST (solo si env está completo).
 * Documentación: https://eips.ethereum.org/EIPS/eip-8004 — pagos (x402) son complementarios, no parte del EIP.
 */
export function getErc8004AgentRef(publicBaseUrl: string): TrustErc8004AgentRef | undefined {
  const rawReg = process.env.TRUST_ERC8004_IDENTITY_REGISTRY?.trim();
  const rawAgentId = process.env.TRUST_ERC8004_AGENT_ID?.trim();
  if (!rawReg || !rawAgentId) return undefined;
  if (!isHexAddr(rawReg)) return undefined;

  const chainId = Number.parseInt(process.env.TRUST_ERC8004_CHAIN_ID?.trim() || '43113', 10);
  if (!Number.isInteger(chainId) || chainId <= 0) return undefined;

  const identityRegistry = lower0x(rawReg);
  const agentRegistry = `eip155:${chainId}:${identityRegistry}`;

  const rawRep = process.env.TRUST_ERC8004_REPUTATION_REGISTRY?.trim();
  const reputationRegistry =
    rawRep && isHexAddr(rawRep) ? lower0x(rawRep) : undefined;

  const base = publicBaseUrl.replace(/\/$/, '');
  return {
    chainId,
    identityRegistry,
    reputationRegistry,
    agentRegistry,
    agentId: rawAgentId,
    agentRegistration: `${base}/agent-registration.json`,
    note: 'Identity/Reputation registries per ERC-8004; HTTP payment via x402 (USDC Fuji) is out of EIP-8004 scope.',
  };
}

/**
 * JSON de registro de agente (tokenURI / descubrimiento). Sirve antes de tener agentId (sin bloque registrations).
 */
export function buildAgentRegistrationDocument(publicBaseUrl: string): Record<string, unknown> {
  const base = publicBaseUrl.replace(/\/$/, '');
  const standardUrl = `${base}${RISK_CHECK_RESOURCE}`;
  const deepUrl = `${base}${RISK_CHECK_DEEP_RESOURCE}`;

  const ref = getErc8004AgentRef(publicBaseUrl);
  const rawReg = process.env.TRUST_ERC8004_IDENTITY_REGISTRY?.trim();
  const chainId = Number.parseInt(process.env.TRUST_ERC8004_CHAIN_ID?.trim() || '43113', 10);

  const doc: Record<string, unknown> = {
    type: 'erc-8004-agent-registration',
    name: process.env.TRUST_ERC8004_AGENT_NAME?.trim() || 'TRUST Risk Agent',
    description:
      process.env.TRUST_ERC8004_AGENT_DESCRIPTION?.trim() ||
      'Paid transaction risk analysis for EVM (Avalanche Fuji MVP). Combines deterministic rules, on-chain bytecode probe, verified Solidity source, optional LLM (Ollama). Payment: HTTP 402 x402 with USDC on Fuji.',
    services: [
      {
        type: 'https',
        name: 'risk-check-standard',
        description: 'POST JSON risk check; x402 exact scheme; USDC Avalanche Fuji.',
        endpoint: standardUrl,
        mimeType: 'application/json',
      },
      {
        type: 'https',
        name: 'risk-check-deep',
        description: 'Same body as standard; higher LLM budget; separate x402 resource.',
        endpoint: deepUrl,
        mimeType: 'application/json',
      },
    ],
    supportedTrust: ['reputation', 'validation-offchain'],
    payment: {
      protocol: 'x402',
      scheme: 'exact',
      network: 'avalanche-fuji',
      chainId: 43113,
    },
  };

  if (ref) {
    doc.registrations = [
      {
        agentRegistry: ref.agentRegistry,
        agentId: ref.agentId,
      },
    ];
  } else if (rawReg && isHexAddr(rawReg)) {
    doc.registrationsPending = {
      message:
        'Mint agent on IdentityRegistry then set TRUST_ERC8004_AGENT_ID and TRUST_ERC8004_IDENTITY_REGISTRY in server env; call setAgentURI(agentId, this URL).',
      suggestedAgentRegistry: `eip155:${chainId}:${lower0x(rawReg)}`,
    };
  }

  return doc;
}
