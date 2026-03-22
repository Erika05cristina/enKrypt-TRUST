import type { EnkryptAccount } from '@enkryptcom/types';
import type { ThirdwebClient } from 'thirdweb';
import { createWalletAdapter, type Account, type Wallet } from 'thirdweb/wallets';
import { avalancheFuji } from 'thirdweb/chains';
import { toChecksumAddress } from 'web3-utils';
import type { BaseNetwork } from '@/types/base-network';
import { MessageSigner, TypedMessageSigner } from '@/providers/ethereum/ui/libs/signer';
import { TRUST_FUJI_CHAIN_ID } from '@/trust/constants';
import { evmChainIdToNumber } from '@/trust/utils/evmChainId';

type MessageTypeProperty = { name: string; type: string };

/**
 * thirdweb/x402 solo manda `types.TransferWithAuthorization`. `@metamask/eth-sig-util` hace
 * `Object.assign({ EIP712Domain: [] }, types)` → dominio EIP-712 hasheado vacío → firma que no
 * coincide con USDC / el facilitador → "Invalid authorization signature".
 * MetaMask rellena EIP712Domain implícitamente; Enkrypt debe hacerlo explícito.
 */
const DOMAIN_FIELD_ORDER = [
  'name',
  'version',
  'chainId',
  'verifyingContract',
  'salt',
] as const;

const DOMAIN_FIELD_SOLIDITY_TYPE: Record<
  (typeof DOMAIN_FIELD_ORDER)[number],
  string
> = {
  name: 'string',
  version: 'string',
  chainId: 'uint256',
  verifyingContract: 'address',
  salt: 'bytes32',
};

function buildEip712DomainTypeDefinition(
  domain: Record<string, unknown>,
): MessageTypeProperty[] {
  const fields: MessageTypeProperty[] = [];
  for (const key of DOMAIN_FIELD_ORDER) {
    if (!(key in domain)) continue;
    const v = domain[key];
    if (v === undefined || v === null) continue;
    fields.push({ name: key, type: DOMAIN_FIELD_SOLIDITY_TYPE[key] });
  }
  return fields;
}

function mergeTypesWithEip712Domain(
  types: Record<string, unknown>,
  domain: Record<string, unknown>,
): Record<string, MessageTypeProperty[]> {
  const out = { ...types } as Record<string, MessageTypeProperty[]>;
  const existing = out.EIP712Domain;
  if (Array.isArray(existing) && existing.length > 0) {
    return out;
  }
  out.EIP712Domain = buildEip712DomainTypeDefinition(domain);
  return out;
}

type SigHex = `0x${string}`;

function parseSignatureResult(result: unknown): SigHex {
  if (typeof result === 'string') {
    const trimmed = result.trim();
    if (trimmed.startsWith('0x')) {
      return trimmed as SigHex;
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === 'string' && parsed.startsWith('0x')) {
        return parsed as SigHex;
      }
    } catch {
      /* ignore */
    }
  }
  throw new Error('TRUST x402: firma EIP-712 inesperada del keyring');
}

/**
 * Wallet thirdweb compatible con `wrapFetchWithPayment`, firmando EIP-712 (USDC EIP-3009)
 * con el flujo Enkrypt (`TypedMessageSigner`).
 */
export function createEnkryptTrustX402Wallet(options: {
  client: ThirdwebClient;
  account: EnkryptAccount;
  network: BaseNetwork;
}): Wallet {
  const { client, account: enkryptAccount, network } = options;

  if (
    evmChainIdToNumber(
      (network as unknown as { chainID: string | number }).chainID,
    ) !== TRUST_FUJI_CHAIN_ID
  ) {
    console.warn(
      'TRUST x402: la red activa no es Avalanche Fuji; el pago USDC x402 puede fallar.',
    );
  }

  const adaptedAccount: Account = {
    address: toChecksumAddress(enkryptAccount.address) as `0x${string}`,

    sendTransaction: async () => {
      throw new Error(
        'TRUST x402: sendTransaction no está soportado en el adaptador Enkrypt',
      );
    },

    signMessage: async ({ message }) => {
      let payload: Buffer;
      if (typeof message === 'string') {
        payload = Buffer.from(message, 'utf8');
      } else if (message && typeof message === 'object' && 'raw' in message) {
        const raw = (message as { raw: string }).raw;
        const hex = String(raw).replace(/^0x/i, '');
        payload = Buffer.from(hex, 'hex');
      } else {
        payload = Buffer.from(JSON.stringify(message), 'utf8');
      }
      const res = await MessageSigner({
        account: enkryptAccount,
        network,
        payload,
      });
      if (res.error) {
        throw new Error(String(res.error));
      }
      return parseSignatureResult(res.result);
    },

    signTypedData: async (typedData) => {
      const td = typedData as {
        types: Record<string, unknown>;
        domain: Record<string, unknown>;
        primaryType: string;
        message: Record<string, unknown>;
      };
      const domain = { ...td.domain };
      const metamaskTypedData = {
        types: mergeTypesWithEip712Domain(td.types, domain),
        domain,
        primaryType: td.primaryType,
        /* Copia superficial: conserva bigint (uint256) como thirdweb/viem. */
        message: { ...td.message } as Record<string, unknown>,
      };
      const res = await TypedMessageSigner({
        account: enkryptAccount,
        network,
        typedData: metamaskTypedData,
        version: 'V4',
      });
      if (res.error) {
        throw new Error(String(res.error));
      }
      return parseSignatureResult(res.result);
    },
  };

  return createWalletAdapter({
    client,
    adaptedAccount,
    chain: avalancheFuji,
    onDisconnect: () => {},
    switchChain: async () => {
      /* Enkrypt ya está en la red de la tx; Fuji es la red de pago x402. */
    },
  });
}
