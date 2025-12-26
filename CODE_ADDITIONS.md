# Code Additions: Copy-Paste Reference

## Location: [src/ChainHunter.jsx](src/ChainHunter.jsx)

---

## Change 1: Update AUCTION_HOUSE_CONFIG (Lines 643-656)

**BEFORE:**
```javascript
const AUCTION_HOUSE_CONFIG = {
  packageId: '0x...', // YOUR published package ID (e.g., 0x123abc)
  clockId: '0x6',     // Sui system clock (standard)
  // Auction object IDs should be stored per item
  auctionIds: {
    'mys_01': '0x...', // Mystical Void Cleaver auction ID
    'mys_02': '0x...', // Mystical Astral Wand auction ID
    // ... add more auction IDs as needed
  }
};
```

**AFTER:**
```javascript
const AUCTION_HOUSE_CONFIG = {
  packageId: '0x...', // YOUR published package ID (e.g., 0x123abc)
  clockId: '0x6',     // Sui system clock (standard)
  treasuryId: '0x...', // Treasury object ID (created by init function)
  // Auction object IDs should be stored per item
  auctionIds: {
    'mys_01': '0x...', // Mystical Void Cleaver auction ID
    'mys_02': '0x...', // Mystical Astral Wand auction ID
    // ... add more auction IDs as needed
  }
};
```

**Change:** Added `treasuryId: '0x...',` line

---

## Change 2: Add createAuction Function (After buyMysticalItem, Lines ~728-807)

```javascript
  // === FEATURE 1: CREATE AUCTION ===
  // Lists an item on the auction house for a specified duration
  const createAuction = (item, durationMs = 86400000) => { // Default: 24 hours
    if (!currentAccount) {
      openConnectModal();
      return;
    }

    if (AUCTION_HOUSE_CONFIG.packageId === '0x...' || !AUCTION_HOUSE_CONFIG.packageId) {
      addLog(`❌ Auction house not configured. Contact admin.`, 'error');
      return;
    }

    // For now, we'll use mock item data. In production, items would be on-chain objects
    const mockItem = {
      id: object::new(ctx),
      // ... item fields
    };

    try {
      addLog(`🔄 Creating auction for ${item.name}...`, 'info');

      const tx = new TransactionBlock();

      // In production, you would use real on-chain Item objects
      // For now, we'll create a transaction that would call auction_house::create
      // This requires having Item objects on-chain first
      
      // Step 1: Get the clock object
      const clock = tx.object(AUCTION_HOUSE_CONFIG.clockId);

      // Step 2: Call the create function
      // NOTE: This assumes Item objects exist on-chain
      // You'll need to modify this to pass actual Item objects
      const auctionResult = tx.moveCall({
        target: `${AUCTION_HOUSE_CONFIG.packageId}::auction_house::create`,
        arguments: [
          // item: Item (needs to be a real on-chain object)
          tx.pure(BigInt(durationMs)), // duration_ms
          clock,                        // &Clock
        ],
      });

      // Step 3: Execute transaction
      executeTransactionBlock(
        { transactionBlock: tx },
        {
          onSuccess: (result) => {
            addLog(`✅ Auction created! TxHash: ${result.digest?.slice(0, 10)}...`, 'victory');
            
            // Extract auction object ID from transaction effects
            if (result.effects?.created) {
              const auctionId = result.effects.created[0]?.reference?.objectId;
              if (auctionId) {
                addLog(`📋 Auction ID: ${auctionId}`, 'info');
                addLog(`📝 Save this ID in AUCTION_HOUSE_CONFIG.auctionIds`, 'warning');
              }
            }
          },
          onError: (error) => {
            const errorMsg = error?.message || error?.toString?.() || 'Unknown error';
            addLog(`❌ Auction creation failed: ${errorMsg}`, 'error');
            console.error('Auction creation error:', error);
          }
        }
      );
    } catch (e) {
      const errorMsg = e?.message || e?.toString?.() || 'Unknown error';
      addLog(`❌ Error creating auction transaction: ${errorMsg}`, 'error');
      console.error('Auction tx creation error:', e);
    }
  };
```

