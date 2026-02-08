// midnight-api.ts - Refactored to follow Echo reference pattern

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
  getConfiguration(): Promise<any>;
}

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
    this.wallet = walletAPI;
    this.config = await walletAPI.getConfiguration();

    const { configureProviders } = await import("./providers");
    
    // Configure providers using the Echo-derived bridge
    this.providers = await configureProviders({
      config: {
        indexer: this.config.indexerUri,
        indexerWS: this.config.indexerWsUri,
        node: this.config.substrateNodeUri,
        proofServer: this.config.proverServerUri,
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

    // Match CLI pattern: use withVacantWitnesses
    // Browser zkConfigProvider (in providers.ts) loads ZK assets via fetch
    this.kycCompiledContract = (CompiledContract.make(
      "kyc",
      this.kycModule.Contract,
    ) as any).pipe(
      (self: any) => (CompiledContract as any).withVacantWitnesses(self)
    );

    console.log("Midnight API initialized with Echo-style providers.");
  }

  /** Connect to an existing deployed contract */
  async findContract(contractAddress: string) {
    if (!this.providers) throw new Error("API not initialized");
    
    const { findDeployedContract } = await import("@midnight-ntwrk/midnight-js-contracts");

    this.kycContract = await findDeployedContract(this.providers, {
      compiledContract: this.kycCompiledContract,
      contractAddress: contractAddress,
      privateStateId: "kycPrivateState",
      initialPrivateState: {},
    } as any);
    
    console.log(`Connected to KYC contract at: ${contractAddress}`);
  }

  /** Deploy a new contract instance */
  async deployNewContract(): Promise<{ contractAddress: string }> {
    if (!this.providers) throw new Error("API not initialized");

    const { deployContract } = await import("@midnight-ntwrk/midnight-js-contracts");

    console.log('=== STARTING CONTRACT DEPLOYMENT ===');
    console.log('1. Loading compiled contract...');
    console.log('   - Compiled contract ready:', !!this.kycCompiledContract);
    
    console.log('2. Preparing providers...');
    console.log('   - Private state provider:', !!this.providers.privateStateProvider);
    console.log('   - Public data provider:', !!this.providers.publicDataProvider);
    console.log('   - ZK config provider:', !!this.providers.zkConfigProvider);
    console.log('   - Proof provider:', !!this.providers.proofProvider);
    console.log('   - Wallet provider:', !!this.providers.walletProvider);
    console.log('   - Midnight provider:', !!this.providers.midnightProvider);
    
    console.log('3. Calling deployContract (this may take 30+ seconds)...');
    console.time('Contract Deployment');
    
    try {
      const deployed = await deployContract(this.providers, {
        compiledContract: this.kycCompiledContract,
        privateStateId: "kycPrivateState",
        initialPrivateState: {},
      } as any);
      
      console.timeEnd('Contract Deployment');
      console.log('4. ✅ Contract deployed successfully!');

      this.kycContract = deployed;
      const address = deployed.deployTxData.public.contractAddress;
      console.log('   - Contract address:', address);
      console.log('   - Deploy TX hash:', deployed.deployTxData.public.txHash);
      console.log('=== DEPLOYMENT COMPLETE ===');

      return { contractAddress: address };
    } catch (error: any) {
      console.timeEnd('Contract Deployment');
      console.error('❌ DEPLOYMENT FAILED');
      console.error('→ Error:', error.message);
      console.error('→ Type:', error.name);
      if (error.stack) {
        console.error('→ Stack (first 10 lines):');
        console.error(error.stack.split('\n').slice(0, 10).join('\n'));
      }
      throw error;
    }
  }

  /** Call the register circuit on the connected contract */
  async callRegisterCircuit(commitment: Uint8Array, walletAddress: Uint8Array): Promise<RegisterResult> {
    if (!this.kycContract) throw new Error("No contract connected");

    console.log("Generating ZK proof and submitting registration...");
    const tx = await this.kycContract.callTx.register(commitment, walletAddress);
    const finalized = await this.providers.midnightProvider.submitTx(tx);
    
    return {
      txHash: finalized.txHash || finalized.public?.txId || "tx_pending",
      contractAddress: this.kycContract.deployTxData.public.contractAddress
    };
  }
  
  /** Prove age eligibility without revealing exact birth year */
  async proveAge(birthYear: number, minAge: number, secret: Uint8Array, walletAddress: Uint8Array) {
    if (!this.kycContract) throw new Error("No contract connected");

    const currentYear = BigInt(new Date().getFullYear());
    const result = await this.kycContract.callTx.prove_age_eligible(
        currentYear, 
        BigInt(birthYear), 
        BigInt(minAge), 
        secret, 
        walletAddress
    );
    return result.public;
  }
}
