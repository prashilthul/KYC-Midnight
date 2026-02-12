# The Lace Wallet Identity Issue: A Technical Deep Dive

During the transition from the KYC CLI to the Frontend (Lace Wallet), we encountered a critical "Identity Mismatch" error that blocked registration. This document explains why the CLI worked seamlessly while the frontend required special handling.

## The Core Problem

Midnight identities are derived from a seed. However, the way identities are represented and verified by the Midnight SDK depends strictly on how the "forging" (address encoding) is performed.

### 1. HDWallet vs. Browser Wallets
- **CLI**: Uses the `HDWallet` SDK directly, giving us full control over the derivation path and the raw 32-byte secret.
- **Lace (Browser)**: Derives keys using its own internal logic. When we try to "forge" an identity on the frontend to match what the contract expects, the SDK performs strict type checking on the address format.

## The "Mismatched Address" Error

The `kyc.compact` contract expects a 32-byte `wallet_address` as a circuit input. 

In the frontend, we initially encountered errors where the SDK rejected the provided address because it didn't match the internal `shield-cpk` (Shielded Coin Public Key) or `shield-epk` (Shielded Encryption Public Key) format that the Midnight JS types require.

### Why Proofs Failed
The Midnight SDK's `prove` methodology requires that the public key used for proving matches the public key associated with the wallet state. If the address encoding is even one bit different (e.g., encoded as a generic Bech32 instead of `shield-cpk`), the proof generator detects a mismatch and aborts.

## The Challenge: A Resource Desert

Resolving the "Identity Mismatch" error was exceptionally difficult due to the near-total lack of public documentation, community examples, or clear SDK error messages regarding identity forging for non-HD wallets.

### 1. Opaque Errors
The error message typically provided by the SDK is a generic "Identity Mismatch" or a type error during proof generation. It does not explain *why* the provided public key is considered different from the one in the wallet state, even if the underlying bytes are identical.

### 2. Lack of Reference Material
Standard Midnight examples often assume the use of `HDWallet`, where the developer has direct access to the derivation logic. Browser wallets like Lace act as black boxes, and bridging the gap to the strict ZK circuit requirements requires reverse-engineering the SDK's internal address encoding patterns.

### 3. Trial and Error
Without clear guidance on how the SDK expects CPK/EPK forged addresses to be formatted for specific network IDs (like `undeployed`), the fix required extensive technical exploration of the `@midnight-ntwrk/wallet-sdk-address-format` internals.

## Root Cause of Success in CLI
The CLI version worked "directly" because it was manually deriving the identity from a hex seed and passing raw bytes to the circuits, bypassing the strict type-guards that the higher-level `MidnightProvider` in the browser enforces for security.

## Summary of Resolution
By explicitly forging the `shield-cpk` and `shield-epk` on the frontend, we ensured that the browser wallet's "Identity" perfectly aligned with the bytes the ZK circuit was verifying.
