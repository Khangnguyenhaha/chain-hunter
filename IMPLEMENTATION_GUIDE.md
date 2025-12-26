# ChainHunter Auction House Implementation Guide

## Summary of Changes

All changes made to **[src/ChainHunter.jsx](src/ChainHunter.jsx)** - NO Move contract changes.

---

## 1. Extended AUCTION_HOUSE_CONFIG

**Location:** Lines 643-656

**What Changed:**
Added `treasuryId` field to support seller proceeds claiming.

```javascript
const AUCTION_HOUSE_CONFIG = {
  packageId: '0x...', // YOUR published package ID
  clockId: '0x6',     // Sui system clock (standard)
  treasuryId: '0x...', // Treasury object ID (from init function)
  auctionIds: {
    'mys_01': '0x...', // Auction object IDs
    'mys_02': '0x...',
  }
};
```

**Required Configuration After Deployment:**
1. Deploy Move module: `cd auction_house && sui client publish --gas-budget 100000000`
2. Copy `packageId` from deployment output
3. Copy `treasuryId` from the created Treasury object (emit from `init()`)
4. For each item, create an auction and copy the `auctionId`

---

## 2. Feature 1: Create Auction

**Function:** `createAuction(item, durationMs)`

**Location:** Lines 728-807

**Purpose:** Lists an item on the auction house for bidding.

```javascript
createAuction(item, 86400000); // List for 24 hours (in milliseconds)
```

**How It Works:**
1. Validates wallet connection and config
2. Creates TransactionBlock
3. Gets Clock object (standard Sui system clock)
4. Calls `auction_house::create` Move function
5. Returns auction object ID in transaction effects
6. Logs auction ID for storage in config

**Return Value:** 
- On success: Extracts `auctionId` from `result.effects.created[0].reference.objectId`
- User must manually add to `AUCTION_HOUSE_CONFIG.auctionIds`

**Usage:**
```javascript
<button onClick={() => createAuction(mysticalItem)}>
  List for Auction
</button>
```

---

## 3. Feature 2: Claim Item (Buyer)

**Function:** `claimItem(auctionId)`

**Location:** Lines 809-860

**Purpose:** Winner of auction claims their purchased item (after auction ends).

```javascript
claimItem('0xauctionObjectId');
```

**How It Works:**
1. Validates wallet connection and config
2. Checks auction ID is valid (not placeholder)
3. Creates TransactionBlock
4. Gets Auction object reference
5. Calls `auction_house::claim_item` Move function
6. Move function validates:
   - Auction has ended
   - Caller is highest bidder
   - Item not already claimed
7. Transfers Item to highest bidder

**Error Handling:**
- `E_ENDED`: Auction hasn't ended yet
- `E_CLAIMED`: Item already claimed
- `E_CLAIMED`: You are not the highest bidder

**Usage:**
```javascript
<button onClick={() => claimItem(auctionId)}>
  Claim Item (Winner)
</button>
```

---

## 4. Feature 3: Claim Seller Proceeds

**Function:** `claimSellerProceeds(auctionId, treasuryId)`

**Location:** Lines 862-923

**Purpose:** Seller of auction claims payment (minus platform fee).

```javascript
claimSellerProceeds('0xauctionId', '0xtreasury');
```

**How It Works:**
1. Validates wallet connection and config
2. Checks auction ID and treasury ID are valid
3. Creates TransactionBlock
4. Gets Auction and Treasury object references
5. Calls `auction_house::claim_seller` Move function
6. Move function validates:
   - Auction has ended
   - Caller is seller
   - Payment not already claimed
   - At least one bid was received
7. Calls `treasury::collect_fee()` to split payment and take fee
8. Transfers seller portion to seller

**Fee Structure:**
- Configured in Move module (currently 0 BPS = 0%)
- Can be updated in treasury

**Error Handling:**
- `E_ENDED`: Auction hasn't ended yet
- `E_CLAIMED`: Payment already claimed
- `E_NO_PAYMENT`: No bids received
- `E_CLAIMED`: You are not the seller

**Usage:**
```javascript
<button onClick={() => claimSellerProceeds(auctionId, treasuryId)}>
  Claim Payment (Seller)
</button>
```

---

## 5. Feature 3 (Optional): Query Events

**Function:** `queryAuctionEvents(auctionId)`

**Location:** Lines 925-953

**Purpose:** Query on-chain events to verify auction state.

