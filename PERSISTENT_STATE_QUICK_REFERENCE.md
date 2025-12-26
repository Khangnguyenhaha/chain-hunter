# Persistent State Quick Reference

## What Was Implemented

✅ **Centralized State Manager**: `src/hooks/useGameState.js`  
✅ **Integrated into ChainHunter.jsx** with zero UI changes  
✅ **Auto-Save System**: Every state change automatically saved to localStorage  
✅ **Safe Restoration**: Handles corrupted/missing data gracefully  
✅ **Wallet Sync Ready**: On-chain data can override local cache  

## For Players

### What Persists?
- ✅ Player level, EXP, HP, Mana
- ✅ STR, INT, DEF stats
- ✅ Gold balance
- ✅ Inventory items (with rarity and stats)
- ✅ Marketplace listings
- ✅ Auction House configuration (packageId, initialization status)
- ✅ Stat allocation points (spent and unspent)

### How to Use
1. Play the game normally
2. Close tab / refresh page / restart browser
3. Everything restored automatically on next play
4. **No manual save button needed** - happens automatically!

## For Developers

### Import the Hook
```javascript
import useGameState from './hooks/useGameState';
```

### Use in Component
```javascript
const ChainHunter = () => {
  const gameState = useGameState();
  const { player, setPlayer, inventory, setInventory } = gameState;
  
  // Use like normal React state
  // All changes auto-saved to localStorage
};
```

### Available State Variables
```javascript
// Player stats
player, setPlayer

// Inventory
inventory, setInventory
marketplace, setMarketplace

// Auction house / Shop
packageIdInput, setPackageIdInput
auctionHouseId, setAuctionHouseId
auctionHouseStatus, setAuctionHouseStatus
initError, setInitError
auctionIds, setAuctionIds

// Stat allocation
statPoints, setStatPoints
spentStr, setSpentStr
spentInt, setSpentInt
spentDef, setSpentDef
spentMana, setSpentMana

// Utility functions
syncWithOnChain(onChainData)  // Override local with on-chain
clearAllState()               // Hard reset everything
clearAuctionState()           // Reset only auction config
hasLoaded                     // Boolean: state initialized?
```

### Adding New Persistent State

1. **Add to hook** (`src/hooks/useGameState.js`):
```javascript
const [myNewState, setMyNewState] = useState(defaultValue);

// Add useEffect for auto-save
useEffect(() => {
  if (hasLoadedFromStorage.current) {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}myNewState`, JSON.stringify(myNewState));
  }
}, [myNewState]);

// Add restoration in loadFromStorage()
const storedMyNewState = safeJsonParse(
  localStorage.getItem(`${STORAGE_KEY_PREFIX}myNewState`),
  defaultValue
);
setMyNewState(storedMyNewState);

// Return in object
return {
  // ... existing
  myNewState,
  setMyNewState,
  // ...
};
```

2. **Use in component** (same as any other state):
```javascript
const { myNewState, setMyNewState } = useGameState();
```

## Common Issues & Solutions

### "Why isn't my state persisting?"
- Make sure you're using the hook: `const gameState = useGameState();`
- Check browser console for any parse errors
- Verify localStorage is enabled in browser settings

### "State persists but wallet data doesn't override it"
- On-chain sync is ready - implement in `syncWithOnChain()` hook function
- Called when wallet connects via the `account` effect

### "How do I clear saved data?"
```javascript
const { clearAllState } = useGameState();
clearAllState(); // Hard reset
```

### "Storage quota exceeded error?"
- Inventory with too many items? Check `localStorage.getItem('chain_hunter_inventory')` size
- Can implement compression for large inventories if needed

## Testing

### Test Persistence
1. Open app, create player, level up, get items
2. F5 / refresh page
3. Verify: level, items, gold all restored ✅

### Test Auction House Persistence
1. Enter Package ID, initialize auction house
2. Refresh page
3. Verify: Package ID and AH ID still showing ✅

### Test Corruption Handling
1. Open DevTools > Application > localStorage
2. Corrupt a value: `chain_hunter_player = "invalid json"`
3. Refresh page
4. Should load with defaults, no crash ✅

## Architecture Benefits

✅ **No Breaking Changes**: Existing components unaffected  
✅ **Centralized**: Single source of truth for game state  
✅ **Auto-Save**: No manual persistence logic needed  
✅ **Type-Safe**: Same as regular React state  
✅ **Testable**: Easy to mock for unit tests  
✅ **Scalable**: Easy to add new persistent state  

## Files Modified

| File | Changes |
|------|---------|
| `src/hooks/useGameState.js` | **NEW** - Centralized state manager |
| `src/ChainHunter.jsx` | Integrated hook, removed duplicate state declarations |
| `PERSISTENT_STATE_IMPLEMENTATION.md` | **NEW** - Full documentation |

## No UI Changes!
The implementation is **100% backward compatible**:
- No visual differences
- All original functionality preserved
- Zero impact on existing components
- Transparent to end users
