import { type ContractAddress } from '@midnight-ntwrk/compact-runtime';
import { KYC, type KYCPrivateState, witnesses } from '@confidential-kyc/contract';
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
} from '@midnight-ntwrk/wallet-sdk-address-format';
import path from 'path';
import { pino } from 'pino';

const logger = pino({
  level: 'debug',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
});

export { logger };

// Workaround for signRecipe bug in wallet-sdk-facade 1.0.0
const signTransactionIntents = (
  tx: { intents?: Map<number, any> },
  signFn: (payload: Uint8Array) => ledger.Signature,
  proofMarker: 'proof' | 'pre-proof',
): void => {
  logger.debug({ proofMarker }, 'Signing transaction intents');
  if (!tx.intents || tx.intents.size === 0) {
    logger.warn('No intents to sign');
    return;
  }

  for (const segment of tx.intents.keys()) {
    logger.debug({ segment }, 'Processing intent segment');
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
  logger.info('Transaction intents signed successfully');
};

export const createWalletAndMidnightProvider = async (
  ctx: WalletContext,
): Promise<WalletProvider & MidnightProvider> => {
  logger.info('Creating Midnight and Wallet providers');
  return {
    async getCoinPublicKey() {
        const state = await ctx.wallet.state().toPromise();
        return state!.shielded.coinPublicKey.toHexString();
    },
    async getEncryptionPublicKey() {
        const state = await ctx.wallet.state().toPromise();
        return state!.shielded.encryptionPublicKey.toHexString();
    },
    async balanceTx(tx, ttl?) {
      logger.debug('Balancing transaction');
      const recipe = await ctx.wallet.balanceUnboundTransaction(
        tx,
        { shieldedSecretKeys: ctx.shieldedSecretKeys, dustSecretKey: ctx.dustSecretKey },
        { ttl: ttl ?? new Date(Date.now() + 30 * 60 * 1000) },
      );

      const signFn = (payload: Uint8Array) => ctx.unshieldedKeystore.signData(payload);
      
      logger.debug('Applying signRecipe workaround for base transaction');
      signTransactionIntents(recipe.baseTransaction, signFn, 'proof');
      
      if (recipe.balancingTransaction) {
        logger.debug('Applying signRecipe workaround for balancing transaction');
        signTransactionIntents(recipe.balancingTransaction, signFn, 'pre-proof');
      }

      const finalizedTx = await ctx.wallet.finalizeRecipe(recipe);
      logger.info('Transaction recipe finalized');
      return finalizedTx;
    },
    submitTx(tx) {
      logger.info({ txHash: toHex(tx.hash) }, 'Submitting transaction to network');
      return ctx.wallet.submitTransaction(tx) as any;
    },
  };
};

// Contract configuration
const zkConfigPath = path.resolve(__dirname, '../../contract/src/managed/kyc');
logger.debug({ zkConfigPath }, 'Loading ZK assets');

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

export interface KYCProviders {
    privateStateProvider: any;
    publicDataProvider: any;
    zkConfigProvider: any;
    proofProvider: any;
    walletProvider: any;
    midnightProvider: any;
}

export const deploy = async (
  providers: KYCProviders,
  commitment: Uint8Array,
): Promise<any> => {
  logger.info('Deploying KYC identity contract');
  const kycContract = await deployContract(providers, {
    compiledContract: kycCompiledContract,
    privateStateId: 'kycPrivateState',
    initialPrivateState: { kycSecret: commitment },
  });
  logger.info({ address: kycContract.deployTxData.public.contractAddress }, 'KYC contract deployed successfully');
  return kycContract;
};

export const register = async (kycContract: any, commitment: Uint8Array): Promise<FinalizedTxData> => {
  logger.info('Calling register() circuit');
  const finalizedTxData = await kycContract.callTx.register(commitment);
  logger.info({ txHash: finalizedTxData.public.txHash }, 'register() tx finalized');
  return finalizedTxData.public;
};

export const proveIdentity = async (kycContract: any, secret: Uint8Array): Promise<FinalizedTxData> => {
    logger.info('Calling prove_identity() circuit');
    const finalizedTxData = await kycContract.callTx.prove_identity(secret);
    logger.info({ txHash: finalizedTxData.public.txHash }, 'prove_identity() tx finalized');
    return finalizedTxData.public;
};

export const proveAge = async (kycContract: any, birthYear: number, secret: Uint8Array): Promise<FinalizedTxData> => {
    const currentYear = new Date().getFullYear();
    logger.info({ birthYear, currentYear }, 'Calling prove_age_eligible() circuit');
    const finalizedTxData = await kycContract.callTx.prove_age_eligible(currentYear, birthYear, secret);
    logger.info({ txHash: finalizedTxData.public.txHash }, 'prove_age_eligible() tx finalized');
    return finalizedTxData.public;
};
