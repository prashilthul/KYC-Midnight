
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const zkConfigPath = path.resolve(__dirname, '../../contract/dist/managed/kyc');

async function debugKeys() {
  const provider = new NodeZkConfigProvider(zkConfigPath);
  console.log("Loading register verifier key...");
  const key = await provider.getVerifierKey('register');
  
  console.log("Total length:", key.length);
  console.log("First 30 bytes hex:", Buffer.from(key.slice(0, 30)).toString('hex'));
  console.log("First 30 bytes string:", Buffer.from(key.slice(0, 30)).toString('utf8')); // Check for text header
}

debugKeys().catch(console.error);
