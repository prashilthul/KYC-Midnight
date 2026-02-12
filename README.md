# Confidential KYC Service

A privacy-preserving identity verification platform built on the Midnight blockchain. This project allows users to commit their Personally Identifiable Information (PII) to the blockchain and subsequently generate Zero-Knowledge Proofs (ZKP) to verify attributes like age and residency without revealing the underlying data.

## Why This Matters

In the current digital landscape, identity verification is a double-edged sword. To access services, users are forced to share sensitive documents with third parties, creating massive honey pots of data and exposing themselves to identity theft. Conversely, service providers (verifiers) inherit the liability and cost of securing this sensitive information.

This project demonstrates a fundamental shift in this paradigm:
1. **User Empowerment**: Identity remains decentralized. The user holds their primary data and secret, sharing only a cryptographic commitment on-chain.
2. **Zero-Knowledge Verification**: Verifiers can confirm that a user is over 18 or resides in a specific country with absolute mathematical certainty, without ever seeing a birth certificate or passport.
3. **Reduced Liability**: Since the verifier never touches the actual PII, they are protected from data breach risks and associated legal penalties.

## Why ZKPs and Midnight?

Standard blockchains are completely public, which makes them difficult to use for anything involving sensitive personal data. Zero-Knowledge Proofs change this by letting you prove a statement is true (like "I am over 18") without revealing the data that proves it (like your birth date). 

Midnight provides the underlying network to make these proofs part of a real application. This opens up massive utility across different sectors:
- **Financial Services**: You could prove you have enough collateral for a loan without revealing your total net worth or bank statements.
- **Global Travel & Identity**: Proving you hold a valid passport or a specific visa for travel without handing over all the sensitive details contained in the physical document.
- **Secure Credentials**: Foundational for things like private voting or proving professional certifications where you only share what is absolutely necessary.

## Project Structure

- `contract/`: Compact smart contract logic and ZK circuits.
- `cli/`: Node.js based command-line interface for identity management and proof generation.
- `frontend/`: React-based web dashboard for user-friendly identity anchoring and verification.
- `vid.mp4`: A demonstration video of the KYC flow.

## Demo Video

[Watch the Demonstration Video](vid.mp4)

## Technical Architecture

The system utilizes Midnight's Zero-Knowledge capabilities to ensure that:
1. PII is hashed locally and never leaves the user's environment in plain text.
2. Only a cryptographic commitment is stored on-chain.
3. Proofs generated (Age Disclosure, Residency Check) reveal only the boolean result (pass/fail) to the verifier.

### Current Deployed Contract

The application is configured to interact with the following contract address on the `undeployed` (local) network:
`20358cff6f29133c20060554794d1a662c33944fd3df47ebd993c9ec7c097350`

## Known Technical Issue: Lace Wallet & Midnight SDK Integration

During development, a significant compatibility issue was identified between the Midnight SDK and the Lace Wallet bridge regarding identity serialization. 

### Problem
The Lace Wallet bridge requires all transaction data to be passed as plain JavaScript objects or `Uint8Array`. However, the Midnight SDK often utilizes polyfilled `Buffer` objects or internal WebAssembly (WASM) pointers. When these are passed directly to the Lace bridge, they cause a `TypeError` because the bridge cannot serialize complex internal objects or non-native types.

Finding information or documentation regarding this specific interaction was extremely difficult, as there were very few online resources or community discussions addressing the translation layer between the SDK's internal WASM state and the bridge's serialization requirements.

## Getting Started

### Prerequisites
- Node.js (v18+)
- Midnight Lace Wallet extension
- Midnight Proof Server (running locally on port 6300)

### Installation
1. Install dependencies:
   ```bash
   npm install
   ```
2. Set up environment:
   Make sure `frontend/.env.local` contains the correct `VITE_CONTRACT_ADDRESS`.

### Running the Application
- Start Frontend: `cd frontend && npm run dev`
- Start CLI: `cd cli && npm start`

## Security Considerations
This project is for demonstration purposes. Ensure your local environment is secure when handling real PII.
