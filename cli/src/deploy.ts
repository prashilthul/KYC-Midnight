import path from 'path';
import * as fs from 'fs';
import * as api from './api.js';
import { localConfig, UndeployedConfig } from './config.js';
import { buildWalletFromHexSeed, displayWalletBalances } from './wallet-utils.js';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

import { KYCCircuits } from './common-types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const zkConfigPath = path.resolve(__dirname, '../../contract/dist/managed/kyc');

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  🌙 Midnight KYC Functional Deployment');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const config = new UndeployedConfig();
    setNetworkId('undeployed');
    
    // 1. Wallet Setup (Genesis seed for local network)
    const walletSeed = '0000000000000000000000000000000000000000000000000000000000000001';
    console.log('📦 Initializing genesis wallet...');
    const walletCtx = await buildWalletFromHexSeed(config, walletSeed);
    
    console.log('🔄 Syncing wallet...');
    await displayWalletBalances(walletCtx.wallet);

    // 2. Configure Providers
    console.log('⚙️  Configuring providers...');
    const zkConfigProvider = new NodeZkConfigProvider<KYCCircuits>(zkConfigPath);
    const walletAndMidnightProvider = await api.createWalletAndMidnightProvider(walletCtx);
    
    const providers: api.KYCProviders = {
      privateStateProvider: levelPrivateStateProvider({
        privateStateStoreName: 'kyc-cli-deployment-state',
        walletProvider: walletAndMidnightProvider,
      }),
      publicDataProvider: indexerPublicDataProvider(config.indexerUrl, config.indexerWebsocketUrl),
      zkConfigProvider,
      proofProvider: httpClientProofProvider(config.proofServerUrl, zkConfigProvider),
      walletProvider: walletAndMidnightProvider,
      midnightProvider: walletAndMidnightProvider,
    };

    // 3. Deployment
    console.log('🚀 Deploying KYC contract...');
    
    const kycContract = await api.deploy(providers);
    const contractAddress = kycContract.deployTxData.public.contractAddress;

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  ✅ DEPLOYMENT SUCCESSFUL');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`📍 Contract Address: ${contractAddress}`);
    console.log(`📜 Transaction ID:  ${kycContract.deployTxData.public.txId}`);
    console.log('\n👉 ACTION REQUIRED:');
    console.log(`   Update frontend/.env.local with:`);
    console.log(`   VITE_CONTRACT_ADDRESS=${contractAddress}\n`);

    // 4. Save deployment info for reference
    const deploymentPath = path.resolve(__dirname, '..', 'deployment-info.json');
    fs.writeFileSync(deploymentPath, JSON.stringify({
      contractAddress,
      network: 'undeployed',
      deployedAt: new Date().toISOString(),
      txId: kycContract.deployTxData.public.txId
    }, null, 2));

    await walletCtx.wallet.stop();
    process.exit(0);

  } catch (error: any) {
    console.error('\n❌ DEPLOYMENT FAILED\n');
    console.error('Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main().catch(console.error);
