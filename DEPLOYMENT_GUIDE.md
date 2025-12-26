# Sui Deployment & Configuration Guide

## Overview

This guide explains how to deploy the Auction House Move module and automatically configure the frontend with the correct IDs.

## Step-by-Step Deployment

### 1. Publish the Module

```bash
cd auction_house
sui client publish --gas-budget 100000000
```

This command will:
- Compile the Move code
- Deploy to Sui testnet
- Create a new package (packageId)
- Run the init function, which creates:
  - AuctionHouse object (shared)
  - Treasury object (shared)

Example output:
```
Transaction Digest: ...
│ Transaction Digest: 0x1234...
│
├─ Transaction Effects
│  ├─ Mutated Objects:
│  │  └─ ID: 0x5678..., Owner: ...
│  ├─ Created Objects:
│  │  ├─ ID: 0xabcd... (Package)
│  │  ├─ ID: 0xef01... (AuctionHouse - SHARED)
│  │  └─ ID: 0x2345... (Treasury - SHARED)
...
```

### 2. Parse the Output

Copy the entire output from the `sui client publish` command and run the parser:

```bash
# Option 1: Pipe directly from sui command
sui client publish --gas-budget 100000000 | node scripts/parse-sui-deploy.js

# Option 2: Save output to file, then parse
sui client publish --gas-budget 100000000 > deploy-output.txt
node scripts/parse-sui-deploy.js < deploy-output.txt

# Option 3: Copy-paste output (interactive mode)
node scripts/parse-sui-deploy.js
# Then paste the output and press Ctrl+D when done
```

### 3. Verify Configuration

The script will:
1. ✅ Extract the **packageId** (first published object)
2. ✅ Extract the **AuctionHouse objectId** (first shared object created by init)
3. ✅ Update `src/config/sui.ts` automatically
4. ✅ Save deployment info to `deployments/` directory

Example output:
```
Parsing deployment output...

✓ packageId: 0xefe8d731c7d9ea0fc22e063986091187ab87c338257318b1b0392b3daa429bb7
✓ AuctionHouse objectId: 0x4a8b9c1d2e3f4a5b6c7d8e9f0a1b2c3d

Updating config file...
✓ Config file updated: src/config/sui.ts

Saving deployment info...
✓ Deployment info saved: deployments/deployment-2025-12-26-1234567890.json

Deployment Information:
  Package ID:          0xefe8d731...
  AuctionHouse ID:     0x4a8b9c1d...
  Timestamp:           2025-12-26T10:30:00.000Z
  Network:             testnet

✓ All done! Your frontend is ready to use these IDs.
```

## Configuration Files

### Frontend Config: `src/config/sui.ts`

After deployment, this file will contain:

```typescript
export const PACKAGE_ID = '0xefe8d731c7d9ea0fc22e063986091187ab87c338257318b1b0392b3daa429bb7';
export const AUCTION_HOUSE_ID = '0x4a8b9c1d2e3f4a5b6c7d8e9f0a1b2c3d';
export const CLOCK_ID = '0x6';
```

**Usage in code:**
```typescript
import { PACKAGE_ID, AUCTION_HOUSE_ID, CLOCK_ID } from '@/config/sui';

// In your transaction blocks:
tx.moveCall({
  target: `${PACKAGE_ID}::auction_house::create`,
  arguments: [tx.object(AUCTION_HOUSE_ID), tx.object(CLOCK_ID)],
});
```

### Deployment Backup: `deployments/deployment-YYYY-MM-DD-timestamp.json`

A backup of all deployment info is saved in JSON format:

```json
{
  "packageId": "0xefe8d731c7d9ea0fc22e063986091187ab87c338257318b1b0392b3daa429bb7",
  "auctionHouseObjectId": "0x4a8b9c1d2e3f4a5b6c7d8e9f0a1b2c3d",
  "timestamp": "2025-12-26T10:30:00.000Z",
  "network": "testnet"
}
```

This helps you:
- Track multiple deployments
- Rollback if needed
- Reference old deployments
- Audit deployment history

## Understanding the Move Init Function

The init function in `auction_house.move` creates:

