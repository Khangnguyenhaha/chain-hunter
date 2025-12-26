import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY_PREFIX = 'chain_hunter_';

// Default state for a new game
const DEFAULT_PLAYER = {
  class: null,
  level: 1,
  exp: 0,
  expToNext: 10,
  str: 0,
  hp: 0,
  maxHp: 0,
  mana: 0,
  maxMana: 0,
  int: 0,
  def: 0,
  gold: 0,
};

const DEFAULT_AUCTION_CONFIG = {
  packageId: '',
  auctionHouseId: null,
  auctionHouseStatus: 'idle', // 'idle' | 'initializing' | 'initialized' | 'failed'
  auctionIds: {},
  initError: null,
};

/**
 * Centralized game state manager with localStorage persistence
 * Handles auto-save, safe restoration, and on-chain sync
 */
export const useGameState = () => {
  // Player state
  const [player, setPlayer] = useState(DEFAULT_PLAYER);
  const [inventory, setInventory] = useState([]);
  const [marketplace, setMarketplace] = useState([]);
  
  // Auction house / Shop config
  const [packageIdInput, setPackageIdInput] = useState('');
  const [auctionHouseId, setAuctionHouseId] = useState(null);
  const [auctionHouseStatus, setAuctionHouseStatus] = useState('idle');
  const [initError, setInitError] = useState(null);
  const [auctionIds, setAuctionIds] = useState({});

  // Stat allocation
  const [statPoints, setStatPoints] = useState(0);
  const [spentStr, setSpentStr] = useState(0);
  const [spentInt, setSpentInt] = useState(0);
  const [spentDef, setSpentDef] = useState(0);
  const [spentMana, setSpentMana] = useState(0);

  // Track if state has been loaded from storage
  const hasLoadedFromStorage = useRef(false);

  /**
   * Safely parse JSON from localStorage
   */
  const safeJsonParse = useCallback((value, defaultValue) => {
    try {
      return value ? JSON.parse(value) : defaultValue;
    } catch (e) {
      console.warn('Failed to parse localStorage value:', e);
      return defaultValue;
    }
  }, []);

  /**
   * Load all game state from localStorage on mount
   */
  const loadFromStorage = useCallback(() => {
    try {
      // Load player state
      const storedPlayer = safeJsonParse(
        localStorage.getItem(`${STORAGE_KEY_PREFIX}player`),
        DEFAULT_PLAYER
      );
      setPlayer(storedPlayer);

      // Load inventory
      const storedInventory = safeJsonParse(
        localStorage.getItem(`${STORAGE_KEY_PREFIX}inventory`),
        []
      );
      setInventory(storedInventory);

      // Load marketplace
      const storedMarketplace = safeJsonParse(
        localStorage.getItem(`${STORAGE_KEY_PREFIX}marketplace`),
        []
      );
      setMarketplace(storedMarketplace);

      // Load auction house config
      const storedPackageId = localStorage.getItem(`${STORAGE_KEY_PREFIX}packageId`) || '';
      setPackageIdInput(storedPackageId);

      const storedAuctionHouseId = localStorage.getItem(`${STORAGE_KEY_PREFIX}auctionHouseId`);
      if (storedAuctionHouseId) {
        setAuctionHouseId(storedAuctionHouseId);
        setAuctionHouseStatus('initialized');
      }

      const storedAuctionIds = safeJsonParse(
        localStorage.getItem(`${STORAGE_KEY_PREFIX}auctionIds`),
        {}
      );
      setAuctionIds(storedAuctionIds);

      // Load stat allocation
      const storedStatPoints = parseInt(localStorage.getItem(`${STORAGE_KEY_PREFIX}statPoints`)) || 0;
      setStatPoints(storedStatPoints);

      const storedSpentStr = parseInt(localStorage.getItem(`${STORAGE_KEY_PREFIX}spentStr`)) || 0;
      const storedSpentInt = parseInt(localStorage.getItem(`${STORAGE_KEY_PREFIX}spentInt`)) || 0;
      const storedSpentDef = parseInt(localStorage.getItem(`${STORAGE_KEY_PREFIX}spentDef`)) || 0;
      const storedSpentMana = parseInt(localStorage.getItem(`${STORAGE_KEY_PREFIX}spentMana`)) || 0;

      setSpentStr(storedSpentStr);
      setSpentInt(storedSpentInt);
      setSpentDef(storedSpentDef);
      setSpentMana(storedSpentMana);

      hasLoadedFromStorage.current = true;
    } catch (e) {
      console.error('Error loading state from localStorage:', e);
      hasLoadedFromStorage.current = true;
    }
  }, [safeJsonParse]);

  /**
   * Initialize on mount - restore from localStorage
   */
  useEffect(() => {
    if (!hasLoadedFromStorage.current) {
      loadFromStorage();
    }
  }, [loadFromStorage]);

  /**
   * Auto-save player state to localStorage
   */
  useEffect(() => {
    if (hasLoadedFromStorage.current && player.class !== null) {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}player`, JSON.stringify(player));
    }
  }, [player]);

  /**
   * Auto-save inventory to localStorage
   */
  useEffect(() => {
    if (hasLoadedFromStorage.current) {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}inventory`, JSON.stringify(inventory));
    }
  }, [inventory]);

  /**
   * Auto-save marketplace to localStorage
   */
  useEffect(() => {
    if (hasLoadedFromStorage.current) {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}marketplace`, JSON.stringify(marketplace));
    }
  }, [marketplace]);

  /**
   * Auto-save auction house config to localStorage
   */
  useEffect(() => {
    if (hasLoadedFromStorage.current) {
      if (packageIdInput) {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}packageId`, packageIdInput);
      }
    }
  }, [packageIdInput]);

  useEffect(() => {
    if (hasLoadedFromStorage.current && auctionHouseId) {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}auctionHouseId`, auctionHouseId);
    }
  }, [auctionHouseId]);

  useEffect(() => {
    if (hasLoadedFromStorage.current) {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}auctionIds`, JSON.stringify(auctionIds));
    }
  }, [auctionIds]);

  /**
   * Auto-save stat allocation to localStorage
   */
  useEffect(() => {
    if (hasLoadedFromStorage.current) {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}statPoints`, String(statPoints));
    }
  }, [statPoints]);

  useEffect(() => {
    if (hasLoadedFromStorage.current) {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}spentStr`, String(spentStr));
    }
  }, [spentStr]);

  useEffect(() => {
    if (hasLoadedFromStorage.current) {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}spentInt`, String(spentInt));
    }
  }, [spentInt]);

  useEffect(() => {
    if (hasLoadedFromStorage.current) {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}spentDef`, String(spentDef));
    }
  }, [spentDef]);

  useEffect(() => {
    if (hasLoadedFromStorage.current) {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}spentMana`, String(spentMana));
    }
  }, [spentMana]);

  /**
   * Override player state with on-chain data (when wallet connects)
   */
  const syncWithOnChain = useCallback((onChainPlayer) => {
    if (onChainPlayer) {
      setPlayer(prevPlayer => ({
        ...prevPlayer,
        ...onChainPlayer,
      }));
    }
  }, []);

  /**
   * Clear all game state (hard reset)
   */
  const clearAllState = useCallback(() => {
    const keysToRemove = [
      'player',
      'inventory',
      'marketplace',
      'packageId',
      'auctionHouseId',
      'auctionIds',
      'statPoints',
      'spentStr',
      'spentInt',
      'spentDef',
      'spentMana',
    ];
    keysToRemove.forEach(key => {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}${key}`);
    });

    // Reset state
    setPlayer(DEFAULT_PLAYER);
    setInventory([]);
    setMarketplace([]);
    setPackageIdInput('');
    setAuctionHouseId(null);
    setAuctionHouseStatus('idle');
    setInitError(null);
    setAuctionIds({});
    setStatPoints(0);
    setSpentStr(0);
    setSpentInt(0);
    setSpentDef(0);
    setSpentMana(0);
  }, []);

  /**
   * Clear only auction house state
   */
  const clearAuctionState = useCallback(() => {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}packageId`);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}auctionHouseId`);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}auctionIds`);
    
    setPackageIdInput('');
    setAuctionHouseId(null);
    setAuctionHouseStatus('idle');
    setInitError(null);
    setAuctionIds({});
  }, []);

  return {
    // Player stats
    player,
    setPlayer,
    
    // Inventory & Marketplace
    inventory,
    setInventory,
    marketplace,
    setMarketplace,

    // Auction House / Shop config
    packageIdInput,
    setPackageIdInput,
    auctionHouseId,
    setAuctionHouseId,
    auctionHouseStatus,
    setAuctionHouseStatus,
    initError,
    setInitError,
    auctionIds,
    setAuctionIds,

    // Stat allocation
    statPoints,
    setStatPoints,
    spentStr,
    setSpentStr,
    spentInt,
    setSpentInt,
    spentDef,
    setSpentDef,
    spentMana,
    setSpentMana,

    // Utility functions
    syncWithOnChain,
    clearAllState,
    clearAuctionState,
    hasLoaded: hasLoadedFromStorage.current,
  };
};

export default useGameState;
