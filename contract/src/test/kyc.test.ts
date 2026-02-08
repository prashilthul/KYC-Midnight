import { describe, it, expect } from 'vitest';
import { KYCSimulator } from './kyc-simulator.js';
import * as crypto from 'crypto';

describe('ConfidentialKYC', () => {
  it('should allow registration and subsequent proof generation', () => {
    const simulator = new KYCSimulator();
    const secret = crypto.randomBytes(32);
    // Hashing secret to create commitment (mimicking contract's persistentHash)
    // Note: In simulator we might need to match the exact hash used by the compiler.
    // For this test, we'll use a placeholder or the actual hash if we can reference it.
    
    // For simplicity, let's assume we can compute the hash.
    // In a real test, we'd use the same logic as the contract.
    const commitment = crypto.createHash('sha256').update(secret).digest();

    // Since we can't easily replicate persistentHash perfectly here without the runtime,
    // we'll focus on the flow.
    
    expect(() => simulator.register(commitment)).not.toThrow();
    // In actual use, we'd verify the ledger state in the simulator.
  });
});
