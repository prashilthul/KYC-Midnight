/**
 * KYC Platform - Provider Configuration (SDK v3)
 * Derived from the Echo Reference Repo
 */

import type { MidnightWalletAPI } from "./midnight-api";

export interface NetworkConfig {
  indexer: string;
  indexerWS: string;
  node: string;
  proofServer: string;
}

export async function configureProviders(options: {
  config: NetworkConfig;
  contractName: string;
  wallet: MidnightWalletAPI;
}) {
  const { config, contractName, wallet } = options;

  const { httpClientProofProvider } = await import(
    "@midnight-ntwrk/midnight-js-http-client-proof-provider"
  );
  const { indexerPublicDataProvider } = await import(
    "@midnight-ntwrk/midnight-js-indexer-public-data-provider"
  );
  const { NodeZkConfigProvider } = await import(
    "@midnight-ntwrk/midnight-js-node-zk-config-provider"
  );
  const { levelPrivateStateProvider } = await import(
    "@midnight-ntwrk/midnight-js-level-private-state-provider"
  );

  // Get shielded keys from Lace wallet
  const shieldedResponse = await wallet.getShieldedAddresses();
  console.log("=== WALLET KEYS ===");
  console.log("Coin Public Key:", shieldedResponse.shieldedCoinPublicKey);
  console.log("Encryption Public Key:", shieldedResponse.shieldedEncryptionPublicKey);
  console.log("===================");
  
  const { shieldedCoinPublicKey, shieldedEncryptionPublicKey } = shieldedResponse;

  const walletProvider: any = {
    getCoinPublicKey() {
      console.log("getCoinPublicKey() called, returning:", shieldedCoinPublicKey);
      return shieldedCoinPublicKey;
    },
    getEncryptionPublicKey() {
      console.log("getEncryptionPublicKey() called, returning:", shieldedEncryptionPublicKey);
      return shieldedEncryptionPublicKey;
    },
    async balanceTx(tx: any, ttl?: Date) {
      console.log("=== balanceTx CALLED ===");
      console.log("Input TX type:", typeof tx, "Constructor:", tx?.constructor?.name);
      
      // 1. Serialize WASM object if needed
      let txBytes: Uint8Array;
      if (tx && typeof tx.serialize === 'function') {
        console.log("→ Serializing _Transaction WASM object to bytes");
        const rawBytes = tx.serialize();
        // IMPORTANT: Create a clean Uint8Array copy
        txBytes = new Uint8Array(rawBytes);
        console.log("→ Conversion: WASM -> Serialized -> NEW Uint8Array");
      } else if (tx instanceof Uint8Array) {
         console.log("→ Input is already Uint8Array");
         // IMPORTANT: Create a clean Uint8Array copy
         txBytes = new Uint8Array(tx);
         console.log("→ Conversion: Uint8Array -> NEW Uint8Array (Copy)");
      } else {
        console.error("Unknown TX format:", typeof tx, tx);
        throw new Error("Invalid transaction format");
      }

      console.log("→ Final TX Bytes Size:", txBytes.length);
      console.log("→ Is Uint8Array:", txBytes instanceof Uint8Array);
      console.log("→ Prototype:", Object.getPrototypeOf(txBytes)?.constructor?.name);
      
      // Check for non-standard properties that might cause cloning issues
      const keys = Object.keys(txBytes);
      if (keys.length > txBytes.length) {
          console.warn("⚠️ WARNING: Transaction object has extra properties!", keys.filter(k => isNaN(Number(k))));
      }

      // Strategy 1: Try passing CLEAN Uint8Array directly (Standard)
      try {
        console.log("→ Attempt 1: Calling balanceUnsealedTransaction with CLEAN Uint8Array...");
        console.time('Lace balance attempt 1');
        const result = await wallet.balanceUnsealedTransaction(txBytes);
        console.timeEnd('Lace balance attempt 1');
        console.log("✅ balanceUnsealedTransaction (Uint8Array) succeeded");
        return result;
      } catch (err1: any) {
        console.timeEnd('Lace balance attempt 1');
        console.warn("⚠️ Attempt 1 failed. Error details:", {
            name: err1?.name,
            message: err1?.message, 
            stack: err1?.stack?.split('\n').slice(0, 3)
        });
        
        // Strategy 2: Convert to Hex String (Fallback for some connector versions)
        console.log("→ Attempt 2: Converting to Hex String...");
        const toHex = (buffer: Uint8Array) => 
            Array.from(buffer).map(b => b.toString(16).padStart(2, '0')).join('');
        
        const txHex = toHex(txBytes);
        console.log("→ Hex string length:", txHex.length);
        
        try {
            console.time('Lace balance attempt 2');
            // @ts-ignore
            const result = await wallet.balanceUnsealedTransaction(txHex);
            console.timeEnd('Lace balance attempt 2');
            console.log("✅ balanceUnsealedTransaction (Hex) succeeded");
            return result;
        } catch (err2: any) {
            console.timeEnd('Lace balance attempt 2');
            console.error("❌ Attempt 2 failed. Error details:", {
                name: err2?.name,
                message: err2?.message,
                cause: err2?.cause,
                type: typeof err2
            });
            throw err2; 
        }
      }
    },
  };

  const midnightProvider = {
    async submitTx(tx: any) {
      return wallet.submitTransaction(tx);
    },
  };

  // Create a browser-compatible ZK config provider that uses fetch with logging
  const zkConfigProvider: any = {
    getZKIR: async (c: string) => {
      const url = `/zkir/${c}.zkir`;
      console.log(`📡 Fetching ZKIR for ${c} from ${url}...`);
      try {
        const resp = await fetch(url);
        if (!resp.ok) {
          console.error(`❌ Failed to fetch ZKIR for ${c}: ${resp.status} ${resp.statusText}`);
          throw new Error(`Failed to fetch ZKIR for ${c}: ${resp.statusText}`);
        }
        const buffer = await resp.arrayBuffer();
        console.log(`✅ Loaded ZKIR for ${c} (${buffer.byteLength} bytes)`);
        return new Uint8Array(buffer);
      } catch (err) {
        console.error(`❌ Network error fetching ZKIR for ${c}:`, err);
        throw err;
      }
    },
    getProverKey: async (c: string) => {
      const url = `/keys/${c}.prover`;
      console.log(`📡 Fetching PROVER KEY for ${c} from ${url}...`);
      try {
        const resp = await fetch(url);
        if (!resp.ok) {
          console.error(`❌ Failed to fetch prover key for ${c}: ${resp.status} ${resp.statusText}`);
          throw new Error(`Failed to fetch prover key for ${c}: ${resp.statusText}`);
        }
        const buffer = await resp.arrayBuffer();
        console.log(`✅ Loaded PROVER KEY for ${c} (${buffer.byteLength} bytes)`);
        return new Uint8Array(buffer);
      } catch (err) {
        console.error(`❌ Network error fetching PROVER KEY for ${c}:`, err);
        throw err;
      }
    },
    getVerifierKey: async (c: string) => {
      const url = `/keys/${c}.verifier`;
      console.log(`📡 Fetching VERIFIER KEY for ${c} from ${url}...`);
      try {
        const resp = await fetch(url);
        if (!resp.ok) {
          console.error(`❌ Failed to fetch verifier key for ${c}: ${resp.status} ${resp.statusText}`);
          throw new Error(`Failed to fetch verifier key for ${c}: ${resp.statusText}`);
        }
        const buffer = await resp.arrayBuffer();
        console.log(`✅ Loaded VERIFIER KEY for ${c} (${buffer.byteLength} bytes)`);
        return new Uint8Array(buffer);
      } catch (err) {
        console.error(`❌ Network error fetching VERIFIER KEY for ${c}:`, err);
        throw err;
      }
    },
    getVerifierKeys: async (c: string) => {
       const key = await zkConfigProvider.getVerifierKey(c);
       return [key];
    },
    asKeyMaterialProvider: () => zkConfigProvider,
  };

  return {
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: `kyc-${contractName}-state`,
      walletProvider,
    }),

    publicDataProvider: indexerPublicDataProvider(
      config.indexer,
      config.indexerWS,
    ),

    zkConfigProvider,

    proofProvider: httpClientProofProvider(config.proofServer, zkConfigProvider),

    walletProvider,

    midnightProvider,
  };
}
