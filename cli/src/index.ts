import { type WalletContext } from './api.js';
import { stdin as input, stdout as output } from 'node:process';
import { createInterface, type Interface } from 'node:readline/promises';
import { pino } from 'pino';
import { type KYCProviders, type DeployedKYCContract } from './common-types.js';
import { type Config, localConfig } from './config.js';
import * as api from './api.js';
import * as crypto from 'node:crypto';
import { MidnightBech32m, UnshieldedAddress } from '@midnight-ntwrk/wallet-sdk-address-format';

const logger = pino({
  level: 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true },
  },
});

const C = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m'
};

const BANNER = `
  ${C.cyan}${C.bold}CONFIDENTIAL KYC SERVICE CLI${C.reset}
  ${C.blue}Privacy-preserving identity verification on Midnight${C.reset}
`;

const DIVIDER = `${C.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${C.reset}`;

const WALLET_MENU = `
${DIVIDER}
  ${C.yellow}${C.bold}WALLET SETUP${C.reset}
${DIVIDER}
  ${C.cyan}[1]${C.reset} Create a new wallet
  ${C.cyan}[2]${C.reset} Restore wallet from seed
  ${C.cyan}[3]${C.reset} Exit
${DIVIDER}
> `;

const CONTRACT_MENU = `
${DIVIDER}
  ${C.yellow}${C.bold}CONTRACT MANAGEMENT${C.reset}
${DIVIDER}
  ${C.cyan}[1]${C.reset} Deploy a new KYC contract
  ${C.cyan}[2]${C.reset} Join an existing KYC contract
  ${C.cyan}[3]${C.reset} Exit
${DIVIDER}
> `;

const GENESIS_MINT_WALLET_SEED = '0000000000000000000000000000000000000000000000000000000000000001';

const getWallet = async (config: Config, rli: Interface): Promise<WalletContext | null> => {
  while (true) {
    const choice = await rli.question(WALLET_MENU);
    switch (choice.trim()) {
      case '1': {
        const { ctx, seed, mnemonic } = await api.buildFreshWallet(config);
        console.log(`\n${DIVIDER}`);
        console.log(`  NEW WALLET CREATED!`);
        console.log(`\n  24-WORD MNEMONIC (SAVE THIS!):`);
        console.log(`  ${mnemonic}`);
        console.log(`\n  HEX SEED:`);
        console.log(`  ${seed}`);
        console.log(`\n  [!] PLEASE SAVE YOUR MNEMONIC TO RESTORE YOUR WALLET LATER`);
        console.log(`${DIVIDER}\n`);
        return ctx;
      }
      case '2':
        const seed = await rli.question('Enter your 24-word mnemonic or hex seed: ');
        return await api.buildWalletAndWaitForFunds(config, seed);
      case '3':
        return null;
      default:
        console.log(`Invalid choice: ${choice}`);
    }
  }
};

const deployOrJoin = async (
  providers: KYCProviders,
  rli: Interface,
): Promise<DeployedKYCContract | null> => {
  while (true) {
    const choice = await rli.question(CONTRACT_MENU);
    switch (choice.trim()) {
      case '1':
        return await api.deploy(providers);
      case '2':
        const address = await rli.question('Enter the contract address (hex): ');
        return await api.joinContract(providers, address);
      case '3':
        return null;
      default:
        console.log(`Invalid choice: ${choice}`);
    }
  }
};

const KYC_MENU = `
${C.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${C.reset}
  ${C.yellow}${C.bold}KYC OPERATIONS${C.reset}
${C.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${C.reset}
  ${C.cyan}[1]${C.reset} Register Identity (Name, Age, Residency)
  ${C.cyan}[2]${C.reset} Prove Full Identity
  ${C.cyan}[3]${C.reset} Prove Age Eligibility (> 18)
  ${C.cyan}[4]${C.reset} Prove Residency (Country)
  ${C.cyan}[5]${C.reset} Back to Main Menu

Choice: `;

