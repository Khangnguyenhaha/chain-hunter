# Sui Deployment Architecture

## System Overview

```
┌─────────────────────────────────────────────────────┐
│        sui client publish                           │
│  (Deploys Move code & runs init function)           │
└──────────────────┬──────────────────────────────────┘
                   │
                   │ Output (JSON with object IDs)
                   ▼
┌─────────────────────────────────────────────────────┐
│   parse-sui-deploy.js                               │
│   (Extracts packageId & AuctionHouseId)             │
└──────────────────┬──────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
    ┌────────┐          ┌──────────────┐
    │ Config │          │ Deployment   │
    │ Update │          │ History File │
    └────────┘          └──────────────┘
        │                     │
        ▼                     ▼
  src/config/sui.ts    deployments/*.json
```

---

## Detailed Workflow

### 1. Publish Phase
```
Developer runs:
  $ sui client publish --gas-budget 100000000

Sui blockchain:
  - Compiles Move code
  - Creates Package object
  - Runs init(AUCTION_HOUSE, ctx)
  - Creates AuctionHouse object (shared)
  - Creates Treasury object (shared)
  - Returns transaction details with IDs
```

### 2. Parse Phase
```
Developer runs:
  $ node scripts/parse-sui-deploy.js
  
Parser:
  - Reads CLI output
  - Extracts packageId from "Published Objects"
  - Extracts auctionHouseId from "Shared Objects"
  - Validates both IDs exist
  - Adds timestamp
```

### 3. Configuration Phase
```
Script updates TWO files:

File 1: src/config/sui.ts
  export const PACKAGE_ID = '0x...'
  export const AUCTION_HOUSE_ID = '0x...'

File 2: deployments/deployment-YYYY-MM-DD-timestamp.json
  {
    "packageId": "0x...",
    "auctionHouseObjectId": "0x...",
    "timestamp": "2025-12-26T...",
    "network": "testnet"
  }
```

### 4. Frontend Phase
```
Frontend code imports:
  import { PACKAGE_ID, AUCTION_HOUSE_ID } from '@/config/sui'

Uses IDs in transactions:
  tx.moveCall({
    target: `${PACKAGE_ID}::auction_house::...`,
    arguments: [tx.object(AUCTION_HOUSE_ID), ...]
  })
```

---

## File Structure

```
chain-hunter/
├── auction_house/
│   ├── Move.toml
│   └── sources/
│       ├── auction_house.move  (← Contains init function)
│       ├── item.move
│       └── treasury.move
│
├── scripts/
│   ├── parse-sui-deploy.js    (← Main parser)
│   ├── deploy.sh              (← Mac/Linux wrapper)
│   └── deploy.bat             (← Windows wrapper)
│
├── src/
│   └── config/
│       └── sui.ts             (← Auto-updated by parser)
│
├── deployments/               (← Created by parser)
│   └── deployment-*.json      (← Backup of each deployment)
│
├── DEPLOYMENT_GUIDE.md        (← Full documentation)
├── DEPLOYMENT_QUICK_START.md  (← Quick reference)
└── .gitignore                 (← Includes deployments/)
```

---

## Init Function Details

From `auction_house/sources/auction_house.move`:

```move
fun init(_witness: AUCTION_HOUSE, ctx: &mut TxContext) {
    // 1. Create Treasury
    let treasury = treasury::create(ctx);
    let treasury_id = object::id(&treasury);
    
    // 2. Create AuctionHouse
    let auction_house = AuctionHouse {
        id: object::new(ctx),
        treasury: treasury_id,
        fee_bps: 0,
    };
    
    // 3. Share both objects (make them accessible from other modules)
    transfer::share_object(auction_house);  // ← Parser extracts this ID
    treasury::share(treasury);
}
```

**Key point**: `transfer::share_object()` creates a shared object that:
- Can be accessed by multiple transactions in parallel
- Has a stable object ID
- Is what the parser extracts as `AUCTION_HOUSE_ID`

---

## Parser Logic

### Step 1: Extract Package ID
```javascript
// Pattern: Published Objects followed by ID
const publishedMatch = output.match(/Published Objects:\s*-\s*ID:\s*(0x[a-f0-9]+)/i);
packageId = publishedMatch[1];  // e.g., "0xefe8d731..."
```

### Step 2: Extract AuctionHouse ID
```javascript
// Pattern: Shared Objects followed by ID
const sharedMatch = output.match(/Shared Objects:\s*-\s*ID:\s*(0x[a-f0-9]+)/i);
auctionHouseId = sharedMatch[1];  // e.g., "0x4a8b9c1d..."
```

