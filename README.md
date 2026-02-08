# 🏁 ConfidentialKYC: Quick Start Guide

This project is a decentralized Know Your Customer (KYC) service built on Midnight. It allows for private identity verification using Zero-Knowledge Proofs.

---

## 🛠️ Installation & Setup

Before you start, ensure you have **Node.js (v22+)** and the **Compact Compiler** installed.

### 1. Unified Setup (Recommended)
Run this from the `confidential-kyc` root directory:
```bash
# Install and build the contract (Required first)
cd contract && npm install && npm run compact && npm run build && cd ..

# Install and start the frontend
cd frontend && npm install && npm run dev
```

---

## 🚀 Running the Components

| Component | Command | Purpose |
| :--- | :--- | :--- |
| **Frontend** | `npm run dev` (in `/frontend`) | Opens the premium web UI @ `http://localhost:5173` |
| **CLI** | `npm run start` (in `/cli`) | Developer terminal tool for manual blockchain calls |
| **Contract** | `npm run compact` (in `/contract`) | Re-compiles the ZK circuits if you change the logic |

---

## 📖 Detailed Learning Guides

If you are new to Midnight, please read these files in order:
1.  **[What is this project?](./docs/OVERVIEW.md)** - Concepts of ZK and Privacy.
2.  **[How does the code work?](./docs/CONTRACT_GUIDE.md)** - A beginner's look at Compact.
3.  **[The UI Design](./docs/FRONTEND_GUIDE.md)** - Why the frontend looks and feels premium.
4.  **[Advanced Running](./docs/RUNNING.md)** - Complex setups and Testnet details.

---

## 🐞 Troubleshooting
- **Compiler Errors**: Ensure you have `compact` version `0.28.0` via `compact update`.
- **Port Conflict**: If `http://localhost:5173` is busy, Vite will automatically try `5174`.
- **Midnight SDK**: We have included the **signRecipe workaround** in `cli/src/api.ts` to prevent transaction failures.
