# 🚀 KYC Deployment Guide

## 📋 Current Status

The CLI deployment infrastructure is set up with **configuration generation**. Full wallet SDK integration requires additional setup following the Midnight starter repository pattern.

## 🔧 Quick Start

### Step 1: Build the Contract

```bash
cd contract
npm install
npm run build
cd ..
```

### Step 2: Run Deployment Script

```bash
cd cli
npm install
npm run build
npm run deploy
```

This will create `deployment-config.json` with network configuration and sample commitment.

## 🏗️ Deployment Options

### Option 1: Frontend Deployment (Recommended - Working Now)

✅ **This works out of the box!**

1. Start frontend: `cd frontend && npm run dev`
2. Connect Lace Wallet in browser
3. Complete Owner flow to deploy contract
4. Contract deploys automatically when you click "Publish to Midnight Ledger"

**Pros:**
- Zero CLI setup required
- Uses Lace Wallet directly
- Full ZK proof generation
- Works immediately

### Option 2: CLI Deployment (Requires SDK Integration)

⚠️ **Requires additional setup**

To implement full CLI deployment:

1. Reference [Midnight Starter Repository](https://docs.midnight.network/getting-started/deploy-mn-app)
2. Implement wallet SDK functions in `cli/src/wallet-utils.ts`
3. Match your Midnight SDK version to the starter
4. Follow the wallet initialization pattern

**What's needed:**
- `buildWalletFromHexSeed()` - Create wallet from seed
- `configureProviders()` - Set up Midnight providers
- `displayWalletBalances()` - Show wallet funds
- `closeWallet()` - Cleanup connections

## 📂 Project Structure

```
confidential-kyc/
├── cli/
│   ├── src/
│   │   ├── deploy.ts          # Deployment script (config gen)
│   │   ├── api.ts              # Contract interaction
│   │   ├── config.ts           # Network configuration
│   │   ├── logger.ts           # Logging utility
│   │   └── wallet-utils.ts     # Wallet  utilities (placeholders)
│   └── deployment-config.json  # Generated configuration
├── contract/
│   ├── src/
│   │   └── kyc.compact         # Smart contract
│   └── dist/                   # Compiled contract
└── frontend/
    └── src/
        ├── App.tsx             # UI with Lace integration ✅
        └── midnight-api.ts     # Frontend deployment logic ✅
```

## ✅ What Works Now

1. **Frontend deployment** - Full ZK proof deployment via Lace
2. **Verification logic** - Properly validates hash format and requirements
3. **CLI config generation** - Creates deployment configuration
4. **Contract compilation** - Compact contract builds successfully

## 🔄 Next Steps for Full CLI Deployment

If you want CLI-based deployment (optional):

1. **Clone Midnight starter:**
   ```bash
   git clone https://github.com/Midnight-Network/midnight-starter.git
   cd midnight-starter/counter-cli/src
   ```

2. **Copy correct implementations:**
   - Copy wallet building logic from starter's `api.ts`
   - Update SDK versions to match
   - Adapt to KYC contract structure

3. **Update `wallet-utils.ts`:**
   Replace placeholder functions with actual SDK calls

## 🎯 Recommended Approach

**For now: Use frontend deployment!**

- ✅ It works perfectly
- ✅ Lace Wallet handles everything
- ✅ Full ZK proof generation
- ✅ No complex CLI setup needed

**Later:** If you need automated/headless deployment, implement full wallet SDK following the starter repository pattern.

## 📖 Resources

- [Midnight Documentation](https://docs.midnight.network/)
- [Deploy Midnight App Guide](https://docs.midnight.network/getting-started/deploy-mn-app)
- [Lace Wallet](https://www.lace.io/)

---

**Current recommendation:** Use the frontend for deployment. The CLI infrastructure is ready for future enhancement if needed.
