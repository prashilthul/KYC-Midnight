import { WalletFacade } from '@midnight-ntwrk/wallet-sdk-facade';
import { DustWallet, type DefaultV1Configuration as DustConfiguration } from '@midnight-ntwrk/wallet-sdk-dust-wallet';
import { HDWallet, Roles, generateRandomSeed } from '@midnight-ntwrk/wallet-sdk-hd';
import { ShieldedWallet } from '@midnight-ntwrk/wallet-sdk-shielded';
import type { DefaultV1Configuration as ShieldedConfiguration } from '@midnight-ntwrk/wallet-sdk-shielded/v1';
import {
  createKeystore,
  InMemoryTransactionHistoryStorage,
  PublicKey,
  UnshieldedWallet,
} from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
import * as ledger from '@midnight-ntwrk/ledger-v7';
import { unshieldedToken } from '@midnight-ntwrk/ledger-v7';
import * as Rx from 'rxjs';
import type { Config } from './config.js';
import { createWalletAndMidnightProvider, deploy, register, type WalletContext } from './api.js';
import { Buffer } from 'buffer';

/**
 * Configure all Midnight providers
 * Aligning with scripts/wallet-utils.ts pattern
 */
export function getWalletConfig(config: Config) {
  const networkId = 'undeployed';
  return {
    networkId,
    relayURL: new URL(config.midnightNodeUrl.replace(/^http/, 'ws')),
    provingServerUrl: new URL(config.proofServerUrl),
    indexerClientConnection: {
      indexerHttpUrl: config.indexerUrl,
      indexerWsUrl: config.indexerWebsocketUrl,
    },
    indexerUrl: config.indexerWebsocketUrl,
    costParameters: {
      additionalFeeOverhead: 300_000_000_000_000n,
      feeBlocksMargin: 5,
    },
  } as ShieldedConfiguration & DustConfiguration & { indexerUrl: string };
}

/**
 * Build a wallet from a Buffer seed
 */
export async function initWalletWithSeed(seed: Buffer, config?: Config): Promise<WalletContext> {
  const hdWallet = HDWallet.fromSeed(seed);
  if (hdWallet.type !== 'seedOk') {
    throw new Error('Failed to create HD wallet from seed');
  }
  
  const keys = hdWallet.hdWallet
    .selectAccount(0)
    .selectRoles([Roles.Zswap, Roles.NightExternal, Roles.Dust])
    .deriveKeysAt(0);

  if (keys.type !== 'keysDerived') {
    throw new Error('Failed to derive keys from HD wallet');
  }

  const networkId = 'undeployed';
  const shieldedSecretKeys = ledger.ZswapSecretKeys.fromSeed(keys.keys[Roles.Zswap]);
  const dustSecretKey = ledger.DustSecretKey.fromSeed(keys.keys[Roles.Dust]);
  const unshieldedKeystore = createKeystore(keys.keys[Roles.NightExternal], networkId);

  // Default config if not provided
  const walletConfig = getWalletConfig(config ?? {
    midnightNodeUrl: 'http://localhost:9944',
    indexerUrl: 'http://localhost:8088/api/v3/graphql',
    indexerWebsocketUrl: 'ws://localhost:8088/api/v3/graphql/ws',
    proofServerUrl: 'http://localhost:6300',
  } as Config);

  const shieldedWallet = ShieldedWallet(walletConfig).startWithSecretKeys(shieldedSecretKeys);
  const unshieldedWallet = UnshieldedWallet({
    ...walletConfig,
    txHistoryStorage: new InMemoryTransactionHistoryStorage(),
  }).startWithPublicKey(PublicKey.fromKeyStore(unshieldedKeystore));
  const dustWallet = DustWallet(walletConfig).startWithSecretKey(
    dustSecretKey,
    ledger.LedgerParameters.initialParameters().dust,
  );

  const wallet = new WalletFacade(shieldedWallet, unshieldedWallet, dustWallet);
  await wallet.start(shieldedSecretKeys, dustSecretKey);
  
  return {
    wallet,
    shieldedSecretKeys,
    dustSecretKey,
    unshieldedKeystore,
  };
}

/**
 * Build a wallet from a hex seed string (64 characters)
 * Aligning with Echo and Project Script patterns
 */
export async function buildWalletFromHexSeed(config: Config, hexSeed: string): Promise<WalletContext> {
  return initWalletWithSeed(Buffer.from(hexSeed, 'hex'), config);
}

/**
 * Initialize Genesis sender
 */
export async function initGenesisSender(config?: Config): Promise<WalletContext> {
  const genesisSeed = Buffer.from('0000000000000000000000000000000000000000000000000000000000000001', 'hex');
  const ctx = await initWalletWithSeed(genesisSeed, config);
  await Rx.firstValueFrom(ctx.wallet.state().pipe(Rx.filter(s => s.isSynced)));
  return ctx;
}

/**
 * Display wallet balances
 */
export async function displayWalletBalances(wallet: WalletFacade): Promise<{ total: bigint }> {
  const state = await Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.filter((s) => s.isSynced),
      Rx.take(1)
    )
  );
  
  const tokenRaw = unshieldedToken().raw;
  const unshieldedBalance = state.unshielded.balances[tokenRaw] ?? 0n;
  const dustBalance = state.dust.walletBalance(new Date());
  
  console.log(`  Unshielded: ${unshieldedBalance.toLocaleString()} tNIGHT`);
  console.log(`  Dust:       ${dustBalance.toLocaleString()} DUST`);
  
  return { total: unshieldedBalance };
}

/**
 * Close wallet connections
 */
export async function closeWallet(ctx: WalletContext): Promise<void> {
  await ctx.wallet.stop();
  console.log('Wallet stopped.');
}
