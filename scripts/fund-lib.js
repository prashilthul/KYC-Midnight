// Copyright 2025 Brick Towers
import pino from 'pino';
import pinoPretty from 'pino-pretty';
import { initWalletWithSeed } from './wallet-utils.js';
import { MidnightBech32m } from '@midnight-ntwrk/wallet-sdk-address-format';
import * as rx from 'rxjs';
import * as bip39 from 'bip39';
export const DEFAULT_LOG_LEVEL = process.env.LOG_LEVEL ?? 'info';
export const TRANSFER_AMOUNT = 156685000000n; // 1e12, adjust as needed
export function createLogger() {
    const pretty = pinoPretty({
        colorize: true,
        sync: true,
    });
    return pino({
        level: DEFAULT_LOG_LEVEL,
    }, pretty);
}
export async function deriveReceiverFromMnemonic(mnemonic) {
    if (!bip39.validateMnemonic(mnemonic)) {
        throw new Error('Invalid mnemonic provided.');
    }
    const seed = await bip39.mnemonicToSeed(mnemonic);
    const walletBundle = await initWalletWithSeed(seed);
    const { wallet, unshieldedKeystore } = walletBundle;
    const shieldedAddress = await rx.firstValueFrom(wallet.state().pipe(rx.filter((s) => s.isSynced), rx.map((s) => MidnightBech32m.encode('undeployed', s.shielded.address).toString())));
    const unshieldedAddress = unshieldedKeystore.getBech32Address().toString();
    return { walletBundle, shieldedAddress, unshieldedAddress };
}
export async function initGenesisSender() {
    const genesisWalletSeed = Buffer.from('0000000000000000000000000000000000000000000000000000000000000001', 'hex');
    const sender = await initWalletWithSeed(genesisWalletSeed);
    await rx.firstValueFrom(sender.wallet.state().pipe(rx.filter((s) => s.isSynced)));
    return sender;
}
export async function fundFromGenesis(sender, outputs) {
    const recipe = await sender.wallet.transferTransaction(outputs, {
        shieldedSecretKeys: sender.shieldedSecretKeys,
        dustSecretKey: sender.dustSecretKey,
    }, {
        ttl: new Date(Date.now() + 30 * 60 * 1000),
        payFees: true,
    });
    const signedTx = await sender.wallet.signUnprovenTransaction(recipe.transaction, (payload) => sender.unshieldedKeystore.signData(payload));
    const finalizedTx = await sender.wallet.finalizeTransaction(signedTx);
    return sender.wallet.submitTransaction(finalizedTx);
}
