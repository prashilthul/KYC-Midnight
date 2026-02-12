import { type ContractAddress } from '@midnight-ntwrk/compact-runtime';
import { KYC } from '@confidential-kyc/contract';
import * as ledger from '@midnight-ntwrk/ledger-v7';
import { unshieldedToken } from '@midnight-ntwrk/ledger-v7';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { type FinalizedTxData, type MidnightProvider, type WalletProvider } from '@midnight-ntwrk/midnight-js-types';
import { WalletFacade } from '@midnight-ntwrk/wallet-sdk-facade';
import { DustWallet } from '@midnight-ntwrk/wallet-sdk-dust-wallet';
import { HDWallet, Roles, generateRandomSeed } from '@midnight-ntwrk/wallet-sdk-hd';
import { ShieldedWallet } from '@midnight-ntwrk/wallet-sdk-shielded';
import {
  createKeystore,
  InMemoryTransactionHistoryStorage,
  PublicKey,
  UnshieldedWallet,
  type UnshieldedKeystore,
} from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
import { type Logger } from 'pino';
import * as Rx from 'rxjs';
import { WebSocket } from 'ws';
import {
  type KYCCircuits,
  type KYCContract,
  type KYCPrivateStateId,
  type KYCProviders,
  type DeployedKYCContract,
} from './common-types.js';
import { type Config } from './config.js';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { assertIsContractAddress, toHex } from '@midnight-ntwrk/midnight-js-utils';
import { getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { CompiledContract } from '@midnight-ntwrk/compact-js';
import { Buffer } from 'buffer';
import {
  MidnightBech32m,
  ShieldedAddress,
  ShieldedCoinPublicKey,
  ShieldedEncryptionPublicKey,
  UnshieldedAddress,
} from '@midnight-ntwrk/wallet-sdk-address-format';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'url';
import * as bip39 from 'bip39';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import * as crypto from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_FILE = 'contract_address.json';
const PII_FILE = 'pii_data.json';
const GENESIS_SEED = '0000000000000000000000000000000000000000000000000000000000000001';

export interface PII {
  fullName: string;
  birthYear: number;
  country: string; // "india", "usa", etc.
  secret: string; // Hex secret
}

const hashCountry = (country: string): Buffer => {
  return crypto.createHash('sha256').update(country.toLowerCase().trim()).digest();
};

const savePII = (pii: PII) => {
  fs.writeFileSync(PII_FILE, JSON.stringify(pii, null, 2));
};

export const loadPII = (): PII | null => {
  if (!fs.existsSync(PII_FILE)) return null;
  return JSON.parse(fs.readFileSync(PII_FILE, 'utf-8'));
};

const saveContractAddress = (address: string) => {
  fs.writeFileSync(STATE_FILE, JSON.stringify({ address }, null, 2));
};

export const loadContractAddress = (): string | null => {
  if (!fs.existsSync(STATE_FILE)) return null;
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')).address;
};

export let logger: Logger;

export function setLogger(_logger: Logger) {
  logger = _logger;
}

// @ts-expect-error: WebSocket type mismatch is expected in Node environment
globalThis.WebSocket = WebSocket;

// Pre-compile the contract with ZK circuit assets
const zkConfigPath = path.resolve(__dirname, '../../contract/dist/managed/kyc');
const kycCompiledContract = CompiledContract.make('kyc', KYC.Contract).pipe(
  CompiledContract.withVacantWitnesses,
  CompiledContract.withCompiledFileAssets(zkConfigPath),
);

export interface WalletContext {
  wallet: WalletFacade;
  shieldedSecretKeys: ledger.ZswapSecretKeys;
  dustSecretKey: ledger.DustSecretKey;
  unshieldedKeystore: UnshieldedKeystore;
}

export const joinContract = async (
  providers: KYCProviders,
  contractAddress: string,
): Promise<DeployedKYCContract> => {
  const kycContract = await findDeployedContract(providers, {
    contractAddress,
    compiledContract: kycCompiledContract,
    privateStateId: 'kycPrivateState',
    initialPrivateState: {},
  });
  logger.info(`Joined KYC contract at address: ${kycContract.deployTxData.public.contractAddress}`);
  return kycContract as any;
};

export const deploy = async (
  providers: KYCProviders,
): Promise<DeployedKYCContract> => {
  logger.info('Deploying KYC contract...');
  const kycContract = await deployContract(providers, {
    compiledContract: kycCompiledContract,
    privateStateId: 'kycPrivateState',
    initialPrivateState: {},
  });
  const address = kycContract.deployTxData.public.contractAddress;
  logger.info(`Deployed KYC contract at address: ${address}`);
  saveContractAddress(address);
  return kycContract as any;
};

export const registerCommitment = async (kycContract: DeployedKYCContract, pii: PII, walletAddr: Uint8Array): Promise<FinalizedTxData> => {
  logger.info(`Registering commitment for ${pii.fullName} from ${pii.country}...`);
  const identity = {
    birth_year: BigInt(pii.birthYear),
    country_hash: hashCountry(pii.country),
    secret: Buffer.from(pii.secret, 'hex')
  };
  
  // @ts-ignore
  const finalizedTxData = await kycContract.callTx.register(identity, walletAddr);
  logger.info(`Commitment registered: Transaction ${finalizedTxData.public.txId}`);
  savePII(pii);
  return finalizedTxData.public;
};

export const proveAgeEligible = async (kycContract: DeployedKYCContract, pii: PII, walletAddr: Uint8Array): Promise<FinalizedTxData> => {
  logger.info('Generating age eligibility proof...');
  const currentYear = BigInt(new Date().getFullYear());
  const minAge = 18n;
  const identity = {
    birth_year: BigInt(pii.birthYear),
    country_hash: hashCountry(pii.country),
    secret: Buffer.from(pii.secret, 'hex')
  };
  
  // @ts-ignore
  const finalizedTxData = await kycContract.callTx.prove_age_eligible(currentYear, minAge, identity, walletAddr);
  logger.info(`Age eligibility proved: Transaction ${finalizedTxData.public.txId}`);
  return finalizedTxData.public;
};

export const proveResidency = async (kycContract: DeployedKYCContract, pii: PII, walletAddr: Uint8Array): Promise<FinalizedTxData> => {
  logger.info(`Generating residency proof for ${pii.country}...`);
  const requiredCountryHash = hashCountry(pii.country);
  const identity = {
    birth_year: BigInt(pii.birthYear),
    country_hash: hashCountry(pii.country),
    secret: Buffer.from(pii.secret, 'hex')
  };
  
  // @ts-ignore
  const finalizedTxData = await kycContract.callTx.prove_residency(new Uint8Array(requiredCountryHash), identity, walletAddr);
  logger.info(`Residency proved: Transaction ${finalizedTxData.public.txId}`);
  return finalizedTxData.public;
};

const signTransactionIntents = (
  tx: { intents?: Map<number, any> },
  signFn: (payload: Uint8Array) => ledger.Signature,
  proofMarker: 'proof' | 'pre-proof',
): void => {
  if (!tx.intents || tx.intents.size === 0) return;
  for (const segment of tx.intents.keys()) {
    const intent = tx.intents.get(segment);
    if (!intent) continue;
    const cloned = ledger.Intent.deserialize<ledger.SignatureEnabled, ledger.Proofish, ledger.PreBinding>(
      'signature',
      proofMarker,
      'pre-binding',
      intent.serialize(),
    );
    const sigData = cloned.signatureData(segment);
    const signature = signFn(sigData);
    if (cloned.fallibleUnshieldedOffer) {
      const sigs = cloned.fallibleUnshieldedOffer.inputs.map(
        (_: ledger.UtxoSpend, i: number) => cloned.fallibleUnshieldedOffer!.signatures.at(i) ?? signature,
      );
      cloned.fallibleUnshieldedOffer = cloned.fallibleUnshieldedOffer.addSignatures(sigs);
    }
    if (cloned.guaranteedUnshieldedOffer) {
      const sigs = cloned.guaranteedUnshieldedOffer.inputs.map(
        (_: ledger.UtxoSpend, i: number) => cloned.guaranteedUnshieldedOffer!.signatures.at(i) ?? signature,
      );
      cloned.guaranteedUnshieldedOffer = cloned.guaranteedUnshieldedOffer.addSignatures(sigs);
    }
    tx.intents.set(segment, cloned);
  }
};

export const createWalletAndMidnightProvider = async (
  ctx: WalletContext,
): Promise<WalletProvider & MidnightProvider> => {
  const syncedState = await Rx.firstValueFrom(ctx.wallet.state().pipe(Rx.filter((s) => s.isSynced)));
  
  const addressStr = ctx.unshieldedKeystore.getBech32Address().toString();
  const decoded = MidnightBech32m.parse(addressStr);
  const unshieldedAddr = UnshieldedAddress.codec.decode(decoded.network, decoded);
  const clean32Bytes = unshieldedAddr.data;
  
  const shieldedCPK = new ShieldedCoinPublicKey(clean32Bytes);
  const forgedCPK = ShieldedCoinPublicKey.codec.encode(decoded.network, shieldedCPK).asString();
  
  const shieldedEPK = new ShieldedEncryptionPublicKey(clean32Bytes);
  const forgedEPK = ShieldedEncryptionPublicKey.codec.encode(decoded.network, shieldedEPK).asString();

  return {
    getCoinPublicKey() {
      return forgedCPK;
    },
    getEncryptionPublicKey() {
      return forgedEPK;
    },
    async balanceTx(tx, ttl?) {
      const recipe = await ctx.wallet.balanceUnboundTransaction(
        tx,
        { shieldedSecretKeys: ctx.shieldedSecretKeys, dustSecretKey: ctx.dustSecretKey },
        { ttl: ttl ?? new Date(Date.now() + 30 * 60 * 1000) },
      );
      const signFn = (payload: Uint8Array) => ctx.unshieldedKeystore.signData(payload);
      signTransactionIntents(recipe.baseTransaction, signFn, 'proof');
      if (recipe.balancingTransaction) {
        signTransactionIntents(recipe.balancingTransaction, signFn, 'pre-proof');
      }
      return ctx.wallet.finalizeRecipe(recipe);
    },
    submitTx(tx) {
      return ctx.wallet.submitTransaction(tx) as any;
    },
  };
};

export const waitForSync = (wallet: WalletFacade) =>
  Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.throttleTime(5_000),
      Rx.filter((state) => state.isSynced),
    ),
  );

