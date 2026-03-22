import type { RiskCheckRequest, TrustContractProbe } from '../types.js';

const FUJI_CHAIN_ID = 43113;

const parsePositiveInt = (raw: string | undefined, fallback: number): number => {
  if (!raw?.trim()) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export const getRpcTimeoutMs = (): number => parsePositiveInt(process.env.TRUST_RPC_TIMEOUT_MS, 5000);

const normalizeAddress = (a: string): string | null => {
  const s = a.trim().toLowerCase();
  return /^0x[a-f0-9]{40}$/.test(s) ? s : null;
};

const hexToByteLength = (code: string): number => {
  if (!code || code === '0x') return 0;
  const hex = code.startsWith('0x') ? code.slice(2) : code;
  if (hex.length % 2 !== 0) return 0;
  return hex.length / 2;
};

/** Weak heuristics on raw bytecode (hex); may false-positive. For LLM context only. */
export const bytecodeDeterministicHints = (bytecodeHex: string): string[] => {
  const hints: string[] = [];
  const len = hexToByteLength(bytecodeHex);
  if (len > 24_576) hints.push('very_large_bytecode');
  if (len > 0 && len < 32) hints.push('tiny_contract_unusual');
  return hints;
};

type JsonRpcResponse = {
  jsonrpc?: string;
  id?: number;
  result?: string;
  error?: { code?: number; message?: string };
};

export type ContractProbeRun = {
  public: TrustContractProbe;
  /** Full `0x` bytecode when `kind === 'contract'` (not included in HTTP JSON by default). */
  bytecodeHex?: string;
};

const emptyRun = (to: string, chainId: number, probeError: TrustContractProbe['probeError']): ContractProbeRun => ({
  public: {
    to,
    chainId,
    probeError,
  },
});

/**
 * Fetches `eth_getCode` for `req.to` on Fuji when `chainId === 43113`.
 * Requires `TRUST_FUJI_RPC_URL`. Never throws; degrades to `probeError`.
 */
export const runContractProbe = async (req: RiskCheckRequest): Promise<ContractProbeRun> => {
  const chainId = req.chainId;
  const toRaw = req.to;
  const addr = normalizeAddress(toRaw);
  if (!addr) {
    return emptyRun(toRaw, chainId, 'invalid_address');
  }

  if (chainId !== FUJI_CHAIN_ID) {
    return {
      public: {
        to: addr,
        chainId,
        probeError: 'unsupported_chain',
      },
    };
  }

  const rpcUrl = process.env.TRUST_FUJI_RPC_URL?.trim();
  if (!rpcUrl) {
    return {
      public: {
        to: addr,
        chainId,
        probeError: 'no_rpc_url',
      },
    };
  }

  const timeoutMs = getRpcTimeoutMs();
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getCode',
        params: [addr, 'latest'],
      }),
    });

    if (!res.ok) {
      return {
        public: {
          to: addr,
          chainId,
          probeError: 'rpc_unavailable',
        },
      };
    }

    const json = (await res.json()) as JsonRpcResponse;
    if (json.error?.message) {
      return {
        public: {
          to: addr,
          chainId,
          probeError: 'rpc_unavailable',
        },
      };
    }

    const result = json.result;
    if (typeof result !== 'string' || !result.startsWith('0x')) {
      return {
        public: {
          to: addr,
          chainId,
          probeError: 'invalid_response',
        },
      };
    }

    const lengthBytes = hexToByteLength(result);
    const kind = lengthBytes === 0 ? 'eoa' : 'contract';
    const deterministicHints =
      kind === 'contract' ? bytecodeDeterministicHints(result) : undefined;

    return {
      public: {
        to: addr,
        chainId,
        kind,
        bytecodeLengthBytes: lengthBytes,
        deterministicHints,
      },
      bytecodeHex: kind === 'contract' ? result : undefined,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('abort') || msg.includes('Abort')) {
      return {
        public: {
          to: addr,
          chainId,
          probeError: 'timeout',
        },
      };
    }
    return {
      public: {
        to: addr,
        chainId,
        probeError: 'rpc_unavailable',
      },
    };
  } finally {
    clearTimeout(t);
  }
};
