# Auction House Init - Quick Reference

## What Was Implemented

**Complete initialization flow for the AuctionHouse smart contract:**

```
No Init → Call init → Wait for effects → Extract objectId → Save to localStorage → Ready to use
```

---

## Files

| File | Purpose | Status |
|------|---------|--------|
| `src/hooks/useAuctionHouseInit.js` | Main hook with init logic | ✅ Created |
| `src/ChainHunter.jsx` | Integrated hook + updated imports | ✅ Updated |
| `src/config/sui.ts` | Already has PACKAGE_ID & AUCTION_HOUSE_ID | ✅ Ready |

---

## The Hook: `useAuctionHouseInit()`

### Import
```javascript
import { useAuctionHouseInit } from './hooks/useAuctionHouseInit';
```

### Usage
```javascript
const { initializeAuctionHouse } = useAuctionHouseInit();

initializeAuctionHouse({
  packageId: '0xefe8d731...',  // From config or user input
  onSuccess: (objectId) => {
    console.log('✅ Ready:', objectId);
    // Update state, UI, etc.
  },
  onError: (error) => {
    console.error('❌ Failed:', error.message);
  },
  onLoading: (isLoading) => {
    // Show spinner, disable buttons, etc.
  },
});
```

---

## What Happens Internally

### 1. Validate
- PackageId exists?
- Wallet connected?
- Not already initialized?

### 2. Create Transaction
```javascript
const tx = new Transaction();
tx.moveCall({
  target: `${packageId}::auction_house::init`,
  arguments: [],
});
```

### 3. Execute
- User signs in wallet
- Transaction submitted to Sui
- Wait for confirmation

### 4. Parse Response
Uses `extractAuctionHouseObjectId()` to find the created object:

```
Check response.objectChanges[] array
  ↓ (if not found)
Check response.effects.created[] array
  ↓ (if not found)
Check response.objectId directly
```

### 5. Save to localStorage
```javascript
localStorage.setItem('chain_hunter_auction_house_id', '0x4a8b9c1d...');
```

### 6. Update UI
- Callback: `onSuccess(objectId)`
- Component updates state
- UI re-renders with new ID

---

## Key Function: `extractAuctionHouseObjectId(response)`

Exported from hook, can be used standalone:

```javascript
import { extractAuctionHouseObjectId } from './hooks/useAuctionHouseInit';

const response = await someTransactionCall();
const objectId = extractAuctionHouseObjectId(response);

if (objectId) {
  console.log('Found:', objectId);  // 0x4a8b9c1d...
} else {
  console.log('Not found in response');
}
```

---

## Data Saved to localStorage

**Key:** `chain_hunter_auction_house_id`  
**Value:** `0x4a8b9c1d2e3f4a5b6c7d8e9f0a1b2c3d`  
**Persists:** Across page reloads  
**Used by:** `useGameState` hook to restore state

```javascript
// Verify it's saved
const saved = localStorage.getItem('chain_hunter_auction_house_id');
console.log(saved);  // 0x4a8b9c1d2e3f4a5b6c7d8e9f0a1b2c3d
```

---

## Error Messages (User-Facing)

| Message | Next Step |
|---------|-----------|
| "Auction house already initialized" | Either (A) it really is already initialized, or (B) clear localStorage entry |
| "Not connected" | Click "Connect Wallet" button |
| "Please enter a valid Package ID" | Deploy contract, copy packageId from deployment |
| "Transaction successful but could not extract AuctionHouse object ID" | Check transaction receipt in explorer, adjust parsing logic if needed |
| "On-chain error: [message]" | Review error in wallet/explorer, check gas budget, retry |

---

## Current Flow in ChainHunter.jsx

### Auto-Initialize (Line ~495)
```javascript
useEffect(() => {
  if (autoInitAttempted.current) return;
  if (currentAccount && packageIdInput && !auctionHouseId && 
      auctionHouseStatus === 'idle') {
    autoInitAttempted.current = true;
    console.log('🔄 Auto-initializing...');
    manualInitializeAuctionHouse();  // ← Calls the hook
  }
}, [currentAccount, packageIdInput, auctionHouseId, auctionHouseStatus]);
```