export const waitForFunds = (wallet: WalletFacade): Promise<bigint> =>
  Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.throttleTime(10_000),
      Rx.filter((state) => state.isSynced),
      Rx.map((s) => s.unshielded.balances[unshieldedToken().raw] ?? 0n),
      Rx.filter((balance) => balance > 0n),
    ),
  );

export const waitForDust = (wallet: WalletFacade): Promise<bigint> =>
  Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.throttleTime(10_000),
      Rx.filter((state) => state.isSynced),
      Rx.map((s) => s.dust.walletBalance(new Date())),
      Rx.filter((balance) => balance > 0n),
    ),
  );

const buildShieldedConfig = (config: Config) => ({
  networkId: getNetworkId(),
  indexerClientConnection: {
    indexerHttpUrl: config.indexerUrl,
    indexerWsUrl: config.indexerWebsocketUrl,
  },
  provingServerUrl: new URL(config.proofServerUrl),
  relayURL: new URL(config.midnightNodeUrl.replace(/^http/, 'ws')),
});

const buildUnshieldedConfig = (config: Config) => ({
  networkId: getNetworkId(),
  indexerClientConnection: {
    indexerHttpUrl: config.indexerUrl,
    indexerWsUrl: config.indexerWebsocketUrl,
  },
  txHistoryStorage: new InMemoryTransactionHistoryStorage(),
});

