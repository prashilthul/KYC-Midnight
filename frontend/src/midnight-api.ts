/**
 * KYC Platform - Midnight API Integration
 */

export interface PII {
  fullName: string;
  birthYear: number;
  country: string;
  secret: string;
}

export interface RegisterResult {
    txHash: string;
    contractAddress: string;
}

export interface MidnightWalletAPI {
  getUnshieldedAddress(): Promise<{ unshieldedAddress: string }>;
  getShieldedAddresses(): Promise<{ 
    shieldedAddress: string;
    shieldedCoinPublicKey: string;
    shieldedEncryptionPublicKey: string;
  }>;
  submitTransaction(tx: unknown): Promise<any>;
  balanceUnsealedTransaction(tx: unknown): Promise<any>;
  proveTransaction(tx: unknown): Promise<any>; // Manual flow method
  getConfiguration(): Promise<any>;
}

const hexToBytes = (hex: string): Uint8Array => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
};

const hashCountry = async (c: string): Promise<Uint8Array> => {
  const msg = new TextEncoder().encode(c.toLowerCase().trim());
  const hash = await window.crypto.subtle.digest('SHA-256', msg);
  return new Uint8Array(hash);
};

export class MidnightDAppAPI {
  private kycModule: any = null;
  private kycCompiledContract: any = null;
  private providers: any = null;
  private kycContract: any = null;
  private wallet: MidnightWalletAPI | null = null;
  private config: any = null;

  constructor() { }

  /** Initialize the API with the Lace wallet instance */
  async initialize(walletAPI: MidnightWalletAPI) {
    const { setNetworkId } = await import("@midnight-ntwrk/midnight-js-network-id");
    setNetworkId('undeployed');
    
    this.wallet = walletAPI;
    this.config = await walletAPI.getConfiguration();

    const { configureProviders } = await import("./providers");
    
    // Configure providers using the Echo-derived bridge
    this.providers = await configureProviders({
      config: {
        indexer: this.config.indexerUri,
        indexerWS: this.config.indexerWsUri,
        node: this.config.substrateNodeUri,
        // Use the Vite proxy with origin to satisfy new URL() parser
        proofServer: `${window.location.origin}/api/proof-server/`, 
      },
      contractName: "kyc",
      wallet: walletAPI,
    });

    // Lazily load the compiled contract module
    if (!this.kycModule) {
      this.kycModule = await import(
        /* webpackIgnore: true */
        "../../contract/dist/managed/kyc/contract/index.js"
      );
    }

    const { CompiledContract } = await import("@midnight-ntwrk/compact-js");
    
    // @ts-ignore
    this.kycCompiledContract = (CompiledContract.make(
      "kyc",
      this.kycModule.Contract,
    ) as any).pipe(
      (self: any) => (CompiledContract as any).withVacantWitnesses(self),
      (self: any) => (CompiledContract as any).withCompiledFileAssets(self, "/")
    );
  }

  /** Connect to an existing deployed contract */
  async findContract(contractAddress: string) {
    if (!this.providers) throw new Error("API not initialized");
    const { findDeployedContract } = await import("@midnight-ntwrk/midnight-js-contracts");
    
    try {
      this.kycContract = await findDeployedContract(this.providers, {
        compiledContract: this.kycCompiledContract,
        contractAddress: contractAddress.trim(), // Ensure no whitespace
        privateStateId: "kycPrivateState",
        initialPrivateState: {},
      } as any);
    } catch (e: any) {
      throw e;
    }
  }

  /** Deploy a new contract instance */
  async deployNewContract(): Promise<any> {
    const { deployContract } = await import("@midnight-ntwrk/midnight-js-contracts");
    const { CompiledContract } = await import("@midnight-ntwrk/compact-js");

    try {
      const deployed = await deployContract(this.providers, {
        privateStateId: "kycPrivateState",
        compiledContract: this.kycCompiledContract,
        initialPrivateState: {},
      } as any);
      
      this.kycContract = deployed;
      
      return {
        contractAddress: deployed.deployTxData.public.contractAddress,
        txHash: deployed.deployTxData.public.txHash,
      };
    } catch (error: any) {
      throw error;
    }
  }

  /** Call the register circuit on the connected contract */
  async callRegisterCircuit(pii: PII, walletAddress: Uint8Array): Promise<RegisterResult> {
    if (!this.kycContract) throw new Error("No contract connected");

    const countryHash = await hashCountry(pii.country);
    const identitySecret = hexToBytes(pii.secret);

    const identity = {
      birth_year: BigInt(pii.birthYear),
      country_hash: countryHash,
      secret: identitySecret
    };
    
    // @ts-ignore
    const result = await this.kycContract.callTx.register(identity, new Uint8Array(walletAddress));
    
    const txHash = result.public?.txId || result.txHash || "tx_completed";
    const contractAddr = this.kycContract.deployTxData?.public?.contractAddress || 
                         this.kycContract.contractAddress || 
                         "unknown_address";

    return {
      txHash: txHash,
      contractAddress: contractAddr
    };
  }
  
  /** Prove age eligibility without revealing exact birth year */
  async proveAge(pii: PII, walletAddress: Uint8Array) {
    if (!this.kycContract) throw new Error("No contract connected");

    const currentYear = BigInt(new Date().getFullYear());
    const minAge = 18n;
    const identity = {
      birth_year: BigInt(pii.birthYear),
      country_hash: await hashCountry(pii.country),
      secret: hexToBytes(pii.secret)
    };

    // @ts-ignore
    const result = await this.kycContract.callTx.prove_age_eligible(currentYear, minAge, identity, new Uint8Array(walletAddress));
    return result.public;
  }

  /** Prove residency in a specific country */
  async proveResidency(pii: PII, walletAddress: Uint8Array) {
    if (!this.kycContract) throw new Error("No contract connected");

    const requiredCountryHash = await hashCountry(pii.country);
    const identity = {
      birth_year: BigInt(pii.birthYear),
      country_hash: await hashCountry(pii.country),
      secret: hexToBytes(pii.secret)
    };

    // @ts-ignore
    const result = await this.kycContract.callTx.prove_residency(requiredCountryHash, identity, new Uint8Array(walletAddress));
    return result.public;
  }
}