```move
fun init(_witness: AUCTION_HOUSE, ctx: &mut TxContext) {
    let treasury = treasury::create(ctx);
    let treasury_id = object::id(&treasury);
    let auction_house = AuctionHouse {
        id: object::new(ctx),
        treasury: treasury_id,
        fee_bps: 0,
    };
    transfer::share_object(auction_house);  // ← Creates shared object
    treasury::share(treasury);              // ← Creates shared object
}
```

**Shared objects** are objects that multiple transactions can access in parallel. The parser extracts:
- **Package ID**: The ID of the published code
- **AuctionHouse ID**: The ID of the shared AuctionHouse object

## Troubleshooting

### "Could not extract packageId"
- ✅ Make sure you copied the entire output from `sui client publish`
- ✅ Check that the output shows "Published Objects:" section
- ✅ Try running the publish command again and capture full output

### "Could not extract AuctionHouse objectId"
- ✅ The init function must successfully run
- ✅ Check for "Shared Objects:" section in output
- ✅ Verify the init function creates `AuctionHouse` object
- ✅ Check gas budget is sufficient

### "Failed to update config file"
- ✅ Make sure `src/config/sui.ts` exists
- ✅ Check file permissions
- ✅ Make sure the file is not locked
- ✅ Try updating manually if automatic fails

## Manual Update (Fallback)

If the script fails, you can update manually:

1. Open `src/config/sui.ts`
2. Replace the `PACKAGE_ID` with the published package ID
3. Replace the `AUCTION_HOUSE_ID` with the shared object ID
4. Save the file

Example:
```typescript
// Before
export const PACKAGE_ID = '0x0000...';
export const AUCTION_HOUSE_ID = '0x0';

// After (from your deployment output)
export const PACKAGE_ID = '0xefe8d731c7d9ea0fc22e063986091187ab87c338257318b1b0392b3daa429bb7';
export const AUCTION_HOUSE_ID = '0x4a8b9c1d2e3f4a5b6c7d8e9f0a1b2c3d';
```

## Finding IDs from Existing Deployment

If you need to find IDs from a previous deployment:

### Option 1: Check Deployment Backups
```bash
ls -la deployments/
# Shows all previous deployments with timestamps
cat deployments/deployment-2025-12-26-1234567890.json
```

### Option 2: Query Sui Network
```bash
# Get objects owned by current address
sui client objects

# Inspect a specific object
sui client object 0x4a8b9c1d2e3f4a5b6c7d8e9f0a1b2c3d
```

### Option 3: Use Explorer
Visit [Sui Explorer](https://suiexplorer.com/) and search for:
- Package ID (0x...)
- Object ID (0x...)

## Next Steps

After successful deployment:

1. ✅ Verify `src/config/sui.ts` has correct IDs
2. ✅ Test frontend connection to the AuctionHouse
3. ✅ Run a test transaction to confirm it works
4. ✅ Commit deployment info to git (optional, see below)

## Version Control

### Recommended: Ignore deployment files
Add to `.gitignore`:
```
deployments/
```

This keeps sensitive/temporary info out of version control.

### Alternative: Track deployment history
Commit deployment files to track deployment history:
```bash
git add deployments/
git commit -m "Deployment: AuctionHouse to testnet"
```

## Script Reference

### Usage Examples

```bash
# From command line with output
sui client publish ... | node scripts/parse-sui-deploy.js

# From file
node scripts/parse-sui-deploy.js < deploy-output.txt

# Interactive (paste manually)
node scripts/parse-sui-deploy.js

# With verbose output
SUI_DEPLOY_VERBOSE=1 node scripts/parse-sui-deploy.js
```

### Environment Variables (Advanced)

```bash
# Custom config path
SUI_CONFIG_PATH=src/custom/config.ts node scripts/parse-sui-deploy.js

# Custom deployment directory
SUI_DEPLOY_DIR=./backups node scripts/parse-sui-deploy.js
```

## Related Files

- 📄 `auction_house/Move.toml` - Move package config
- 📄 `auction_house/sources/auction_house.move` - Main module
- 📄 `src/config/sui.ts` - Frontend config (auto-updated)
- 📁 `scripts/parse-sui-deploy.js` - Parser script
- 📁 `deployments/` - Deployment history

## Additional Resources

- [Sui Documentation](https://docs.sui.io/)
- [Move Language Guide](https://move-language.github.io/)
- [Sui CLI Reference](https://docs.sui.io/references/cli)