### Manual Initialize (Line ~405)
```javascript
const manualInitializeAuctionHouse = () => {
  // Validation
  if (auctionHouseId) {
    setInitError('Already initialized');
    return;
  }
  
  // ... more validation ...
  
  // Call hook
  initializeAuctionHouse({
    packageId: packageIdInput,
    onSuccess: (objectId) => {
      setAuctionHouseId(objectId);
      setAuctionHouseStatus('initialized');
      addLog(`✅ Auction House Live: ${objectId.slice(0, 10)}...`, 'victory');
    },
    onError: (error) => {
      setAuctionHouseStatus('failed');
      setInitError(error?.message || 'Unknown error');
    },
  });
};
```

---

## Testing Steps

### Step 1: Fresh Start
```bash
# Clear localStorage
localStorage.clear();

# Reload page
location.reload();
```

### Step 2: Connect Wallet
- Click "Connect Wallet"
- Select wallet
- Sign transaction

### Step 3: Check State
```javascript
console.log({
  auctionHouseId: localStorage.getItem('chain_hunter_auction_house_id'),
  status: 'initialized',
});
```

### Step 4: Verify in Game
- Marketplace should be enabled
- Can create/view auctions
- ID persists on reload

---

## Network & Gas

The init function is lightweight:

```move
public fun init(ctx: &mut TxContext) {
    let auction_house = AuctionHouse { ... };
    transfer::share_object(auction_house);  // Single operation
}
```

**Estimated gas:** ~1,000,000 units (Sui testnet is generous)

---

## Sui SDK Version

Uses **@mysten/sui** (not @mysten/sui.js):

```javascript
import { Transaction } from '@mysten/sui/transactions';  // ✅ Correct
import { TransactionBlock } from '@mysten/sui.js/transactions';  // ❌ Old
```

The hook handles both response formats for compatibility.

---

## localStorage Isolation

Only one key per game:

```javascript
chain_hunter_auction_house_id → '0x4a8b9c1d...'
```

Other game state stored separately:

```javascript
chain_hunter_player
chain_hunter_inventory
chain_hunter_marketplace
// ... etc
```

Safe to clear one without affecting others.

---

## Debugging Tips

### See full response:
```javascript
// In useAuctionHouseInit.js, line ~60:
console.log('🔍 Full response:', response);
console.log('🔍 objectChanges:', response.objectChanges);
console.log('🔍 effects.created:', response.effects?.created);
```

### Check parsing:
```javascript
// In extractAuctionHouseObjectId():
console.log('Extracted ID:', extractedId);
console.log('Is valid hex?', /^0x[a-f0-9]+$/.test(extractedId));
```

### Verify localStorage:
```javascript
Object.keys(localStorage)
  .filter(k => k.startsWith('chain_hunter'))
  .forEach(k => console.log(k, localStorage.getItem(k)));
```

---

## Next: How to Deploy & Test

1. **Deploy contract:**
   ```bash
   cd auction_house
   sui client publish --gas-budget 100000000
   ```

2. **Parse & save packageId:**
   ```bash
   cd ..
   node scripts/parse-sui-deploy.js
   ```

3. **Load game:**
   - Go to frontend
   - Connect wallet (if not already)
   - PackageId auto-loads from config
   - Should auto-initialize AuctionHouse
   - Check console logs for ID

4. **Verify:**
   - Look for "✅ Auction House Live" message
   - Check `localStorage.getItem('chain_hunter_auction_house_id')`
   - Reload page → ID persists

---

## Summary

| What | Where | Status |
|------|-------|--------|
| Init Hook | `src/hooks/useAuctionHouseInit.js` | ✅ Ready |
| Component Integration | `src/ChainHunter.jsx` | ✅ Ready |
| Config | `src/config/sui.ts` | ✅ Ready |
| Docs | `AUCTION_HOUSE_INITIALIZATION.md` | ✅ Complete |

**Next:** Deploy contract and test the flow! 🚀

---

## One-Liner Test

After deployment, open browser console and run:

```javascript
console.log('Init ready:', localStorage.getItem('chain_hunter_auction_house_id') !== null);
```

Should print: `Init ready: true` ✅
