# Quick Reference: New Auction House Functions

## Added to [src/ChainHunter.jsx](src/ChainHunter.jsx)

### 1. Create Auction
```javascript
createAuction(item, durationMs = 86400000)
// Lists item for auction
// Returns: auctionId in transaction effects
```

### 2. Claim Item (Buyer/Winner)
```javascript
claimItem(auctionId)
// Highest bidder claims purchased item
// Preconditions: Auction ended, caller is highest_bidder
```

### 3. Claim Seller Proceeds
```javascript
claimSellerProceeds(auctionId, treasuryId)
// Seller collects payment (minus fee)
// Preconditions: Auction ended, has payment, caller is seller
```

### 4. Query Events (Optional)
```javascript
queryAuctionEvents(auctionId)
// Verifies auction state via on-chain events
// Note: Requires SuiClient integration
```

---

## Configuration Required

Update `AUCTION_HOUSE_CONFIG` in [src/ChainHunter.jsx](src/ChainHunter.jsx#L643) with:

```javascript
{
  packageId: '0x...',      // From sui client publish
  clockId: '0x6',          // Standard Sui system clock
  treasuryId: '0x...',     // NEW: From auction_house init()
  auctionIds: {
    'mys_01': '0x...',     // From createAuction() results
    'mys_02': '0x...',
    // ...
  }
}
```

---

## Usage in UI

```jsx
// List item for auction
<button onClick={() => createAuction(item)}>
  📋 Create Auction
</button>

// Claim after winning
<button onClick={() => claimItem(auctionId)}>
  🎁 Claim Item
</button>

// Claim seller payment
<button onClick={() => claimSellerProceeds(auctionId, treasuryId)}>
  💰 Claim Payment
</button>
```

---

## Files Changed
- ✅ [src/ChainHunter.jsx](src/ChainHunter.jsx) - Added 3 functions + 1 optional
- ✅ Move contracts - NO CHANGES (still compile exit code 0)

---

## Next Steps

1. **Deploy**: `cd auction_house && sui client publish --gas-budget 100000000`
2. **Configure**: Update AUCTION_HOUSE_CONFIG with real IDs
3. **Test**: Call each function in order (create → bid → claim)
4. **Verify**: Check ownership on-chain with `sui client object`