const buildDustConfig = (config: Config) => ({
  networkId: getNetworkId(),
  costParameters: {
    additionalFeeOverhead: 300_000_000_000_000n,
    feeBlocksMargin: 5,
  },
  indexerClientConnection: {
    indexerHttpUrl: config.indexerUrl,
    indexerWsUrl: config.indexerWebsocketUrl,
  },
  provingServerUrl: new URL(config.proofServerUrl),
  relayURL: new URL(config.midnightNodeUrl.replace(/^http/, 'ws')),
});

const deriveKeysFromSeed = (seed: string) => {
  const hdWallet = HDWallet.fromSeed(Buffer.from(seed, 'hex'));
  if (hdWallet.type !== 'seedOk') {
    throw new Error('Failed to initialize HDWallet from seed');
  }
  const derivationResult = hdWallet.hdWallet
    .selectAccount(0)
    .selectRoles([Roles.Zswap, Roles.NightExternal, Roles.Dust])
    .deriveKeysAt(0);
  if (derivationResult.type !== 'keysDerived') {
    throw new Error('Failed to derive keys');
  }
  hdWallet.hdWallet.clear();
  return derivationResult.keys;
};

export const autoFundNIGHT = async (config: Config, targetAddress: string) => {
  await withStatus('Auto-funding NIGHT from Genesis', async () => {
    const keys = deriveKeysFromSeed(GENESIS_SEED);
    const shieldedSecretKeys = ledger.ZswapSecretKeys.fromSeed(keys[Roles.Zswap]);
    const dustSecretKey = ledger.DustSecretKey.fromSeed(keys[Roles.Dust]);
    const unshieldedKeystore = createKeystore(keys[Roles.NightExternal], getNetworkId());
    
    const shieldedWallet = ShieldedWallet(buildShieldedConfig(config)).startWithSecretKeys(shieldedSecretKeys);
    const unshieldedWallet = UnshieldedWallet(buildUnshieldedConfig(config)).startWithPublicKey(
      PublicKey.fromKeyStore(unshieldedKeystore),
    );
    const dustWallet = DustWallet(buildDustConfig(config)).startWithSecretKey(
      dustSecretKey,
      ledger.LedgerParameters.initialParameters().dust,
    );
    
    const genesisWallet = new WalletFacade(shieldedWallet, unshieldedWallet, dustWallet);
    await genesisWallet.start(shieldedSecretKeys, dustSecretKey);
    await waitForSync(genesisWallet);
    
    const recipe = await genesisWallet.transferTransaction(
      [
        {
          type: 'unshielded',
          outputs: [
            {
              receiverAddress: targetAddress,
              amount: 200_000_000_000n, // 0.2 NIGHT
              type: ledger.unshieldedToken().raw,
            },
          ],
        },
      ],
      { shieldedSecretKeys, dustSecretKey },
      { ttl: new Date(Date.now() + 10 * 60 * 1000), payFees: true },
    );
    
    const signedTx = await genesisWallet.signUnprovenTransaction(
      recipe.transaction,
      (payload) => unshieldedKeystore.signData(payload),
    );
    
    const finalizedTx = await genesisWallet.finalizeTransaction(signedTx);
    await genesisWallet.submitTransaction(finalizedTx);
    await genesisWallet.stop();
  });
};

