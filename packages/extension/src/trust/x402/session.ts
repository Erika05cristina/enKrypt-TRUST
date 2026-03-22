import { createThirdwebClient } from 'thirdweb';
import type { EnkryptAccount } from '@enkryptcom/types';
import type { BaseNetwork } from '@/types/base-network';
import { TRUST_FUJI_CHAIN_ID } from '@/trust/constants';
import { evmChainIdToNumber } from '@/trust/utils/evmChainId';
import { createEnkryptTrustX402Wallet } from './enkryptX402Wallet';
import type { TrustX402Context } from './riskClient';

/**
 * Crea cliente + wallet thirdweb solo en Fuji y si hay `VITE_THIRDWEB_CLIENT_ID`.
 * Importar este módulo con `import()` para no meter thirdweb en el chunk principal.
 */
export function tryCreateTrustX402Session(options: {
  account: EnkryptAccount;
  network: BaseNetwork;
  chainIdDecimal: number;
}): TrustX402Context | undefined {
  const { account, network, chainIdDecimal } = options;
  if (chainIdDecimal !== TRUST_FUJI_CHAIN_ID) {
    return undefined;
  }
  const clientId = (import.meta.env.VITE_THIRDWEB_CLIENT_ID as string | undefined)?.trim();
  if (!clientId) {
    return undefined;
  }
  const client = createThirdwebClient({ clientId });
  const netId = evmChainIdToNumber(
    (network as unknown as { chainID: string | number }).chainID,
  );
  if (netId !== TRUST_FUJI_CHAIN_ID) {
    return undefined;
  }
  return {
    client,
    wallet: createEnkryptTrustX402Wallet({ client, account, network }),
  };
}
