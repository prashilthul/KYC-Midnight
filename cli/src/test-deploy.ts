import { createWalletAndMidnightProvider, deploy, register, WalletContext } from './api.js';
import { generateRandomSeed, HDWallet, Roles } from '@midnight-ntwrk/wallet-sdk-hd';
import { WalletFacade } from '@midnight-ntwrk/wallet-sdk-facade';
import { DustWallet } from '@midnight-ntwrk/wallet-sdk-dust-wallet';
import { ShieldedWallet } from '@midnight-ntwrk/wallet-sdk-shielded';
import { createKeystore, InMemoryTransactionHistoryStorage, UnshieldedWallet } from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import path from 'path';
import { persistentHash } from '@midnight-ntwrk/compact-runtime';
import { logger } from './api.js';

async function testDeploy() {
  try {
    logger.info('=== STARTING DEPLOYMENT TEST ===');
    
    // Generate test wallet
    const seed = generateRandomSeed();
    const hdWallet = new HDWallet(seed);
    
    const unshieldedKeystore = createKeystore(
      hdWallet.derive(Roles.UnshieldedSigningKey),
      new InMemoryTransactionHistoryStorage()
    );
    
    const shieldedSecretKeys = {
      coinSecretKey: hdWallet.derive(Roles.CoinKey),
      encryptionSecretKey: hdWallet.derive(Roles.EncryptionKey)
    };
    
    const dustSecretKey = hdWallet.derive(Roles.FeeKey);
    
    // Create wallet facade
    const config = {
      indexerUri: 'http://localhost:8080/query',
      indexerWsUri: 'ws://localhost:8080/query',
      substrateNodeUri: 'ws://localhost:9944',
      proverServerUri: 'http://localhost:8081',
    };
    
    const wallet = new WalletFacade(
      new UnshieldedWallet(unshieldedKeystore, config.substrateNodeUri),
      new ShieldedWallet(
        shieldedSecretKeys.coinSecretKey,
        shieldedSecretKeys.encryptionSecretKey,
        config.indexerUri,
        config.indexerWsUri,
        config.substrateNodeUri
      ),
      new DustWallet(dustSecretKey, config.substrateNodeUri)
    );
    
    const ctx: WalletContext = {
      wallet,
      shieldedSecretKeys,
      dustSecretKey,
      unshieldedKeystore
    };
    
    logger.info('Wallet created, syncing...');
    await wallet.start();
    
    // Wait for sync with timeout
    const syncTimeout = 30000; // 30 second timeout
    const startTime = Date.now();
    
    await new Promise((resolve, reject) => {
      const sub = wallet.state().subscribe((state) => {
        if (state.isSynced) {
          logger.info('Wallet synced!');
          sub.unsubscribe();
          resolve(undefined);
        } else if (Date.now() - startTime > syncTimeout) {
          sub.unsubscribe();
          reject(new Error('Wallet sync timeout'));
        }
      });
    });
    
    // Create providers
    const zkConfigPath = path.resolve(__dirname, '../../contract/src/managed/kyc');
    const walletAndMidnightProvider = await createWalletAndMidnightProvider(ctx);
    
    const providers = {
      privateStateProvider: levelPrivateStateProvider({
        privateStateStoreName: 'kyc-test-state',
        walletProvider: walletAndMidnightProvider
      }),
      publicDataProvider: indexerPublicDataProvider(config.indexerUri, config.indexerWsUri),
      zkConfigProvider: new NodeZkConfigProvider(zkConfigPath),
      proofProvider: httpClientProofProvider(config.proverServerUri, new NodeZkConfigProvider(zkConfigPath)),
      walletProvider: walletAndMidnightProvider,
      midnightProvider: walletAndMidnightProvider
    };
    
    logger.info('Providers configured, deploying contract...');
    
    // Generate test commitment
    const testSecret = new TextEncoder().encode('test-secret-12345678901234567890');
    const commitment = new Uint8Array(persistentHash(testSecret));
    
    logger.info('Test commitment:', Buffer.from(commitment).toString('hex'));
    
    // Deploy contract
    const kycContract = await deploy(providers, { kycSecret: testSecret });
    
    logger.info('✅ Contract deployed successfully!');
    logger.info('Contract address:', kycContract.deployTxData.public.contractAddress);
    
    // Call register circuit
    const walletAddressBytes = new Uint8Array(32); // Mock wallet address
    const registerResult = await register(kycContract, commitment, walletAddressBytes);
    
    logger.info('✅ Register circuit executed successfully!');
    logger.info('TX Hash:', registerResult.txHash);
    
    logger.info('=== TEST COMPLETED SUCCESSFULLY ===');
    process.exit(0);
    
  } catch (error: any) {
    logger.error('❌ TEST FAILED:', error);
    logger.error('Error message:', error.message);
    logger.error('Error stack:', error.stack);
    process.exit(1);
  }
}

testDeploy();