const kycLoop = async (kycContract: DeployedKYCContract, rli: Interface, ctx: api.WalletContext): Promise<void> => {
  const addressStr = ctx.unshieldedKeystore.getBech32Address().toString();
  const decoded = MidnightBech32m.parse(addressStr);
  const unshieldedAddr = UnshieldedAddress.codec.decode(decoded.network, decoded);
  const walletAddr = unshieldedAddr.data;

  while (true) {
    const choice = await rli.question(KYC_MENU);
    let pii = api.loadPII();

    switch (choice.trim()) {
      case '1':
        try {
          const fullName = await rli.question('Enter Full Name: ');
          const birthYear = parseInt(await rli.question('Enter Birth Year (YYYY): '));
          const country = await rli.question('Enter Country (e.g., india): ');
          const secret = crypto.randomBytes(32).toString('hex');
          
          pii = { fullName, birthYear, country: country.toLowerCase().trim(), secret };
          
          await api.withStatus('Registering identity', () => 
            api.registerCommitment(kycContract, pii!, walletAddr)
          );
          
          console.log(`\n${DIVIDER}`);
          console.log(`  SUCCESS: Identity registered on-chain!`);
          console.log(`\n  FULL NAME:    ${pii.fullName}`);
          console.log(`  BIRTH YEAR:   ${pii.birthYear}`);
          console.log(`  COUNTRY:      ${pii.country}`);
          console.log(`  SECRET:       ${C.magenta}${secret}${C.reset}`);
          console.log(`\n  [!] SAVE THIS SECRET! You will need it to prove your identity later.`);
          console.log(`${DIVIDER}\n`);
        } catch (e: any) {
          console.log(`\n  Registration failed: ${e.message}`);
        }
        break;
      case '2': // Prove Identity
      case '3': // Prove Age
      case '4': // Prove Residency
        try {
          if (!pii) {
            console.log('  [!] No local identity found. Please enter details manually:');
            const fullName = 'Manual';
            const birthYear = parseInt(await rli.question('  Enter Birth Year (YYYY): '));
            const country = await rli.question('  Enter Country (e.g., india): ');
            const secret = await rli.question('  Enter Identity Secret (Hex): ');
            pii = { fullName, birthYear, country: country.toLowerCase().trim(), secret };
          } else {
            console.log(`  Verifying identity for: ${pii.fullName}`);
            const secret = await rli.question('  Confirm Identity Secret (Hex): ');
            pii = { ...pii, secret };
          }

          if (choice.trim() === '2' || choice.trim() === '3') {
            await api.withStatus('Generating Age Eligibility Proof', () => 
              api.proveAgeEligible(kycContract, pii!, walletAddr)
            );
            console.log(`  ${C.green}SUCCESS: Age/Identity Proof Verified!${C.reset}`);
          } else if (choice.trim() === '4') {
            await api.withStatus('Generating Residency Proof', () => 
              api.proveResidency(kycContract, pii!, walletAddr)
            );
            console.log(`  ${C.green}SUCCESS: Residency Verified!${C.reset}`);
          }
        } catch (e: any) {
          const match = e.message.match(/failed assert: (.*)/);
          if (match) {
            console.log(`\n  ${C.red}[X] VERIFICATION REJECTED:${C.reset} ${match[1]}`);
          } else {
            console.log(`\n  ${C.red}[!] Proof failed:${C.reset} ${e.message}`);
          }
        }
        break;
      case '5':
        return;
      default:
        console.log(`Invalid choice: ${choice}`);
    }
  }
};

async function main() {
  console.log(BANNER);
  api.setLogger(logger);
  const rli = createInterface({ input, output });

  try {
    const walletCtx = await getWallet(localConfig, rli);
    if (!walletCtx) return;

    const providers = await api.withStatus('Configuring providers', () => 
      api.configureProviders(walletCtx, localConfig)
    );

    const kycContract = await deployOrJoin(providers, rli);
    if (!kycContract) return;

    await kycLoop(kycContract, rli, walletCtx);

  } catch (err: any) {
    console.error(`\n  FATAL ERROR: ${err.message}`);
  } finally {
    rli.close();
    process.exit(0);
  }
}

main().catch(console.error);
