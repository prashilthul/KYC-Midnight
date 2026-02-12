import { createWalletAndMidnightProvider, deploy, register, type WalletContext } from './api.js';
import { initWalletWithSeed, initGenesisSender } from './wallet-utils.js';
import { generateRandomSeed } from '@midnight-ntwrk/wallet-sdk-hd';
import path from 'path';
import { logger } from './api.js';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { type KYCCircuits, type KYCProviders } from './common-types.js';

async function testDeploy() {
  try {
    logger.info('=== STARTING DEPLOYMENT TEST ===');
    
    // Generate test wallet
    const crypto = await import('crypto');
    const seed = crypto.randomBytes(32);
    
    logger.info('Initializing wallet with random seed...');
    const walletBundle = await initWalletWithSeed(seed);
    const { wallet, shieldedSecretKeys, dustSecretKey, unshieldedKeystore } = walletBundle;
    
    const ctx: WalletContext = {
      wallet,
      shieldedSecretKeys,
      dustSecretKey,
      unshieldedKeystore
    };
    
    logger.info('Wallet created and synced!');

    // Use genesis for actual deployment power
    logger.warn('NOTE: We need funds to deploy. Switching to GENESIS wallet for this test.');
    const genesisBundle = await initGenesisSender();
    
    // Create context for Genesis User
    const genesisCtx: WalletContext = {
        wallet: genesisBundle.wallet,
        shieldedSecretKeys: genesisBundle.shieldedSecretKeys,
        dustSecretKey: genesisBundle.dustSecretKey,
        unshieldedKeystore: genesisBundle.unshieldedKeystore
    };

    // Create providers
    const config = {
      indexerUri: 'http://localhost:8088/api/v3/graphql',
      indexerWsUri: 'ws://localhost:8088/api/v3/graphql/ws',
      proverServerUri: 'http://localhost:6300',
    };
    
    // ESM compatible __dirname
    const { fileURLToPath } = await import('url');
    const { dirname, resolve } = await import('path');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    const zkConfigPath = resolve(__dirname, '../../contract/dist/managed/kyc');
    const walletAndMidnightProvider = await createWalletAndMidnightProvider(genesisCtx);
    
    const zkConfigProvider = new NodeZkConfigProvider<KYCCircuits>(zkConfigPath);
    const providers: KYCProviders = {
      privateStateProvider: levelPrivateStateProvider({
        privateStateStoreName: 'kyc-test-deploy-state', // Unique DB
        walletProvider: walletAndMidnightProvider
      }),
      publicDataProvider: indexerPublicDataProvider(config.indexerUri, config.indexerWsUri),
      zkConfigProvider,
      proofProvider: httpClientProofProvider(config.proverServerUri, zkConfigProvider),
      walletProvider: walletAndMidnightProvider,
      midnightProvider: walletAndMidnightProvider
    };
    
    logger.info('Providers configured. Deploying contract...');
    
    // Generate test commitment
    const testSecret = new TextEncoder().encode('test-secret-cli-deploy');
    // WORKAROUND: persistentHash requires runtime type, bypassing for connectivity test
    // const commitment = new Uint8Array(persistentHash(testSecret));
    const dummyPII = {
      fullName: 'Test User',
      birthYear: 1990,
      country: 'india',
      secret: '00'.repeat(32)
    };
    
    // Fix logger signature: (obj, msg) or (msg)
    logger.info({ pii: dummyPII }, 'Test PII generated');
    
    // Deploy contract
    const kycContract = await deploy(providers);
    
    logger.info('✅ Contract deployed successfully!');
    logger.info(`Contract address: ${kycContract.deployTxData.public.contractAddress}`);

    // Initial Registration
    logger.info('Initializing state with register()...');
    const dummyWalletAddr = new Uint8Array(32);
    await register(kycContract, dummyPII, dummyWalletAddr);
    logger.info('✅ Register called successfully!');
    
    logger.info('=== TEST COMPLETED SUCCESSFULLY ===');
    process.exit(0);
    
  } catch (error: any) {
    console.error('❌ TEST FAILED FULL ERROR:', error);
    if (error.cause) console.error('Cause:', error.cause);
    if (error.stack) console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testDeploy();