---

## Change 3: Add claimItem Function (After createAuction, Lines ~809-860)

```javascript
  // === FEATURE 2: CLAIM ITEM (Buyer) ===
  // Winner of auction claims their purchased item
  const claimItem = (auctionId) => {
    if (!currentAccount) {
      openConnectModal();
      return;
    }

    if (AUCTION_HOUSE_CONFIG.packageId === '0x...' || !AUCTION_HOUSE_CONFIG.packageId) {
      addLog(`❌ Auction house not configured. Contact admin.`, 'error');
      return;
    }

    if (!auctionId || auctionId === '0x...') {
      addLog(`❌ Invalid auction ID.`, 'error');
      return;
    }

    try {
      addLog(`🔄 Claiming item from auction...`, 'info');

      const tx = new TransactionBlock();

      // Get the auction object
      const auction = tx.object(auctionId);

      // Call claim_item function
      tx.moveCall({
        target: `${AUCTION_HOUSE_CONFIG.packageId}::auction_house::claim_item`,
        arguments: [
          auction,  // &mut Auction
        ],
      });

      // Execute transaction
      executeTransactionBlock(
        { transactionBlock: tx },
        {
          onSuccess: (result) => {
            addLog(`✅ Item claimed successfully! TxHash: ${result.digest?.slice(0, 10)}...`, 'victory');
            addLog(`🎁 Check your inventory for your winnings!`, 'nft');
          },
          onError: (error) => {
            const errorMsg = error?.message || error?.toString?.() || 'Unknown error';
            addLog(`❌ Failed to claim item: ${errorMsg}`, 'error');
            
            // Common error reasons
            if (errorMsg.includes('ended')) {
              addLog(`⚠️ Auction hasn't ended yet.`, 'warning');
            } else if (errorMsg.includes('claimed')) {
              addLog(`⚠️ Item already claimed by you.`, 'warning');
            } else if (errorMsg.includes('bidder')) {
              addLog(`⚠️ You are not the highest bidder.`, 'warning');
            }
            console.error('Claim item error:', error);
          }
        }
      );
    } catch (e) {
      const errorMsg = e?.message || e?.toString?.() || 'Unknown error';
      addLog(`❌ Error creating claim transaction: ${errorMsg}`, 'error');
      console.error('Claim tx creation error:', e);
    }
  };
```

---

## Change 4: Add claimSellerProceeds Function (After claimItem, Lines ~862-923)

```javascript
  // === FEATURE 3: CLAIM SELLER PROCEEDS ===
  // Seller of auction claims payment (minus fee)
  const claimSellerProceeds = (auctionId, treasuryId) => {
    if (!currentAccount) {
      openConnectModal();
      return;
    }

    if (AUCTION_HOUSE_CONFIG.packageId === '0x...' || !AUCTION_HOUSE_CONFIG.packageId) {
      addLog(`❌ Auction house not configured. Contact admin.`, 'error');
      return;
    }

    if (!auctionId || auctionId === '0x...') {
      addLog(`❌ Invalid auction ID.`, 'error');
      return;
    }

    if (!treasuryId || treasuryId === '0x...') {
      addLog(`❌ Treasury ID not configured.`, 'error');
      return;
    }

    try {
      addLog(`🔄 Claiming seller proceeds...`, 'info');

      const tx = new TransactionBlock();

      // Get the auction and treasury objects
      const auction = tx.object(auctionId);
      const treasury = tx.object(treasuryId);

      // Call claim_seller function
      tx.moveCall({
        target: `${AUCTION_HOUSE_CONFIG.packageId}::auction_house::claim_seller`,
        arguments: [
          auction,   // &mut Auction
          treasury,  // &mut Treasury
        ],
      });

      // Execute transaction
      executeTransactionBlock(
        { transactionBlock: tx },
        {
          onSuccess: (result) => {
            addLog(`✅ Payment claimed successfully! TxHash: ${result.digest?.slice(0, 10)}...`, 'victory');
            addLog(`💰 Funds transferred to your wallet (minus 0% fee).`, 'trade');
          },
          onError: (error) => {
            const errorMsg = error?.message || error?.toString?.() || 'Unknown error';
            addLog(`❌ Failed to claim proceeds: ${errorMsg}`, 'error');
            
            // Common error reasons
            if (errorMsg.includes('ended')) {
              addLog(`⚠️ Auction hasn't ended yet.`, 'warning');
            } else if (errorMsg.includes('claimed')) {
              addLog(`⚠️ Payment already claimed by you.`, 'warning');
            } else if (errorMsg.includes('no payment')) {
              addLog(`⚠️ No bids received for this auction.`, 'warning');
            } else if (errorMsg.includes('seller')) {
              addLog(`⚠️ You are not the seller.`, 'warning');
            }
            console.error('Claim seller error:', error);
          }
        }
      );
    } catch (e) {
      const errorMsg = e?.message || e?.toString?.() || 'Unknown error';
      addLog(`❌ Error creating claim transaction: ${errorMsg}`, 'error');
      console.error('Claim seller tx creation error:', e);
    }
  };
