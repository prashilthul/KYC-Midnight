import path from 'path';
import * as fs from 'fs';
import * as readline from 'readline/promises';
import { currentDir, UndeployedConfig } from './config.js';
import { createLogger } from './logger.js';

let logger: Awaited<ReturnType<typeof createLogger>>;

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  🌙 Midnight KYC Deployment Configuration');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const logDir = path.resolve(
      currentDir,
      '..',
      'logs',
      'deploy',
      `${new Date().toISOString().replace(/:/g, '-')}.log`
    );

    logger = await createLogger(logDir);

    console.log('📋 This script creates deployment configuration.\n');
    console.log('⚠️  For full deployment with wallet integration:');
    console.log('   1. Reference the Midnight starter repository');
    console.log('   2. Or use the frontend Lace wallet connection\n');

    const walletChoice = await rl.question(
      'Enter wallet seed for reference (y/n, default: n): '
    );

    let walletSeed: string;

    if (walletChoice.toLowerCase().startsWith('y')) {
      walletSeed = await rl.question(
        'Enter your 64-character hex seed: '
      );

      if (walletSeed.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(walletSeed)) {
        throw new Error('Seed must be exactly 64 hexadecimal characters.');
      }
    } else {
      walletSeed =
        '0000000000000000000000000000000000000000000000000000000000000001';
      console.log('\nUsing genesis seed for local network reference.\n');
    }

    rl.close();

    const config = new UndeployedConfig();

    // Generate a sample KYC commitment
    console.log('🔐 Generating sample commitment...');
    
    const kycSecret = new Uint8Array(32);
    const nodeCrypto = await import('crypto');
    nodeCrypto.randomFillSync(kycSecret);
    
    const hashBuffer = await crypto.subtle.digest('SHA-256', kycSecret);
    const commitment = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const deploymentInfo = {
      status: 'CONFIGURATION_READY',
      network: 'local',
      walletSeedReference: walletSeed.substring(0, 8) + '...' + walletSeed.substring(56),
      sampleCommitment: commitment,
      deployedAt: new Date().toISOString(),
      config: {
        indexerUrl: config.indexerUrl,
        indexerWebsocketUrl: config.indexerWebsocketUrl,
        midnightNodeUrl: config.midnightNodeUrl,
        proofServerUrl: config.proofServerUrl,
      },
      instructions: [
        'This is a configuration template.',
        'For actual deployment:',
        '  Option 1: Use the frontend with Lace Wallet',
        '  Option 2: Implement full wallet SDK following Midnight starter pattern',
        '  Option 3: Reference: https://docs.midnight.network/getting-started/deploy-mn-app',
      ],
    };

    const deploymentPath = path.resolve(
      currentDir,
      '..',
      'deployment-config.json'
    );

    fs.writeFileSync(
      deploymentPath,
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  ✅ CONFIGURATION CREATED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`� Configuration saved at: ${deploymentPath}`);
    console.log(`� Sample Commitment: ${commitment.substring(0, 16)}...`);
    console.log('\n� Next Steps:');
    console.log('   1. Ensure Docker containers are running (docker-compose up -d)');
    console.log('   2. Build the contract (cd contract && npm run build)');
    console.log('   3. Deploy via frontend with Lace Wallet connection');
    console.log('   4. OR implement full wallet SDK (see Midnight starter repo)\n');

    logger.info(deploymentInfo, 'Deployment configuration created');

    process.exit(0);

  } catch (error: any) {
    rl.close();

    console.error('\n❌ CONFIGURATION FAILED\n');
    console.error('Error:', error.message);

    if (logger && error.stack) {
      logger.error({ error: error.stack }, 'Configuration failed');
    }

    process.exit(1);
  }
}

main().catch(console.error);
