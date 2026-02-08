import * as api from './api.js';
import { localConfig } from './config.js';
import { Buffer } from 'buffer';
import * as crypto from 'crypto';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

const rl = readline.createInterface({ input, output });

async function main() {
  console.log('--- Confidential KYC Service ---');
  
  // Simplified for demonstration: in a real app, 
  // we would initialize providers and wallet here.
  // For this task, I'll focus on the menu flow.

  while (true) {
    console.log('\nOptions:');
    console.log('1. Initialize Wallet (Not fully implemented in this mock)');
    console.log('2. Register KYC Commitment');
    console.log('3. Generate KYC Proof');
    console.log('4. Exit');

    const choice = await rl.question('Select an option: ');

    switch (choice) {
      case '1':
        console.log('Wallet initialization logic would go here...');
        break;
      case '2':
        const pii = await rl.question('Enter PII (e.g., name): ');
        const secret = crypto.randomBytes(32);
        const commitment = crypto.createHash('sha256').update(pii).update(secret).digest();
        console.log(`Generated commitment: ${commitment.toString('hex')}`);
        console.log('Registration would call api.register()...');
        break;
      case '3':
        console.log('Proof generation would call api.proveKYC()...');
        break;
      case '4':
        process.exit(0);
      default:
        console.log('Invalid option.');
    }
  }
}

main().catch(console.error);