```javascript
await queryAuctionEvents('0xauctionId');
```

**How It Works:**
1. Currently a placeholder with documentation
2. Shows pattern for querying:
   - `ListItemEvent` (when auction created)
   - `BuyItemEvent` (when bid placed)
   - `CancelListingEvent` (when auction cancelled)

**To Enable Event Queries:**
```javascript
// Add to your dapp-kit setup:
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';

const client = new SuiClient({ url: getFullnodeUrl('testnet') });

// Then in queryAuctionEvents:
const events = await client.queryEvents({
  query: {
    MoveEventType: `${AUCTION_HOUSE_CONFIG.packageId}::auction_house::ListItemEvent`
  }
});
```

---

## Integration Flow

### Step 1: Deploy Move Module
```bash
cd auction_house
sui client publish --gas-budget 100000000
```

### Step 2: Configure IDs
Update [src/ChainHunter.jsx](src/ChainHunter.jsx) lines 643-656:
```javascript
const AUCTION_HOUSE_CONFIG = {
  packageId: '0xYOUR_PACKAGE_ID',     // From deployment
  clockId: '0x6',
  treasuryId: '0xYOUR_TREASURY_ID',   // From init() event
  auctionIds: {
    'mys_01': '0xAUCTION_1_ID',       // From createAuction transactions
    'mys_02': '0xAUCTION_2_ID',
  }
};
```

### Step 3: Use in UI Components

**Example: List Item for Auction**
```jsx
<button onClick={() => createAuction(item)}>
  📋 List for Auction
</button>
```

**Example: Claim After Winning**
```jsx
const auctionId = AUCTION_HOUSE_CONFIG.auctionIds[item.id];
<button onClick={() => claimItem(auctionId)}>
  🎁 Claim Item
</button>
```

**Example: Claim Seller Payment**
```jsx
<button onClick={() => claimSellerProceeds(auctionId, AUCTION_HOUSE_CONFIG.treasuryId)}>
  💰 Claim Payment
</button>
```

---

## Transaction Details

### createAuction Transaction
```
Target: {packageId}::auction_house::create
Arguments:
  - item: Item (must be real on-chain object)
  - duration_ms: u64 (in milliseconds)
  - clock: &Clock (0x6)
Returns: Auction object
Emits: ListItemEvent
```

### bid (Existing, in buyMysticalItem)
```
Target: {packageId}::auction_house::bid
Arguments:
  - auction: &mut Auction
  - payment: Coin<SUI> (split from gas)
  - clock: &Clock
Emits: BuyItemEvent
```

### claimItem Transaction
```
Target: {packageId}::auction_house::claim_item
Arguments:
  - auction: &mut Auction
Caller: must be highest_bidder
Transfers: Item to highest_bidder
```

### claimSellerProceeds Transaction
```
Target: {packageId}::auction_house::claim_seller
Arguments:
  - auction: &mut Auction
  - treasury: &mut Treasury
Caller: must be seller
Transfers: Coin<SUI> to seller (after fee)
```

---

## Move Contract Reference

All Move functions are in `auction_house::` module:

| Function | Caller | Preconditions | Effect |
|----------|--------|---------------|--------|
| `create()` | Anyone | - | Creates Auction, emits ListItemEvent |
| `bid()` | Anyone | Clock < end_time, bid > highest_bid | Updates highest_bidder, refunds previous |
| `claim_item()` | Highest bidder | Auction ended, item unclaimed | Transfers Item to winner |
| `claim_seller()` | Seller | Auction ended, has payment | Transfers coins (minus fee) to seller |

---

## Testing Checklist

- [ ] Deploy Move module and capture package ID
- [ ] Capture treasury ID from init() 
- [ ] Create auction with `createAuction()`
- [ ] Verify auction ID appears in transaction effects
- [ ] Bid on auction with `buyMysticalItem()` (existing)
- [ ] Wait for auction end time
- [ ] Claim item with `claimItem()` as winner
- [ ] Claim proceeds with `claimSellerProceeds()` as seller
- [ ] Verify coin transfer with `sui client object <coin-id>`
- [ ] Query events with `queryAuctionEvents()` (optional)

---

## No Changes to Move Contracts

✅ `auction_house.move` - Unchanged
✅ `item.move` - Unchanged  
✅ `treasury.move` - Unchanged

All changes are frontend-only to [src/ChainHunter.jsx](src/ChainHunter.jsx).