export const autoFundDust = async (wallet: WalletFacade, unshieldedKeystore: UnshieldedKeystore) => {
  await withStatus('Registering for Dust generation', async () => {
    const state = await Rx.firstValueFrom(wallet.state().pipe(Rx.filter(s => s.isSynced)));
    const unshieldedPublicKey = unshieldedKeystore.getPublicKey();
    const dustReceiverAddress = state.dust.dustAddress;
    
    const utxos = state.unshielded.availableCoins.map(coin => ({
      ...coin.utxo,
      ctime: new Date(coin.meta.ctime)
    }));
    
    const registerTx = await wallet.dust.createDustGenerationTransaction(
        new Date(),
        new Date(Date.now() + 10 * 60 * 1000),
        utxos,
        unshieldedPublicKey,
        dustReceiverAddress
    );
    
    const intent = registerTx.intents?.get(1);
    if (!intent) throw new Error('Dust generation intent not found');
    
    const signature = unshieldedKeystore.signData(intent.signatureData(1));
    const recipe = await wallet.dust.addDustGenerationSignature(registerTx, signature);
    const finalizedTx = await wallet.finalizeTransaction(recipe);
    await wallet.submitTransaction(finalizedTx);
  });
};

export const withStatus = async <T>(message: string, fn: () => Promise<T>): Promise<T> => {
  const C = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    cyan: '\x1b[36m'
  };
  const frames = ['-', '\\', '|', '/'];
  let i = 0;
  const interval = setInterval(() => {
    process.stdout.write(`\r  ${C.cyan}${frames[i++ % frames.length]}${C.reset} ${message}`);
  }, 80);
  try {
    const result = await fn();
    clearInterval(interval);
    process.stdout.write(`\r  ${C.green}[+]${C.reset} ${message}\n`);
    return result;
  } catch (e) {
    clearInterval(interval);
    process.stdout.write(`\r  ${C.red}[-]${C.reset} ${message}\n`);
    throw e;
  }
};

