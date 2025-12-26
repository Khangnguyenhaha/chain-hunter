# Visual Architecture: Auction House Integration

## Component Hierarchy

```
ChainHunter (Main Game Component)
├── Wallet Integration
│   ├── useCurrentAccount() → Get user address
│   ├── useConnectWallet() → Open wallet modal
│   └── useSignAndExecuteTransactionBlock() → Execute on-chain
│
├── Configuration
│   └── AUCTION_HOUSE_CONFIG
│       ├── packageId: '0x...' (from deployment)
│       ├── clockId: '0x6' (standard)
│       ├── treasuryId: '0x...' (from init)
│       └── auctionIds: {} (from createAuction)
│
└── Auction House Functions
    ├── createAuction(item, duration)
    │   └── Calls: auction_house::create
    │       └── Returns: auctionId
    │
    ├── buyMysticalItem(item) [EXISTING]
    │   └── Calls: auction_house::bid
    │       └── Updates: highest_bidder
    │
    ├── claimItem(auctionId) [NEW]
    │   └── Calls: auction_house::claim_item
    │       └── Transfers: Item to winner
    │
    ├── claimSellerProceeds(auctionId, treasuryId) [NEW]
    │   └── Calls: auction_house::claim_seller
    │       └── Transfers: Payment (minus fee)
    │
    └── queryAuctionEvents(auctionId) [OPTIONAL]
        └── Queries: ListItemEvent, BuyItemEvent
```

---

## Transaction Flow Diagram

### Single Auction Lifecycle

```
                    ┌─────────────────┐
                    │ LISTING PHASE   │
                    └────────┬────────┘
                             │
                    ┌────────▼─────────┐
                    │ createAuction()  │
                    │                  │
                    │ Emit:            │
                    │ ListItemEvent    │
                    └────────┬─────────┘
                             │
                    ┌────────▼────────────┐
                    │ BIDDING PHASE      │
                    │ (Until end_time)   │
                    └────────┬───────────┘
                             │
                    ┌────────▼──────────────┐
                    │ buyMysticalItem()    │
                    │ (Place bids)         │
                    │                      │
                    │ Emit: BuyItemEvent   │
                    │ Updates: highest_bid │
                    │ Updates: highest_    │
                    │          bidder      │
                    │ Refunds: old bids    │
                    └────────┬─────────────┘
                             │
                    ┌────────▼──────────┐
                    │ CLAIMING PHASE   │
                    │ (After end_time) │
                    └────────┬─────────┘
                             │
                  ┌──────────┴──────────┐
                  │                     │
        ┌─────────▼──────────┐ ┌────────▼──────────────┐
        │ claimItem()        │ │ claimSellerProceeds()│
        │ (By Winner)        │ │ (By Seller)          │
        │                    │ │                      │
        │ Transfer: Item     │ │ Transfer: Coin SUI   │
        │ To: highest_bidder │ │ To: seller           │
        │ After: fee split   │ │                      │
        └────────┬───────────┘ └────────┬─────────────┘
                 │                      │
        ┌────────▼──────────────────────▼─────┐
        │         AUCTION COMPLETE            │
        │ Item in Winner's inventory          │
        │ Payment in Seller's wallet          │
        └─────────────────────────────────────┘
```

---

## Data Flow: Function Parameters & Returns

### createAuction()
```
INPUT:
├── item: Object
│   ├── id: string
│   ├── name: string
│   ├── price: number
│   └── ...
├── durationMs: number (default 86400000 = 24h)
└── currentAccount: wallet address

MOVE EXECUTION:
├── Create Auction struct
├── Emit ListItemEvent
└── Return Auction object (on-chain)

OUTPUT:
├── Transaction digest
└── Auction ID (extracted from effects.created)
```

### buyMysticalItem(item) [EXISTING]
```
INPUT:
├── item: Object
│   ├── id: string
│   ├── name: string
│   ├── price: number (in SUI)
│   └── ...
└── currentAccount: wallet address

MOVE EXECUTION:
├── Validate: bid > highest_bid
├── Refund: previous highest_bidder
├── Update: highest_bidder = sender
├── Update: highest_bid = amount
├── Emit BuyItemEvent
└── Store: payment coin

OUTPUT:
├── Transaction digest
└── Updated Auction object
```

### claimItem(auctionId)
```
INPUT:
├── auctionId: string (0xABC...)
└── currentAccount: wallet address

MOVE EXECUTION:
├── Validate: auction.ended == true
├── Validate: auction.claimed_item == false
├── Validate: sender == highest_bidder
├── Transfer: item to highest_bidder
└── Set: claimed_item = true

OUTPUT:
├── Transaction digest
└── Item received in wallet
```

