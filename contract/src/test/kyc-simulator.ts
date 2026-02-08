import { KYC, type KYCPrivateState } from '@confidential-kyc/contract';
import { Simulator, type CircuitContext, type Contract } from '@midnight-ntwrk/compact-runtime';

export class KYCSimulator {
  readonly contract: Contract<KYCPrivateState>;
  circuitContext: CircuitContext<KYCPrivateState>;

  constructor() {
    this.contract = KYC.Contract.make();
    this.circuitContext = Simulator.createContext(this.contract, { kycSecret: new Uint8Array(32) });
  }

  register(commitment: Uint8Array): void {
    const result = Simulator.run(this.contract.circuits.register, this.circuitContext, [commitment]);
    this.circuitContext = result.context;
  }

  proveKYC(secret: Uint8Array): void {
    const result = Simulator.run(this.contract.circuits.prove_kyc, this.circuitContext, [secret]);
    this.circuitContext = result.context;
  }
}
