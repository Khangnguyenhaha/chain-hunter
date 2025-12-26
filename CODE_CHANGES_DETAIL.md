# Exact Code Changes Summary

## File: src/ChainHunter.jsx

### Change 1: Extended AUCTION_HOUSE_CONFIG (Lines 643-656)

**Added:**
```javascript
treasuryId: '0x...', // Treasury object ID (created by init function)
```

**Context:**
```javascript
const AUCTION_HOUSE_CONFIG = {
  packageId: '0x...', 
  clockId: '0x6',
  treasuryId: '0x...', // ← NEW
  auctionIds: {
    'mys_01': '0x...',
    'mys_02': '0x...',
  }
};
```

---

### Change 2: Added createAuction() Function (Lines 728-807)

**New Function Signature:**
```javascript
const createAuction = (item, durationMs = 86400000) => {
  // 80 lines of implementation
}
```

**Key Operations:**
1. Validates wallet connection
2. Validates AUCTION_HOUSE_CONFIG
3. Creates TransactionBlock
4. Gets Clock object
5. Calls `auction_house::create` Move function
6. Executes transaction with success/error handling
7. Logs auction ID from transaction effects

**Success Response:**
- Extracts auctionId from `result.effects.created[0].reference.objectId`
- Provides instructions to save ID in config

**Error Handling:**
- Wallet not connected → opens connect modal
- Package not configured → error message
- Transaction failure → detailed error with tx hash

---

### Change 3: Added claimItem() Function (Lines 809-860)

**New Function Signature:**
```javascript
const claimItem = (auctionId) => {
  // 52 lines of implementation
}
```

**Key Operations:**
1. Validates wallet connection
2. Validates AUCTION_HOUSE_CONFIG and auctionId
3. Creates TransactionBlock
4. Gets Auction object reference
5. Calls `auction_house::claim_item` Move function
6. Executes transaction with success/error handling

**Move Validations (executed on-chain):**
- `assert!(auction.ended, E_ENDED)` - auction must be complete
- `assert!(!auction.claimed_item, E_CLAIMED)` - item not yet claimed
- `assert!(auction.highest_bidder == sender, E_CLAIMED)` - caller must be winner

**Success Response:**
- Confirms item transfer with tx hash
- Updates UI to show acquired item

**Error Messages:**
- Auction hasn't ended → "⚠️ Auction hasn't ended yet."
- Item already claimed → "⚠️ Item already claimed by you."
- Not highest bidder → "⚠️ You are not the highest bidder."

---

### Change 4: Added claimSellerProceeds() Function (Lines 862-923)

**New Function Signature:**
```javascript
const claimSellerProceeds = (auctionId, treasuryId) => {
  // 62 lines of implementation
}
```

**Key Operations:**
1. Validates wallet connection
2. Validates AUCTION_HOUSE_CONFIG, auctionId, and treasuryId
3. Creates TransactionBlock
4. Gets Auction and Treasury object references
5. Calls `auction_house::claim_seller` Move function
6. Executes transaction with success/error handling

**Move Validations (executed on-chain):**
- `assert!(auction.ended, E_ENDED)` - auction must be complete
- `assert!(!auction.claimed_coin, E_CLAIMED)` - payment not yet claimed
- `assert!(option::is_some(&auction.payment), E_NO_PAYMENT)` - at least one bid
- `assert!(auction.seller == sender, E_CLAIMED)` - caller must be seller

**Fee Handling:**
- Calls `treasury::collect_fee(treasury, payment, ctx)`
- Splits payment and takes configured fee (0 BPS = 0%)
- Transfers remainder to seller

**Success Response:**
- Confirms payment transfer with tx hash
- Shows fee deduction (currently 0%)

**Error Messages:**
- Auction hasn't ended → "⚠️ Auction hasn't ended yet."
- Payment already claimed → "⚠️ Payment already claimed by you."
- No bids received → "⚠️ No bids received for this auction."
- Not seller → "⚠️ You are not the seller."

---

### Change 5: Added queryAuctionEvents() Function (Lines 925-953) [OPTIONAL]

**New Function Signature:**
```javascript
const queryAuctionEvents = async (auctionId) => {
  // 29 lines of documentation and placeholder
}
```

**Purpose:**
- Template for querying on-chain events
- Shows how to use SuiClient for event verification

**Events to Query:**
1. `ListItemEvent` - emitted by `create()`
   - Contains: auction_id, seller, item_id, end_time
2. `BuyItemEvent` - emitted by `bid()`
   - Contains: auction_id, buyer, amount
3. `CancelListingEvent` - emitted when listing cancelled
   - Contains: auction_id, seller

**To Enable:**
```javascript
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';

const client = new SuiClient({ url: getFullnodeUrl('testnet') });

const events = await client.queryEvents({
  query: {
    MoveEventType: `${AUCTION_HOUSE_CONFIG.packageId}::auction_house::ListItemEvent`
  }
});
```

---

## Summary of Additions

| Addition | Type | Lines | Purpose |
|----------|------|-------|---------|
| treasuryId field | Config | 1 | Enable seller claims |
| createAuction() | Function | 80 | List items for auction |
| claimItem() | Function | 52 | Winner claims item |
| claimSellerProceeds() | Function | 62 | Seller claims payment |
| queryAuctionEvents() | Function | 29 | Query on-chain events |

**Total Added:** 224 lines of code + documentation

---

## No Breaking Changes

✅ All existing functions remain unchanged:
- `buyMysticalItem()` - Still works for bidding
- `buyFromGoldShop()` - Still works for gold shop
- All combat and inventory functions - Still work
- Event handlers - Still work

✅ Move contracts unchanged:
- `auction_house.move` - Same (exit code 0)
- `item.move` - Same
- `treasury.move` - Same

