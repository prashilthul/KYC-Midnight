import { KYC, type KYCPrivateState } from '@confidential-kyc/contract';
import type { MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import type { DeployedContract, FoundContract } from '@midnight-ntwrk/midnight-js-contracts';
import type { ImpureCircuitId } from '@midnight-ntwrk/compact-js';

export type KYCCircuits = ImpureCircuitId<KYC.Contract<KYCPrivateState>>;

export const KYCPrivateStateId = 'kycPrivateState';

export type KYCProviders = MidnightProviders<KYCCircuits, typeof KYCPrivateStateId, KYCPrivateState>;

export type KYCContract = KYC.Contract<KYCPrivateState>;

export type DeployedKYCContract = DeployedContract<KYCContract> | FoundContract<KYCContract>;
