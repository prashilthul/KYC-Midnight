# Wallet Funding Guide

To fund your Lace wallet for local testing:

## Quick Method

```bash
./fund-wallet.sh <your-address>
```

## Get Your Address

1. Open Lace Wallet
2. Settings → Midnight
3. Switch to "Undeployed" network
4. Copy your shielded address (starts with `mn_shield-addr_undeployed...`)

## Examples

```bash
# Fund shielded address
./fund-wallet.sh mn_shield-addr_undeployed1q...

# Fund unshielded address  
./fund-wallet.sh mn_addr_undeployed1q...

# Fund from mnemonic (funds both addresses)
./fund-wallet.sh "your twelve word mnemonic phrase here"
```

## Manual Method

If the script doesn't work, you can fund manually:

```bash
cd ../midnight-local-network
yarn install
yarn fund mn_shield-addr_undeployed1q...
```

## Troubleshooting

**"midnight-local-network not found"**
```bash
cd ~/Desktop/midnight-things
git clone https://github.com/bricktowers/midnight-local-network.git
cd midnight-local-network
yarn install
```

**Funds not appearing**
- Wait 10-15 seconds for transaction to process
- Make sure Docker containers are running: `docker compose ps`
- Check Lace wallet is connected to "Undeployed" network
