# Implementation Locations Reference

## Quick Navigation

### File: [src/ChainHunter.jsx](src/ChainHunter.jsx)

#### Configuration Update
**Lines 643-656:** AUCTION_HOUSE_CONFIG
- Added `treasuryId: '0x...'` field
- **Purpose:** Store Treasury object ID for claim_seller transactions

#### Feature 1: Create Auction
**Lines 728-807:** `createAuction(item, durationMs)`
- **Purpose:** List item on auction house
- **Returns:** auctionId (from transaction effects)
- **Move Target:** `auction_house::create`
- **Arguments:** [item, duration_ms, clock]

#### Feature 2: Claim Item
**Lines 809-860:** `claimItem(auctionId)`
- **Purpose:** Winner claims purchased item
- **Preconditions:** Auction ended, caller is highest_bidder
- **Move Target:** `auction_house::claim_item`
- **Arguments:** [auction]

#### Feature 3: Claim Seller Proceeds
**Lines 862-923:** `claimSellerProceeds(auctionId, treasuryId)`
- **Purpose:** Seller claims payment (minus fee)
- **Preconditions:** Auction ended, caller is seller
- **Move Target:** `auction_house::claim_seller`
- **Arguments:** [auction, treasury]

#### Feature 4: Query Events (Optional)
**Lines 925-953:** `queryAuctionEvents(auctionId)`
- **Purpose:** Template for querying on-chain events
- **Events Available:** ListItemEvent, BuyItemEvent, CancelListingEvent

---

## Imports (No Changes Needed)

All imports are already in place:
```javascript
// Line 3: Hook already imported
import { useSignAndExecuteTransactionBlock } from '@mysten/dapp-kit';

// Line 4: TransactionBlock already imported
import { TransactionBlock } from '@mysten/sui.js/transactions';
```

---

## Existing Functions Used

These functions are called by the new features:

1. **addLog()** - Adds message to combat log
   - Used for: User feedback and logging

2. **openConnectModal()** - Opens wallet connect
   - Used for: Prompting wallet connection

3. **executeTransactionBlock()** - Executes signed transaction
   - Used for: All Move function calls

4. **AUCTION_HOUSE_CONFIG** - Configuration object
   - Used for: packageId, clockId, treasuryId, auctionIds

---

## Constants Used

### Clock Object ID
```javascript
const clock = tx.object('0x6');  // Standard Sui system clock
```

### MIST Conversion (in existing buyMysticalItem)
```javascript
const paymentAmount = item.price * 1_000_000_000;  // SUI to MIST
```

---

## Transaction Pattern

All new functions follow this pattern:

```javascript
const tx = new TransactionBlock();
// Get objects
const obj = tx.object(objectId);
// Call Move function
tx.moveCall({
  target: `${packageId}::module::function`,
  arguments: [arg1, arg2],
});
// Execute
executeTransactionBlock({ transactionBlock: tx }, { onSuccess, onError });
```

---

## Error Handling Pattern

All new functions include:

```javascript
// 1. Wallet check
if (!currentAccount) { openConnectModal(); return; }

// 2. Config validation
if (!AUCTION_HOUSE_CONFIG.packageId) { addLog('error'); return; }

// 3. Parameter validation
if (!auctionId || auctionId === '0x...') { addLog('error'); return; }

// 4. Try/catch
try {
  // Build transaction
} catch (e) {
  addLog('error');
}

// 5. Callback handlers
onSuccess: (result) => { addLog('success'); },
onError: (error) => { addLog('error'); }
```

---

## Configuration Required After Implementation

### 1. Get Package ID
```bash
cd auction_house
sui client publish --gas-budget 100000000
# Output: Package ID: 0x...
# Copy to AUCTION_HOUSE_CONFIG.packageId
```

### 2. Get Treasury ID
```bash
# From init() events or:
sui client object <auction-house-id>
# Find Treasury ID: 0x...
# Copy to AUCTION_HOUSE_CONFIG.treasuryId
```

### 3. Create Auction Objects
```javascript
// Call: createAuction(item)
// Get returned auctionId: 0x...
// Copy to AUCTION_HOUSE_CONFIG.auctionIds['item_id']
```

### 4. Final Config
```javascript
const AUCTION_HOUSE_CONFIG = {
  packageId: '0x...FROM_PUBLISH',      // Required
  clockId: '0x6',                       // Standard
  treasuryId: '0x...FROM_INIT',         // Required for claimSellerProceeds
  auctionIds: {
    'mys_01': '0x...FROM_CREATE',       // Required for claimItem/claimSellerProceeds
    'mys_02': '0x...FROM_CREATE',
  }
};
```

---

## Function Call Examples