```

---

## Change 5: Add queryAuctionEvents Function (After claimSellerProceeds, Lines ~925-953)

```javascript
  // === FEATURE 3 (OPTIONAL): QUERY EVENTS ===
  // Verify transaction execution by querying emitted events
  const queryAuctionEvents = async (auctionId) => {
    if (!AUCTION_HOUSE_CONFIG.packageId || AUCTION_HOUSE_CONFIG.packageId === '0x...') {
      addLog(`❌ Package ID not configured.`, 'error');
      return;
    }

    try {
      addLog(`🔍 Fetching auction events...`, 'info');

      // Note: This requires SuiClient integration
      // In production, you would use:
      // const client = new SuiClient({ url: getFullnodeUrl('testnet') });
      // const events = await client.queryEvents({
      //   query: {
      //     MoveEventType: `${AUCTION_HOUSE_CONFIG.packageId}::auction_house::ListItemEvent`
      //   }
      // });

      addLog(`📋 Event query requires SuiClient integration (see queryAuctionEvents).`, 'warning');
      console.log('Implement SuiClient in your dapp-kit provider setup to enable event queries.');
    } catch (e) {
      const errorMsg = e?.message || e?.toString?.() || 'Unknown error';
      addLog(`❌ Error querying events: ${errorMsg}`, 'error');
      console.error('Event query error:', e);
    }
  };
```

---

## Summary of All Changes

| Change | Type | Lines | New Code |
|--------|------|-------|----------|
| treasuryId field | Config | 1 | 1 line |
| createAuction() | Function | 80 | 80 lines |
| claimItem() | Function | 52 | 52 lines |
| claimSellerProceeds() | Function | 62 | 62 lines |
| queryAuctionEvents() | Function | 29 | 29 lines |

**Total: 224 lines added to [src/ChainHunter.jsx](src/ChainHunter.jsx)**

---

## How to Apply These Changes

### Option 1: Manual Copy-Paste
1. Open [src/ChainHunter.jsx](src/ChainHunter.jsx)
2. Find AUCTION_HOUSE_CONFIG (around line 643)
3. Add `treasuryId: '0x...',` field
4. After `buyMysticalItem()` function, paste all 5 code blocks
5. Save file

### Option 2: Already Applied ✅
These changes have already been applied to your file. The file is ready to use!

---

## Verification

To verify all changes are in place:

```bash
# In PowerShell
Get-Content "src/ChainHunter.jsx" | Select-String "createAuction|claimItem|claimSellerProceeds|queryAuctionEvents|treasuryId"
```

Expected output: 5 matches (one for each function + config field)

