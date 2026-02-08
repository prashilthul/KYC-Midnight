import { WalletFacade } from '@midnight-ntwrk/wallet-sdk-facade';
import { DustWallet } from '@midnight-ntwrk/wallet-sdk-dust-wallet';
import { HDWallet } from '@midnight-ntwrk/wallet-sdk-hd';
import { ShieldedWallet } from '@midnight-ntwrk/wallet-sdk-shielded';
import {
  createKeystore,
  InMemoryTransactionHistoryStorage,
  UnshieldedWallet,
} from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
import * as ledger from '@midnight-ntwrk/ledger-v7';
import { unshieldedToken } from '@midnight-ntwrk/ledger-v7';
import * as Rx from 'rxjs';
import type { Config } from './config.js';
import type { WalletContext, KYCProviders } from './api.js';
import { Buffer } from 'buffer';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const zkConfigPath = path.resolve(__dirname, '../../contract/src/managed/kyc');

/**
 * Build a wallet from a hex seed string (64 characters)
 * Following Midnight starter repository pattern
 */
export async function buildWalletFromHexSeed(config: Config, hexSeed: string): Promise<WalletContext> {
  const seedBuffer = Buffer.from(hexSeed, 'hex');
  
  // Create HD wallet from seed
  const hdWalletResult = await HDWallet.fromSeed(seedBuffer);
  
  if (hdWalletResult.type !== 'seedOk') {
    throw new Error('Failed to create HD wallet from seed');
  }
  
  const hdWallet = hdWalletResult.hdWallet;
  
  // Create unshielded wallet
  const unshieldedWallet = await UnshieldedWallet.create({
    nodeUrl: config.midnightNodeUrl,
    indexerUrl: config.indexerUrl,
    indexerWsUrl: config.indexerWebsocketUrl,
    privateKey: hdWallet.privateKeys.unshieldedPrivateKey,
    transactionHistoryStorage: new InMemoryTransactionHistoryStorage(),
  });
  
  // Create shielded wallet
  const shieldedWallet = await ShieldedWallet.create({
    indexerUrl: config.indexerUrl,
    indexerWsUrl: config.indexerWebsocketUrl,
    secretKeys: hdWallet.secretKeys.shieldedSecretKeys,
  });
  
  // Create dust wallet
  const dustWallet = await DustWallet.create({
    indexerUrl: config.indexerUrl,
    indexerWsUrl: config.indexerWebsocketUrl,
    secretKey: hdWallet.secretKeys.dustSecretKey,
  });
  
  // Create wallet facade
  const wallet = new WalletFacade(
    unshieldedWallet,
    shieldedWallet,
    dustWallet,
  );
  
  const unshieldedKeystore = createKeystore(hdWallet.privateKeys.unshieldedPrivateKey);
  
  return {
    wallet,
    shieldedSecretKeys: hdWallet.secretKeys.shieldedSecretKeys,
    dustSecretKey: hdWallet.secretKeys.dustSecretKey,
    unshieldedKeystore,
  };
}

/**
 * Display wallet balances
 */
export async function displayWalletBalances(wallet: WalletFacade): Promise<{ total: string }> {
  const state = await Rx.firstValueFrom(wallet.state().pipe(Rx.filter((s) => s.isSynced)));
  
  const unshieldedBalance = state.unshielded.balances.get(unshieldedToken)?.total ?? 0n;
  const shieldedBalance = state.shielded.balances.total ?? 0n;
  const dustBalance = state.dust.balance ?? 0n;
  
  console.log(`  Unshielded: ${unshieldedBalance} tDUST`);
  console.log(`  Shielded:   ${shieldedBalance} tDUST`);
  console.log(`  Dust:       ${dustBalance} tDUST`);
  
  const total = unshieldedBalance + shieldedBalance + dustBalance;
  
  return { total: `${total} tDUST` };
}

/**
 * Configure all Midnight providers
 */
export async function configureProviders(
  ctx: WalletContext,
  config: Config,
): Promise<KYCProviders> {
  const zkConfigProvider = new NodeZkConfigProvider(zkConfigPath);
  
  return {
    privateStateProvider: levelPrivateStateProvider({}),
    publicDataProvider: indexerPublicDataProvider(config.indexerUrl, config.indexerWebsocketUrl),
    zkConfigProvider: zkConfigProvider,
    proofProvider: httpClientProofProvider(config.proofServerUrl, zkConfigProvider),
    walletProvider: ctx.wallet as any,
    midnightProvider: ctx.wallet as any,
  };
}

/**
 * Close wallet connections
 */
export async function closeWallet(ctx: WalletContext): Promise<void> {
  // Wallet facade handles cleanup internally
  console.log('Closing wallet...');
}
