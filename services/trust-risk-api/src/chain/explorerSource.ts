import type { RiskCheckRequest, TrustContractProbe, TrustExplorerSourceProbe } from '../types.js';

const FUJI_CHAIN_ID = 43113;

/** Routescan Etherscan-compatible API for Avalanche Fuji (chain 43113). */
export const DEFAULT_EXPLORER_API_URL =
  'https://api.routescan.io/v2/network/testnet/evm/43113/etherscan/api';

const parsePositiveInt = (raw: string | undefined, fallback: number): number => {
  if (!raw?.trim()) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export const getExplorerTimeoutMs = (): number =>
  parsePositiveInt(process.env.TRUST_EXPLORER_TIMEOUT_MS, 12_000);

const isExplorerDisabled = (): boolean => {
  const v = process.env.TRUST_EXPLORER_DISABLED?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
};

type EtherscanSourceRow = {
  SourceCode?: string;
  ContractName?: string;
  CompilerVersion?: string;
  ABI?: string;
};

type EtherscanSourceResponse = {
  status?: string;
  message?: string;
  result?: EtherscanSourceRow | EtherscanSourceRow[];
};

const normalizeAddress = (a: string): string | null => {
  const s = a.trim().toLowerCase();
  return /^0x[a-f0-9]{40}$/.test(s) ? s : null;
};

const firstResultRow = (result: EtherscanSourceResponse['result']): EtherscanSourceRow | null => {
  if (!result) return null;
  if (Array.isArray(result)) return result[0] ?? null;
  return result;
};

export type ExplorerSourceRun = {
  public: TrustExplorerSourceProbe;
  /** Full verified Solidity (or multi-file bundle text) for LLM; never sent in JSON 200. */
  sourceCodeForLlm?: string;
};

const skippedRun = (
  to: string,
  chainId: number,
  reason: TrustExplorerSourceProbe['lookupReason']
): ExplorerSourceRun => ({
  public: {
    to,
    chainId,
    lookupReason: reason,
  },
});

/**
 * Fetches verified contract source from Routescan (Etherscan-compatible) for Fuji.
 * When `TRUST_EXPLORER_DISABLED` is set, skips. Uses `TRUST_EXPLORER_API_URL` or built-in Fuji default.
 */
export const runExplorerSourceLookup = async (
  req: RiskCheckRequest,
  contractProbe: TrustContractProbe
): Promise<ExplorerSourceRun> => {
  const chainId = req.chainId;
  const addr = normalizeAddress(req.to);
  if (!addr) {
    return skippedRun(req.to, chainId, 'invalid_address');
  }

  if (chainId !== FUJI_CHAIN_ID) {
    return skippedRun(addr, chainId, 'unsupported_chain');
  }

  if (contractProbe.probeError) {
    return skippedRun(addr, chainId, 'contract_probe_unavailable');
  }

  if (contractProbe.kind !== 'contract') {
    return skippedRun(addr, chainId, 'not_a_contract');
  }

  if (isExplorerDisabled()) {
    return skippedRun(addr, chainId, 'explorer_disabled');
  }

  const baseUrl = (process.env.TRUST_EXPLORER_API_URL?.trim() || DEFAULT_EXPLORER_API_URL).replace(
    /\?$/,
    ''
  );
  const apiKey = process.env.TRUST_EXPLORER_API_KEY?.trim() ?? '';
  const qs = new URLSearchParams({
    module: 'contract',
    action: 'getsourcecode',
    address: addr,
  });
  if (apiKey) qs.set('apikey', apiKey);
  const url = `${baseUrl}?${qs.toString()}`;

  const timeoutMs = getExplorerTimeoutMs();
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { accept: 'application/json' },
      signal: controller.signal,
    });

    if (!res.ok) {
      return {
        public: {
          to: addr,
          chainId,
          sourceVerified: false,
          probeError: 'api_error',
          httpStatus: res.status,
        },
      };
    }

    const json = (await res.json()) as EtherscanSourceResponse;
    const row = firstResultRow(json.result);
    if (!row) {
      return {
        public: {
          to: addr,
          chainId,
          sourceVerified: false,
          probeError: 'invalid_response',
        },
      };
    }

    const rawSource = typeof row.SourceCode === 'string' ? row.SourceCode : '';
    const trimmed = rawSource.trim();
    /** Routescan returns empty SourceCode when the contract is not verified on the explorer. */
    const sourceVerified = trimmed.length > 0;
    const contractName =
      typeof row.ContractName === 'string' && row.ContractName.trim().length > 0
        ? row.ContractName.trim()
        : undefined;
    const compilerVersion =
      typeof row.CompilerVersion === 'string' && row.CompilerVersion.trim().length > 0
        ? row.CompilerVersion.trim()
        : undefined;

    if (!sourceVerified) {
      return {
        public: {
          to: addr,
          chainId,
          sourceVerified: false,
          contractName: contractName || undefined,
          sourceLengthChars: 0,
        },
      };
    }

    return {
      public: {
        to: addr,
        chainId,
        sourceVerified: true,
        contractName,
        compilerVersion,
        sourceLengthChars: trimmed.length,
      },
      sourceCodeForLlm: trimmed,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('abort') || msg.includes('Abort')) {
      return {
        public: {
          to: addr,
          chainId,
          sourceVerified: false,
          probeError: 'timeout',
        },
      };
    }
    return {
      public: {
        to: addr,
        chainId,
        sourceVerified: false,
        probeError: 'api_error',
      },
    };
  } finally {
    clearTimeout(t);
  }
};
