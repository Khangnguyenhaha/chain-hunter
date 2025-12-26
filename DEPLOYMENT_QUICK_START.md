# Sui Deployment Quick Start

## TL;DR - 2 Minutes to Deployment

### Mac/Linux
```bash
bash scripts/deploy.sh 100000000
```

### Windows
```cmd
scripts\deploy.bat 100000000
```

### Manual (Any OS)
```bash
# 1. Publish the module
cd auction_house
sui client publish --gas-budget 100000000

# 2. Copy the entire output and parse it
cd ..
node scripts/parse-sui-deploy.js
# Paste output, press Ctrl+D
```

That's it! Your `src/config/sui.ts` will be automatically updated.

---

## What Gets Extracted

From the `sui client publish` output:
1. **Package ID** - The address of your published code
2. **AuctionHouse Object ID** - The shared object created by the init function

Both are automatically saved to:
- ✅ `src/config/sui.ts` (frontend config)
- ✅ `deployments/deployment-YYYY-MM-DD-timestamp.json` (backup)

---

## How to Use the IDs in Your Code

```typescript
import { PACKAGE_ID, AUCTION_HOUSE_ID } from '@/config/sui';

// In a Move transaction
tx.moveCall({
  target: `${PACKAGE_ID}::auction_house::create_auction`,
  arguments: [
    tx.object(AUCTION_HOUSE_ID),
    tx.object('0x6'), // CLOCK_ID
  ],
});
```

---

## Verify It Worked

Check `src/config/sui.ts`:
```typescript
export const PACKAGE_ID = '0x...';  // ← Should be populated
export const AUCTION_HOUSE_ID = '0x...';  // ← Should be populated
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "packageId not found" | Make sure you pasted the complete output |
| "AuctionHouse ID not found" | Check that init function ran successfully |
| Script fails | Try manual parsing with `node scripts/parse-sui-deploy.js` |
| "sui command not found" | Install Sui CLI first |

---

## Files You'll Need

- ✅ `scripts/parse-sui-deploy.js` - The parser
- ✅ `scripts/deploy.sh` - Quick deploy (Mac/Linux)
- ✅ `scripts/deploy.bat` - Quick deploy (Windows)
- ✅ `src/config/sui.ts` - Auto-updated config
- ✅ `DEPLOYMENT_GUIDE.md` - Full documentation

---

## Next Steps

1. ✅ Run deployment script
2. ✅ Verify config is updated
3. 🚀 Use IDs in your frontend

Done! 🎉