### Example 1: Create Auction
```javascript
// In UI component
<button onClick={() => createAuction(mysticalItem)}>
  Create Auction
</button>

// In handler
createAuction(item, 86400000);  // 24 hours in milliseconds
// Returns: auctionId in logs and transaction effects
```

### Example 2: Place Bid (Existing)
```javascript
// Existing buyMysticalItem function
<button onClick={() => buyMysticalItem(item)}>
  Place Bid
</button>

buyMysticalItem(item);
// Calls: auction_house::bid
// Updates: highest_bidder, highest_bid
```

### Example 3: Claim Item (Winner)
```javascript
// In UI component
const auctionId = AUCTION_HOUSE_CONFIG.auctionIds['mys_01'];
<button onClick={() => claimItem(auctionId)}>
  Claim Item
</button>

// In handler
claimItem(auctionId);
// Transfers: Item to highest_bidder
// Requires: Caller is highest_bidder, auction ended
```

### Example 4: Claim Payment (Seller)
```javascript
// In UI component
<button onClick={() => claimSellerProceeds(auctionId, AUCTION_HOUSE_CONFIG.treasuryId)}>
  Claim Payment
</button>

// In handler
claimSellerProceeds(auctionId, AUCTION_HOUSE_CONFIG.treasuryId);
// Transfers: Coin to seller (minus fee)
// Requires: Caller is seller, auction ended, has payment
```

### Example 5: Query Events (Optional)
```javascript
// In UI component
<button onClick={() => queryAuctionEvents(auctionId)}>
  View Events
</button>

// In handler
queryAuctionEvents(auctionId);
// Shows: Event query template
// Future: Integrate SuiClient for real queries
```

---

## Testing Checklist

- [ ] Update AUCTION_HOUSE_CONFIG.packageId
- [ ] Update AUCTION_HOUSE_CONFIG.treasuryId
- [ ] Create auction: `createAuction(item)`
- [ ] Update AUCTION_HOUSE_CONFIG.auctionIds with returned ID
- [ ] Place bid: `buyMysticalItem(item)`
- [ ] Wait for auction.end_time
- [ ] Claim item: `claimItem(auctionId)`
- [ ] Claim payment: `claimSellerProceeds(auctionId, treasuryId)`
- [ ] Verify on-chain: `sui client object <id>`
- [ ] Query events: `queryAuctionEvents(auctionId)`

---

## Debugging Guide

### Issue: "Auction house not configured"
**Solution:** Update AUCTION_HOUSE_CONFIG with real IDs from deployment

### Issue: "Invalid auction ID"
**Solution:** Run createAuction() first, copy returned auctionId to config

### Issue: "You are not the highest bidder"
**Solution:** Only the highest bidder can claim the item

### Issue: "Auction hasn't ended yet"
**Solution:** Wait for clock.timestamp_ms() > auction.end_time

### Issue: "You are not the seller"
**Solution:** Only the seller who created the auction can claim proceeds

### Issue: "No bids received"
**Solution:** At least one bid required before seller can claim

---

## Performance Notes

1. **Transaction Building:** ~50ms
2. **Wallet Signing:** User-dependent (typically 2-5 seconds)
3. **Block Confirmation:** ~1 second on Sui testnet
4. **Total Time:** ~3-6 seconds per transaction

---

## Security Considerations

✅ All validations happen on-chain in Move contract
✅ No private keys handled in frontend
✅ All transactions signed by user via wallet
✅ No double-claiming possible (checked on-chain)
✅ Only buyer can claim item (checked on-chain)
✅ Only seller can claim payment (checked on-chain)

---

## Move Contract Integration

### Functions Called

1. **auction_house::create()**
   - Called by: `createAuction()`
   - Returns: Auction object
   - Emits: ListItemEvent

2. **auction_house::bid()**
   - Called by: `buyMysticalItem()` [existing]
   - Updates: Auction highest_bid, highest_bidder
   - Emits: BuyItemEvent

3. **auction_house::claim_item()**
   - Called by: `claimItem()`
   - Transfers: Item to highest_bidder
   - Validates: Auction ended, item unclaimed, caller is winner

4. **auction_house::claim_seller()**
   - Called by: `claimSellerProceeds()`
   - Transfers: Payment to seller (minus fee)
   - Validates: Auction ended, payment unclaimed, caller is seller

### Events Emitted

1. **ListItemEvent** - When item listed
   - Fields: auction_id, seller, item_id, end_time

2. **BuyItemEvent** - When bid placed
   - Fields: auction_id, buyer, amount

3. **CancelListingEvent** - When cancelled
   - Fields: auction_id, seller

---

## File Statistics

| Aspect | Count |
|--------|-------|
| Functions Added | 4 |
| Config Fields Added | 1 |
| Total Lines Added | 224 |
| Move Contracts Changed | 0 |
| Breaking Changes | 0 |
| New Imports Needed | 0 |

