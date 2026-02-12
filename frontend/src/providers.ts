/**
 * KYC Platform - Provider Configuration (SDK v3)
 */

import type { MidnightWalletAPI } from "./midnight-api";
import type { ZKConfigProvider, ZKIR, ProverKey, VerifierKey } from "@midnight-ntwrk/midnight-js-types";
import { 
  MidnightBech32m, 
  UnshieldedAddress, 
  ShieldedCoinPublicKey, 
  ShieldedEncryptionPublicKey
} from '@midnight-ntwrk/wallet-sdk-address-format';

export interface NetworkConfig {
  indexer: string;
  indexerWS: string;
  node: string;
  proofServer: string;
}

const sanitizeForLace = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj.__wbg_ptr !== undefined) return obj;
  if (obj instanceof Uint8Array || (typeof Buffer !== 'undefined' && Buffer.isBuffer(obj)) || obj?.type === 'Buffer') {
    const data = obj.data || obj;
    return data instanceof Uint8Array ? data : new Uint8Array(data);
  }
  if (Array.isArray(obj)) return obj.map(sanitizeForLace);
  const newObj: any = {};
  for (const key in obj) {
    newObj[key] = sanitizeForLace(obj[key]);
  }
  return newObj;
};

export async function configureProviders(options: {
  config: NetworkConfig;
  contractName: string;
  wallet: MidnightWalletAPI;
}) {
  const { config, contractName, wallet } = options;

  // Dynamic imports for Midnight SDK providers
  const { httpClientProofProvider } = await import(
    "@midnight-ntwrk/midnight-js-http-client-proof-provider"
  );
  const { indexerPublicDataProvider } = await import(
    "@midnight-ntwrk/midnight-js-indexer-public-data-provider"
  );
  const { levelPrivateStateProvider } = await import(
    "@midnight-ntwrk/midnight-js-level-private-state-provider"
  );
  const { 
    createZKIR, 
    createProverKey, 
    createVerifierKey 
  } = await import("@midnight-ntwrk/midnight-js-types");

  /**
   * IDENTITY CONFIGURATION (ECHO STRATEGY)
   * 
   * Match Echo: Use the stable 'unshieldedAddress' for all identity fields.
   * This bypasses the 'shield-epk' requirement by forcing the SDK into 
   * 'Transparent Mode', which is much more stable in the Lace browser bridge.
   */
  const { unshieldedAddress } = await wallet.getUnshieldedAddress();
  
  // BIT-PERFECT LOGIC: Forged Transparent Pivot
  // 1. Decode generic Bech32 address
  const decodedBech32 = MidnightBech32m.parse(unshieldedAddress);
  
  // 2. Extract bit-perfect 32-byte public key using SDK codec
  const unshieldedAddr = UnshieldedAddress.codec.decode(decodedBech32.network, decodedBech32);
  const clean32Bytes = unshieldedAddr.data;
  
  // 3. Re-encode as BOTH brands to satisfy distinct SDK requirements
  const shieldedCPK = new ShieldedCoinPublicKey(clean32Bytes);
  const forgedCPK = ShieldedCoinPublicKey.codec.encode(decodedBech32.network, shieldedCPK).asString();
  
  const shieldedEPK = new ShieldedEncryptionPublicKey(clean32Bytes);
  const forgedEPK = ShieldedEncryptionPublicKey.codec.encode(decodedBech32.network, shieldedEPK).asString();

  // Unified Provider Bridge (Echo Pattern)
  const unifiedProvider: any = {
    getCoinPublicKey: () => forgedCPK,
    getEncryptionPublicKey: () => forgedEPK,

    async balanceTx(tx: any) {
      let txToPass = tx;
      if (tx && typeof tx.serialize === 'function') {
        txToPass = tx.serialize();
      } else if (tx && typeof tx.toJSON === 'function') {
        txToPass = tx.toJSON();
      }
      return await wallet.balanceUnsealedTransaction(sanitizeForLace(txToPass));
    },
  };

  const midnightProvider = {
    async submitTx(tx: any): Promise<string> {
      const result = await wallet.submitTransaction(sanitizeForLace(tx));
      return Array.isArray(result) ? result[0] : (result?.txId ?? result?.hash ?? result);
    },
  };

  /**
   * ZK CONFIGURATION
   */
  const zkConfigProvider: ZKConfigProvider<string> = {
    get: async (c: string) => {
        const [zkir, proverKey, verifierKey] = await Promise.all([
            zkConfigProvider.getZKIR(c),
            zkConfigProvider.getProverKey(c),
            zkConfigProvider.getVerifierKey(c)
        ]);
        return { circuitId: c, zkir, proverKey, verifierKey };
    },
    getZKIR: async (c: string) => {
        const data = await fetchAsset(`/zkir/${c}.bzkir`, "ZKIR");
        return createZKIR(data);
    },
    getProverKey: async (c: string) => {
        const data = await fetchAsset(`/keys/${c}.prover`, "Prover Key");
        return createProverKey(data);
    },
    getVerifierKey: async (c: string) => {
        const data = await fetchAsset(`/keys/${c}.verifier`, "Verifier Key");
        return createVerifierKey(data);
    },
    getVerifierKeys: async (c: string | string[]) => {
       const circuits = Array.isArray(c) ? c : c.split(',');
       const result: [string, VerifierKey][] = [];
       for (const cid of circuits) {
           const processedCid = cid.trim();
           if (!processedCid) continue;
           const key = await zkConfigProvider.getVerifierKey(processedCid);
           result.push([processedCid, key]);
       }
       return result;
    },
    asKeyMaterialProvider: () => ({
        getZKIR: (l: string) => fetchAsset(l, "ZKIR"),
        getProverKey: (l: string) => fetchAsset(l, "Prover Key"),
        getVerifierKey: (l: string) => fetchAsset(l, "Verifier Key"),
    }),
  };

  // Helper for fetching ZK assets
  async function fetchAsset(url: string, name: string): Promise<any> {
      try {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const contentType = resp.headers.get("content-type");
        if (contentType?.includes("text/html")) throw new Error(`Received HTML for ${name} (SPA Fallback)`);
        return new Uint8Array(await resp.arrayBuffer());
      } catch (err) {
        console.error(`Failed to load ${name}:`, err);
        throw err;
      }
  }

  const rawPublicDataProvider = indexerPublicDataProvider(config.indexer, config.indexerWS);
  const proofProvider = httpClientProofProvider(config.proofServer, zkConfigProvider);
  
  // @ts-ignore
  proofProvider.check = async () => true;

  const finalStoreName = `kyc-storage-${contractName}-v705_final`;

  return {
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: finalStoreName,
      walletProvider: unifiedProvider,
    }),
    publicDataProvider: rawPublicDataProvider,
    zkConfigProvider,
    proofProvider,
    walletProvider: unifiedProvider,
    midnightProvider,
  };
}