### Step 3: Update Config
```javascript
// Replace in src/config/sui.ts
content = content.replace(
  /export const PACKAGE_ID = '0x[a-f0-9]+'/,
  `export const PACKAGE_ID = '${packageId}'`
);
```

### Step 4: Save Backup
```javascript
// Save to deployments/deployment-YYYY-MM-DD-timestamp.json
const backupPath = `deployments/deployment-${timestamp}.json`;
fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));
```

---

## Error Handling

The parser gracefully handles:

✅ **Missing Package ID**
```
Error: Could not extract packageId
→ Ensures complete output was pasted
→ Suggests checking for "Published Objects:" section
```

✅ **Missing AuctionHouse ID**
```
Error: Could not extract AuctionHouse objectId
→ Checks if init function ran successfully
→ Suggests increasing gas budget
```

✅ **Config File Not Found**
```
Error: Could not update config file
→ Provides fallback manual update instructions
→ Shows exact IDs for manual entry
```

✅ **Invalid JSON**
```
Error: Invalid JSON output
→ Suggests full output wasn't captured
→ Asks to retry with complete output
```

---

## Security Considerations

### What's Stored
- ✅ Public object IDs (safe to store)
- ✅ Public package IDs (safe to store)
- ✅ Deployment timestamps (for audit trail)

### What's NOT Stored
- ✅ Private keys (never handled)
- ✅ Mnemonic phrases (never handled)
- ✅ Secret credentials (never handled)

### Recommended Git Strategy

**Option 1: Private (Recommended)**
```bash
# .gitignore
deployments/
```
Keep deployment history locally only.

**Option 2: Public (For shared projects)**
```bash
git add deployments/
git commit -m "Deployment: Auction House v1"
```
Track deployment history in version control.

---

## Common Deployment Scenarios

### Scenario 1: Fresh Deployment
```
$ bash scripts/deploy.sh
✓ Publishes new package
✓ Creates new AuctionHouse object
✓ Updates config with new IDs
→ Use case: First deployment to testnet
```

### Scenario 2: Redeployment (Code Changed)
```
$ bash scripts/deploy.sh
✓ Publishes NEW package with new code
✓ Creates NEW AuctionHouse object
✓ Updates config with new IDs
⚠️ Warning: Old package ID won't work
→ Use case: Bug fix or new features
```

### Scenario 3: Manual Extraction (Script Failed)
```
# From published transaction digest
$ sui client object 0xabcd1234...
→ Shows object details including type
→ Manually update src/config/sui.ts
```

### Scenario 4: Multiple Networks
```
# Edit script to detect network:
# sui client execute publish --network testnet
# sui client execute publish --network mainnet

# Or manually set NETWORK env var:
$ SUI_NETWORK=mainnet bash scripts/deploy.sh
```

---

## Integration with CI/CD

Example GitHub Actions workflow:

```yaml
name: Deploy Sui Module
on: [push]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Install Sui CLI
        run: curl -s https://docs.sui.io/install | bash
      
      - name: Publish Module
        run: |
          cd auction_house
          sui client publish --gas-budget 100000000 > output.txt
      
      - name: Parse & Configure
        run: node scripts/parse-sui-deploy.js < auction_house/output.txt
      
      - name: Commit Changes
        run: |
          git config user.name "Deploy Bot"
          git add src/config/sui.ts
          git commit -m "Deployment: Auto-update config"
          git push
```

---

## Troubleshooting Decision Tree

```
Deployment failed?
├─ No output? → Check gas budget
├─ Publishing timeout? → Increase gas budget
├─ Init function failed? → Check Move code for errors
└─ Transaction rejected? → Check account balance

Parsing failed?
├─ "packageId not found"? → Paste full output (including headers)
├─ "AuctionHouse ID not found"? → Check init ran (look for "Shared Objects:")
└─ Both missing? → Publish failed, fix above first

Config update failed?
├─ File not found? → Check src/config/sui.ts exists
├─ File locked? → Close editor, try again
└─ Permission denied? → Check file permissions

Frontend crashes?
├─ "Undefined PACKAGE_ID"? → Check import statement
├─ "Invalid object ID"? → Verify IDs in config match deployment
└─ "Object not found"? → Confirm object ID is correct
```

---

## Summary

1. **Publish**: `sui client publish` creates package & objects
2. **Parse**: `parse-sui-deploy.js` extracts IDs from output
3. **Configure**: Script updates `src/config/sui.ts` automatically
4. **Use**: Frontend imports IDs from config file
5. **Backup**: Deployment history saved in `deployments/`

**Result**: Frontend always uses correct IDs, no manual config needed! 🚀