### claimSellerProceeds(auctionId, treasuryId)
```
INPUT:
├── auctionId: string (0xABC...)
├── treasuryId: string (0xTREAS...)
└── currentAccount: wallet address

MOVE EXECUTION:
├── Validate: auction.ended == true
├── Validate: auction.claimed_coin == false
├── Validate: sender == seller
├── Validate: has payment (at least one bid)
├── Call: treasury.collect_fee()
│   ├── Split: payment into [fee, remainder]
│   ├── Add: fee to treasury.balance
│   └── Return: remainder coin
├── Transfer: remainder to seller
└── Set: claimed_coin = true

OUTPUT:
├── Transaction digest
└── Coin received in wallet
```

---

## Error State Handling

### All Functions Follow This Pattern:

```
Try to Execute:
├── Check: wallet connected
│   └── If not: open connect modal
├── Check: config valid (packageId, IDs)
│   └── If not: show error
├── Check: parameters valid (auctionId, etc)
│   └── If not: show error
├── Build: TransactionBlock
│   └── If error: catch & show
├── Execute: via wallet
│   ├── onSuccess: 
│   │   ├── Extract result
│   │   ├── Log success message
│   │   ├── Emit new event / update state
│   │   └── Show tx digest
│   └── onError:
│       ├── Get error message
│       ├── Log with emoji
│       ├── Show helpful message
│       └── No state change
└── Output: User sees clear success/failure
```

---

## State Management

### React State (Off-Chain)
```javascript
inventory[]         // User's items
player{}            // User stats
combatLog[]         // Combat history
shopTab: string     // UI state
// ... other game state
```

### On-Chain State (Auction House)
```move
Auction {
  seller: address
  item: Option<Item>
  highest_bid: u64
  highest_bidder: address
  payment: Option<Coin<SUI>>
  end_time: u64
  ended: bool
  claimed_item: bool
  claimed_coin: bool
}
```

### Sync Pattern:
```
User Action (UI)
     │
     ▼
Create TransactionBlock
     │
     ▼
Execute via wallet (signed)
     │
     ▼
Move contract updates on-chain state
     │
     ▼
Event emitted (optional query)
     │
     ▼
Frontend receives tx digest
     │
     ▼
Update UI state (inventory, log)
```

---

## Move Contract Integration Points

### Auction House Module: `game::auction_house`

**Public Functions:**
```move
// Create new auction, return to caller
public fun create(
  item: Item,
  duration_ms: u64,
  clock: &Clock,
  ctx: &mut TxContext
) -> Auction

// Place bid, update auction state
public fun bid(
  auction: &mut Auction,
  payment: Coin<SUI>,
  clock: &Clock,
  ctx: &mut TxContext
)

// Winner claims item
public fun claim_item(
  auction: &mut Auction,
  ctx: &mut TxContext
)

// Seller claims payment
public fun claim_seller(
  auction: &mut Auction,
  treasury: &mut treasury::Treasury,
  ctx: &mut TxContext
)
```

**Events Emitted:**
```move
struct ListItemEvent {
  auction_id: ID,
  seller: address,
  item_id: ID,
  end_time: u64,
}

struct BuyItemEvent {
  auction_id: ID,
  buyer: address,
  amount: u64,
}
```

---

## File Structure

```
chain-hunter/
├── src/
│   ├── ChainHunter.jsx          ✏️ MODIFIED
│   │   ├── createAuction()      ✨ NEW
│   │   ├── claimItem()          ✨ NEW
│   │   ├── claimSellerProceeds()✨ NEW
│   │   ├── queryAuctionEvents() ✨ NEW (Optional)
│   │   └── AUCTION_HOUSE_CONFIG ✨ UPDATED
│   ├── App.jsx
│   ├── main.jsx
│   └── wallet/
│       ├── slushWallet.js
│       └── slushAuth.js
│
├── auction_house/
│   ├── Move.toml
│   └── sources/
│       ├── auction_house.move   ✅ UNCHANGED
│       ├── item.move            ✅ UNCHANGED
│       └── treasury.move        ✅ UNCHANGED
│
└── Documentation:
    ├── IMPLEMENTATION_COMPLETE.md       ✨ NEW
    ├── IMPLEMENTATION_GUIDE.md          ✨ NEW
    ├── CODE_CHANGES_DETAIL.md           ✨ NEW
    ├── QUICK_REFERENCE.md               ✨ NEW
    └── README (or this file)
```

---

## Deployment Checklist

```
BEFORE DEPLOYMENT:
├── Move contracts compile ✓
├── No wallet errors ✓
├── All functions defined ✓
└── Config has placeholders ✓

DURING DEPLOYMENT:
├── sui client publish
├── Copy Package ID
├── Copy Treasury ID
├── Save IDs to config
└── Create test auctions

AFTER DEPLOYMENT:
├── Test createAuction()
├── Test buyMysticalItem()
├── Test claimItem()
├── Test claimSellerProceeds()
├── Query on-chain state
└── Verify inventory updated
```