export const buildWalletAndWaitForFunds = async (config: Config, seedOrMnemonic: string): Promise<WalletContext> => {
  const trimmed = seedOrMnemonic.trim();
  const isHex = /^[0-9a-fA-F]+$/.test(trimmed);
  const wordCount = trimmed.split(/\s+/).length;
  const isMnemonic = (wordCount === 12 || wordCount === 24) && bip39.validateMnemonic(trimmed);

  let seed: string;
  if (isMnemonic) {
    seed = bip39.mnemonicToSeedSync(trimmed).toString('hex'); // Full 64-byte seed (128 hex chars)
  } else if (isHex && (trimmed.length === 64 || trimmed.length === 128)) {
    // If 64 chars, assume it's a 32-byte seed and pad to 64 bytes for HDWallet.fromSeed
    seed = trimmed.length === 64 ? trimmed.padEnd(128, '0') : trimmed;
  } else {
    throw new Error('Invalid input: Expected a 12/24-word mnemonic or a 64/128-character hex seed.');
  }
  
  const { wallet, shieldedSecretKeys, dustSecretKey, unshieldedKeystore } = await withStatus(
    'Building wallet',
    async () => {
      setNetworkId('undeployed');
      const keys = deriveKeysFromSeed(seed);
      const shieldedSecretKeys = ledger.ZswapSecretKeys.fromSeed(keys[Roles.Zswap]);
      const dustSecretKey = ledger.DustSecretKey.fromSeed(keys[Roles.Dust]);
      const unshieldedKeystore = createKeystore(keys[Roles.NightExternal], getNetworkId());
      const shieldedWallet = ShieldedWallet(buildShieldedConfig(config)).startWithSecretKeys(shieldedSecretKeys);
      const unshieldedWallet = UnshieldedWallet(buildUnshieldedConfig(config)).startWithPublicKey(
        PublicKey.fromKeyStore(unshieldedKeystore),
      );
      const dustWallet = DustWallet(buildDustConfig(config)).startWithSecretKey(
        dustSecretKey,
        ledger.LedgerParameters.initialParameters().dust,
      );
      const wallet = new WalletFacade(shieldedWallet, unshieldedWallet, dustWallet);
      await wallet.start(shieldedSecretKeys, dustSecretKey);
      return { wallet, shieldedSecretKeys, dustSecretKey, unshieldedKeystore };
    },
  );
  
  await withStatus('Syncing with network', () => waitForSync(wallet));
  const syncedState = await Rx.firstValueFrom(wallet.state().pipe(Rx.filter(s => s.isSynced)));
  const balance = syncedState.unshielded.balances[unshieldedToken().raw] ?? 0n;
  const dustBalance = syncedState.dust.walletBalance(new Date());
  
  if (balance === 0n || dustBalance === 0n) {
    const address = unshieldedKeystore.getBech32Address().toString();
    console.log(`\n  Address: ${address}`);
    
    if (getNetworkId() === 'undeployed' as any) {
      if (balance === 0n) await autoFundNIGHT(config, address);
      if (dustBalance === 0n) {
          await withStatus('Waiting for NIGHT funds to settle', () => waitForFunds(wallet));
          await autoFundDust(wallet, unshieldedKeystore);
      }
    } else {
      if (balance === 0n) console.log('  [!] UNFUNDED: npm run fund (from project root)');
      if (dustBalance === 0n) console.log('  [!] NO DUST:  npm run fund-dust (from project root)');
    }
    
    await withStatus('Waiting for tokens to appear', async () => {
      if (balance === 0n) await waitForFunds(wallet);
      if (dustBalance === 0n) await waitForDust(wallet);
    });
  }
  
  return { wallet, shieldedSecretKeys, dustSecretKey, unshieldedKeystore };
};

export const buildFreshWallet = async (config: Config): Promise<{ ctx: WalletContext, seed: string, mnemonic: string }> => {
  const mnemonic = bip39.generateMnemonic(128); // 128 bits = 12 words
  const seed = bip39.mnemonicToSeedSync(mnemonic).toString('hex'); // Full 64-byte seed (128 hex chars)
  return {
    ctx: await buildWalletAndWaitForFunds(config, seed),
    seed,
    mnemonic
  };
};

export const configureProviders = async (ctx: WalletContext, config: Config) => {
  const walletAndMidnightProvider = await createWalletAndMidnightProvider(ctx);
  const zkConfigProvider = new NodeZkConfigProvider<KYCCircuits>(zkConfigPath);
  return {
    privateStateProvider: levelPrivateStateProvider<typeof KYCPrivateStateId>({
      privateStateStoreName: 'kyc-cli-storage-v705',
      walletProvider: walletAndMidnightProvider,
    }),
    publicDataProvider: indexerPublicDataProvider(config.indexerUrl, config.indexerWebsocketUrl),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(config.proofServerUrl, zkConfigProvider),
    walletProvider: walletAndMidnightProvider,
    midnightProvider: walletAndMidnightProvider,
  };
};

export const register = async (kycContract: DeployedKYCContract, pii: PII, walletAddr: Uint8Array): Promise<FinalizedTxData> => {
  return await registerCommitment(kycContract, pii, walletAddr);
};

export type { KYCProviders };
