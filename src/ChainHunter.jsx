import React, { useState, useEffect, useRef } from 'react';
import { Sword, Shield, Heart, Zap, Trophy, ShoppingBag, Brain, Dumbbell, Sparkles, Box, User, LogIn, ChevronLeft, ChevronRight, FastForward, X } from 'lucide-react';
import { SuiClientProvider, WalletProvider, useCurrentAccount, useSignPersonalMessage, ConnectButton, useConnectWallet, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { getFullnodeUrl } from '@mysten/sui/client';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import useGameState from './hooks/useGameState';
import { useAuctionHouseInit } from './hooks/useAuctionHouseInit';
import { PACKAGE_ID } from './config/sui';

import '@mysten/dapp-kit/dist/index.css';

// Custom CSS for animations and depth
const GlobalStyles = () => (
  <style>{`
    @keyframes glow {
      0% { box-shadow: 0 0 5px rgba(139, 92, 246, 0.3); }
      50% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.6); }
      100% { box-shadow: 0 0 5px rgba(139, 92, 246, 0.3); }
    }
    .combat-terminal::-webkit-scrollbar { width: 4px; }
    .combat-terminal::-webkit-scrollbar-thumb { background: #4b5563; border-radius: 10px; }
    .neon-border-red { border: 1px solid rgba(239, 68, 68, 0.5); box-shadow: 0 0 10px rgba(239, 68, 68, 0.2); }
    .neon-border-purple { border: 1px solid rgba(168, 85, 247, 0.5); box-shadow: 0 0 10px rgba(168, 85, 247, 0.2); }
    .neon-border-blue { border: 1px solid rgba(59, 130, 246, 0.5); box-shadow: 0 0 10px rgba(59, 130, 246, 0.2); }
    .hover-lift { transition: transform 0.2s ease, box-shadow 0.2s ease; }
    .hover-lift:hover { transform: translateY(-3px); box-shadow: 0 10px 20px -10px rgba(0,0,0,0.5); }
    
    /* Equipment Slot Borders based on rarity */
    .slot-Common { border: 1px solid #4b5563; }
    .slot-Uncommon { border: 1px solid #22c55e; box-shadow: inset 0 0 5px #22c55e44; }
    .slot-Rare { border: 1px solid #3b82f6; box-shadow: inset 0 0 5px #3b82f644; }
    .slot-Epic { border: 1px solid #a855f7; box-shadow: inset 0 0 5px #a855f744; }
    .slot-Legendary { border: 1px solid #eab308; box-shadow: inset 0 0 5px #eab30844; }
    .slot-Mystical { border: 1px solid #f472b6; box-shadow: 0 0 10px #f472b666; animation: glow 2s infinite; }
  `}</style>
);

const ChainHunter = () => {
  // Initialize persistent game state
  const gameState = useGameState();
  const {
    player,
    setPlayer,
    inventory,
    setInventory,
    marketplace,
    setMarketplace,
    auctionHouseId,
    setAuctionHouseId,
    auctionHouseStatus,
    setAuctionHouseStatus,
    initError,
    setInitError,
    auctionIds,
    setAuctionIds,
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
  } = gameState;

  const [showClassSelection, setShowClassSelection] = useState(true);
  // Wallet connection hooks
  const account = useCurrentAccount();
  const connectWallet = useConnectWallet();
  const { signAndExecuteTransaction } = useSignAndExecuteTransaction();

  const classes = {
    warrior: {
      name: 'Warrior',
      icon: '⚔️',
      description: 'High STR and HP. Excels in physical combat.',
      color: 'red',
      baseStr: 15,
      baseInt: 4,
      baseDef: 20,
      baseHp: 30,
      baseMana: 50
    },
    wizard: {
      name: 'Wizard',
      icon: '🔮',
      description: 'High INT and Mana. Master of magical skills.',
      color: 'purple',
      baseStr: 2,
      baseInt: 20,
      baseDef: 5,
      baseHp: 25,
      baseMana: 100
    },
    tanker: {
      name: 'Tanker',
      icon: '🛡️',
      description: 'Balanced HP and DEF. Survives the longest.',
      color: 'blue',
      baseStr: 7,
      baseInt: 2,
      baseDef: 40,
      baseHp: 70,
      baseMana: 70
    }
  };

  const [enemy, setEnemy] = useState(null);
  const [skills, setSkills] = useState([
    { id: 1, name: 'Power Strike', unlockLevel: 5, multiplier: 1.4, manaCost: 10, cooldown: 5000, ready: true, description: 'STR-based physical attack' },
    { id: 2, name: 'Arcane Blast', unlockLevel: 10, multiplier: 1.6, manaCost: 15, cooldown: 6000, ready: true, description: 'INT-based magical attack' },
    { id: 3, name: 'Fury Slash', unlockLevel: 15, multiplier: 1.8, manaCost: 20, cooldown: 8000, ready: true, description: 'Powerful STR attack' },
    { id: 4, name: 'Divine Smite', unlockLevel: 30, multiplier: 2.8, manaCost: 35, cooldown: 12000, ready: true, description: 'Ultimate INT+STR attack' }
  ]);
  const [combatLog, setCombatLog] = useState([]);
  const combatRef = useRef(null);

  const [shopTab, setShopTab] = useState('inventory');

  const [authMode, setAuthMode] = useState('login');
  const [regName, setRegName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [loginName, setLoginName] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [message, setMessage] = useState('');
  const [walletAddress, setWalletAddress] = useState(null);

  // --- NEW STATES FOR SPEED, PAGINATION, AND EQUIPMENT MODAL ---
  const [gameSpeed, setGameSpeed] = useState(1);
  const [goldShopPage, setGoldShopPage] = useState(1);
  const [suiShopPage, setSuiShopPage] = useState(1);
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const ITEMS_PER_PAGE = 6;

  // useCurrentAccount for account info (must be before useEffect)
  const currentAccount = account;
  // useConnectWallet for modal
  const openConnectModal = connectWallet.openConnectModal;
  // On-chain configuration (must be before useEffect)
  const AUCTION_HOUSE_CONFIG = {
    packageId: PACKAGE_ID, // Deployed package ID from config
    clockId: '0x6',     // Sui system clock (standard)
    treasuryId: auctionHouseId || '0x...', // Auction house object ID (from one-time init)
    // Auction IDs are created via createAuction() and stored in state
  };

  // Initialize showClassSelection based on whether player exists in persistent state
  useEffect(() => {
    if (gameState.hasLoaded && player && player.class) {
      setShowClassSelection(false);
    }
  }, [gameState.hasLoaded, player]);

  // Initialize authentication from localStorage on mount
  useEffect(() => {
    const savedAuth = localStorage.getItem('chain_hunter_auth');
    const savedUser = localStorage.getItem('chain_hunter_user');
    if (savedAuth && savedUser) {
      setIsAuthenticated(true);
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  // Persist authentication state to localStorage
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      localStorage.setItem('chain_hunter_auth', 'true');
      localStorage.setItem('chain_hunter_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('chain_hunter_auth');
      localStorage.removeItem('chain_hunter_user');
    }
  }, [isAuthenticated, currentUser]);

  const loadUsers = () => {
    try {
      const raw = localStorage.getItem('chain_hunter_users');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const saveUsers = (users) => {
    localStorage.setItem('chain_hunter_users', JSON.stringify(users));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage('');
    if (!regName.trim()) { setMessage('Name is required.'); return; }
    if (!regPassword) { setMessage('Password is required.'); return; }
    if (regPassword !== regConfirm) { setMessage('Password and confirm do not match.'); return; }

    const users = loadUsers();
    if (users[regName]) { setMessage('This name is already registered.'); return; }

    users[regName] = { password: regPassword };
    saveUsers(users);
    setMessage('Registration successful. Please log in.');
    setAuthMode('login');
    setRegName(''); setRegPassword(''); setRegConfirm('');
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setMessage('');
    if (!loginName.trim()) { setMessage('Name is required.'); return; }
    if (!loginPassword) { setMessage('Password is required.'); return; }

    const users = loadUsers();
    const user = users[loginName];
    if (!user) { setMessage('No account found for this name.'); return; }
    if (user.password !== loginPassword) { setMessage('Incorrect password.'); return; }

    setIsAuthenticated(true);
    setCurrentUser({ name: loginName });
    setLoginName(''); setLoginPassword('');
    setMessage('Logged in successfully.');
  };

  const initializePlayer = (classKey) => {
  const cls = classes[classKey];
  setPlayer({
    class: classKey,
    level: 1,
    exp: 0,
    expToNext: 10,
    str: cls.baseStr,
    hp: cls.baseHp,
    maxHp: cls.baseHp,
    mana: cls.baseMana,
    maxMana: cls.baseMana,
    int: cls.baseInt || 0,   // <-- set INT từ class
    def: cls.baseDef || 0,   // <-- set DEF từ class
    gold: 0
  });
  setStatPoints(3);
  setSpentStr(0);
  setSpentInt(0);
  setSpentDef(0);
  setSpentMana(0);
  setShowClassSelection(false);
};


  const getPlayerAtk = () => player ? Math.floor(player.str + (player.str * 0.5)) : 0;

  const getSkillDamage = (mult) => {
    if (!player) return 0;
    return Math.floor((getPlayerAtk() + player.int * 0.8) * mult);
  };

  const generateEnemy = (level) => {
    if (level % 10 === 0) {
      return {
        level,
        name: `Boss Lv.${level}`,
        hp: 200 + level * 50,
        atk: 10 + level * 3,
        reward: { exp: 100 + level * 10, gold: 50 + level * 5 },
        maxHp: 200 + level * 50,
        isBoss: true
      };
    }
    
    return {
      name: `Monster Lv.${level}`,
      hp: 20 + level * 20,
      maxHp: 20 + level * 20,
      atk: 1 + level * 2,
      level,
      isBoss: false,
      reward: { exp: Math.floor(5 + level * 2.5), gold: 5 + level * 3 }
    };
  };

  const generateNFTDrop = (isBoss, level) => {
    const baseChance = isBoss ? 100 : Math.min(5 + level * 0.5, 30);
    const mysticalChance = isBoss ? 8 : Math.min(0.5 + level * 0.03, 4); // very low drop rate for Mystical
    if (Math.random() * 100 > baseChance) return null;

    let rarity = 'Common';
    let mult = 1;
    const roll = Math.random() * 100;

    if (roll < mysticalChance) {
      rarity = 'Mystical';
      mult = 6; // super high multiplier
    } else if (isBoss) {
      if (roll < 10) { rarity = 'Legendary'; mult = 3; }
      else if (roll < 30) { rarity = 'Epic'; mult = 2; }
      else if (roll < 60) { rarity = 'Rare'; mult = 1.5; }
      else { rarity = 'Common'; mult = 1; }
    } else {
      const bonus = Math.min(level * 0.3, 15);
      if (roll < 2 + bonus * 0.2) { rarity = 'Epic'; mult = 2; }
      else if (roll < 8 + bonus * 0.5) { rarity = 'Rare'; mult = 1.5; }
      else if (roll < 25 + bonus) { rarity = 'Uncommon'; mult = 1.2; }
      else { rarity = 'Common'; mult = 1; }
    }

    const types = ['Helmet', 'Armor', 'Legging', 'Boots', 'Amulet', 'Ring', 'Weapon', 'Sub Weapon'];
    const type = types[Math.floor(Math.random() * types.length)];
    const stats = ['str', 'hp', 'mana', 'int'];
    const stat = stats[Math.floor(Math.random() * stats.length)];
    
    const item = {
      id: `nft_${Date.now()}_${Math.random()}`,
      name: `${rarity} ${type}`,
      type, rarity, primaryStat: stat,
      str: 0, def: 0, hp: 0, mana: 0, int: 0,
      source: isBoss ? enemy?.name : `Monster Lv.${level}`,
      price: Math.floor((100 + level * 50) * mult),
      equipped: false
    };

    if (stat === 'str') item.str = Math.floor((5 + level * 2) * mult);
    else if (stat === 'hp') item.hp = Math.floor((20 + level * 5) * mult);
    else if (stat === 'mana') item.mana = Math.floor((10 + level * 3) * mult);
    else item.int = Math.floor((5 + level * 2) * mult);

    if (['Armor', 'Helmet', 'Legging', 'Boots'].includes(type)) {
      item.def = Math.floor((3 + level * 1.5) * mult);
    }

    return item;
  };

  const useSkill = (skill) => {
    if (!skill.ready || player.mana < skill.manaCost || player.level < skill.unlockLevel || !enemy) return;

    const dmg = getSkillDamage(skill.multiplier);
    setEnemy(p => ({ ...p, hp: Math.max(0, p.hp - dmg) }));
    setPlayer(p => ({ ...p, mana: p.mana - skill.manaCost }));
    setSkills(p => p.map(s => s.id === skill.id ? { ...s, ready: false } : s));
    addLog(`Used ${skill.name}! Dealt ${dmg} damage!`, 'skill');

    setTimeout(() => {
      setSkills(p => p.map(s => s.id === skill.id ? { ...s, ready: true } : s));
    }, skill.cooldown / gameSpeed); 
  };

  useEffect(() => {
    if (!enemy || !player) return;

    combatRef.current = setInterval(() => {
      setEnemy(e => {
        if (!e || e.hp <= 0) return e;
        
        const dmg = getPlayerAtk();
        const newHp = Math.max(0, e.hp - dmg);
        
        addLog(`Auto attack! Dealt ${dmg} damage!`, 'info');

        if (newHp > 0) {
          setTimeout(() => {
            setPlayer(p => {
              if (!p || p.hp <= 0) return p;
              const enemyDmg = e.atk;
              addLog(`Enemy attacked! Took ${enemyDmg} damage!`, 'info');
              return { ...p, hp: Math.max(0, p.hp - enemyDmg) };
            });
          }, 500 / gameSpeed);
        }
        
        return { ...e, hp: newHp };
      });
    }, 2000 / gameSpeed);

    return () => clearInterval(combatRef.current);
  }, [enemy, player, gameSpeed]);

  useEffect(() => {
    if (enemy && enemy.hp <= 0) handleEnemyDefeat();
  }, [enemy?.hp]);

  const handleEnemyDefeat = () => {
    if (!player) return;
    
    const { exp, gold } = enemy.reward;
    
    const levelUp = player.exp + exp >= player.expToNext;

    setPlayer(p => {
      const newExp = p.exp + exp;

      if (levelUp) {
        const newLvl = p.level + 1;
        addLog(`🎉 LEVEL UP! Level ${newLvl}! +3 Stat Points!`, 'victory');

        return {
          ...p,
          level: newLvl,
          exp: newExp - p.expToNext,
          expToNext: Math.floor(p.expToNext * 1.2),
          gold: p.gold + gold
        };
      }

      return { ...p, exp: newExp, gold: p.gold + gold };
    });

    if (levelUp) {
      setStatPoints(prev => prev + 3);
    }

    const drop = generateNFTDrop(enemy.isBoss, player.level);
    if (drop) {
      setInventory(p => [...p, drop]);
      addLog(`🎉 NFT: ${drop.name}!`, 'nft');
    }

    addLog(`Defeated ${enemy.name}! +${exp} EXP, +${gold} Gold`, 'victory');
    setTimeout(() => setEnemy(generateEnemy(player.level)), 1000 / gameSpeed);
  };

  // Initialize auction house using the hook
  const { initializeAuctionHouse } = useAuctionHouseInit();

  // Initialize Auction House using package ID from config
  const initializeAuctionHouseHandler = () => {
    // Prevent repeated initialization
    if (auctionHouseId) {
      setInitError('Auction house already initialized');
      return;
    }
    
    if (!currentAccount) {
      openConnectModal();
      return;
    }
    
    setAuctionHouseStatus('initializing');
    setInitError(null);

    // Call the init function using the hook with PACKAGE_ID from config
    initializeAuctionHouse({
      packageId: PACKAGE_ID,
      onLoading: (isLoading) => {
        if (isLoading) {
          setAuctionHouseStatus('initializing');
        }
      },
      onSuccess: (objectId) => {
        setAuctionHouseId(objectId);
        setAuctionHouseStatus('initialized');
        setInitError(null);
        console.log('✅ Auction house initialized:', objectId);
        addLog(`✅ Auction House Live: ${objectId.slice(0, 10)}...`, 'victory');
      },
      onError: (error) => {
        setAuctionHouseStatus('failed');
        const errorMsg = error?.message || error?.toString() || 'Unknown error';
        setInitError(`On-chain error: ${errorMsg}`);
        console.error('Auction house initialization failed:', error);
      },
    });
  };

  // Ref to track if auto-initialization has been attempted
  const autoInitAttempted = useRef(false);

  // Auto-load auction house ID from localStorage on component mount
  useEffect(() => {
    const savedAuctionHouseId = localStorage.getItem('chain_hunter_auction_house_id');
    if (savedAuctionHouseId) {
      setAuctionHouseId(savedAuctionHouseId);
      setAuctionHouseStatus('initialized');
      console.log('🔄 Loaded auction house ID from localStorage:', savedAuctionHouseId);
    }
  }, []);

  useEffect(() => {
    if (!enemy && player) setEnemy(generateEnemy(player.level));
  }, [player]);

  useEffect(() => {
    if (!player) return;
    const regen = setInterval(() => {
      setPlayer(p => ({ ...p, mana: Math.min(p.maxMana, p.mana + Math.floor(2 + p.int * 0.1)) }));
    }, 2000 / gameSpeed);
    return () => clearInterval(regen);
  }, [player?.int, gameSpeed]);

  useEffect(() => {
    if (!player) return;

    const hpRegenInterval = setInterval(() => {
      if (player.hp >= player.maxHp) return;

      const baseRegen = 10;
      const regenAmount = Math.floor(baseRegen * Math.sqrt(player.level));

      setPlayer(p => {
        const newHp = Math.min(p.maxHp, p.hp + regenAmount);
        if (newHp > p.hp) {
          addLog(`Regenerated +${newHp - p.hp} HP`, 'info');
        }
        return { ...p, hp: newHp };
      });
    }, 3000 / gameSpeed);

    return () => clearInterval(hpRegenInterval);
  }, [player?.level, player?.maxHp, gameSpeed]);

  const addLog = (msg, type = 'info') => {
    setCombatLog(p => [{ message: msg, type, time: Date.now() }, ...p].slice(0, 10));
  };

  const equipNFT = (nft) => {
    if (player.class === 'wizard' && nft.type === 'Sub Weapon') {
      addLog('Wizards cannot equip Sub Weapons!', 'info');
      return;
    }

    let unequipBonus = { str: 0, int: 0, def: 0, hp: 0, mana: 0 };

    setInventory(prevInventory => {
      const newInventory = [...prevInventory];

      newInventory.forEach(item => {
        if (item.type === nft.type && item.equipped && item.id !== nft.id) {
          item.equipped = false;
          unequipBonus.str += item.str;
          unequipBonus.int += item.int;
          unequipBonus.def += item.def;
          unequipBonus.hp += item.hp;
          unequipBonus.mana += item.mana;
        }
      });

      const target = newInventory.find(i => i.id === nft.id);
      if (target) {
        target.equipped = !target.equipped;
      }

      return newInventory;
    });

    const currentlyEquipped = inventory.find(i => i.id === nft.id)?.equipped || false;
    const equipChange = currentlyEquipped ? -1 : 1;

    setPlayer(p => ({
      ...p,
      str: p.str + equipChange * nft.str - unequipBonus.str,
      int: p.int + equipChange * nft.int - unequipBonus.int,
      def: p.def + equipChange * nft.def - unequipBonus.def,
      maxHp: p.maxHp + equipChange * nft.hp - unequipBonus.hp,
      hp: Math.min(p.hp + equipChange * nft.hp - unequipBonus.hp, p.maxHp + equipChange * nft.hp - unequipBonus.hp),
      maxMana: p.maxMana + equipChange * nft.mana - unequipBonus.mana,
      mana: Math.min(p.mana + equipChange * nft.mana - unequipBonus.mana, p.maxMana + equipChange * nft.mana - unequipBonus.mana),
    }));
  };

  const buyNFT = (nft) => {
    if (player.gold < nft.price) {
      addLog(`Need ${nft.price} gold!`, 'info');
      return;
    }
    setPlayer(p => ({ ...p, gold: p.gold - nft.price }));
    setInventory(p => [...p, { ...nft, seller: undefined }]);
    setMarketplace(p => p.filter(i => i.id !== nft.id));
    addLog(`Bought ${nft.name}`, 'trade');
  };

  const sellNFT = (nft) => {
    setInventory(p => p.filter(i => i.id !== nft.id));
    setMarketplace(p => [...p, { ...nft, seller: 'You' }]);
    addLog(`Listed ${nft.name}`, 'trade');
  };

  const getRarityColor = (r) => ({
    'Common': 'text-gray-400',
    'Uncommon': 'text-green-400',
    'Rare': 'text-blue-400',
    'Epic': 'text-purple-400',
    'Legendary': 'text-yellow-400',
    'Mystical': 'text-pink-300 animate-pulse'
  })[r] || 'text-gray-400';

  const normalAttack = () => {
    if (!player || !enemy) return;

    const baseDmg = getPlayerAtk();
    const dmg = Math.floor(baseDmg * 0.2);

    setEnemy(e => {
      if (!e) return null;
      const newHp = Math.max(0, e.hp - dmg);
      return { ...e, hp: newHp };
    });
  };

  const upgradeStat = (stat) => {
    if (statPoints <= 0) return;

    setStatPoints(prev => prev - 1);

    if (stat === 'str') {
      setSpentStr(prev => prev + 1);
      setPlayer(p => ({ ...p, str: p.str + 1 }));
    } else if (stat === 'int') {
      setSpentInt(prev => prev + 1);
      setPlayer(p => ({ ...p, int: p.int + 1 }));
    } else if (stat === 'def') {
      setSpentDef(prev => prev + 1);
      setPlayer(p => ({ ...p, def: p.def + 1 }));
    } else if (stat === 'maxMana') {
      setSpentMana(prev => prev + 1);
      setPlayer(p => ({ ...p, maxMana: p.maxMana + 8, mana: p.mana + 8 }));
    }

    addLog(`+1 ${stat === 'maxMana' ? 'MANA' : stat.toUpperCase()}!`, 'info');
  };

  const { mutate: signPersonalMessage } = useSignPersonalMessage();

  useEffect(() => {
    if (account) {
      setWalletAddress(account.address);
      const msg = `ChainHunter Login\nAddress: ${account.address}\nTime: ${Date.now()}`;
      const messageBytes = new TextEncoder().encode(msg);
      signPersonalMessage(
        { message: messageBytes },
        {
          onSuccess: () => setMessage('Wallet connected and message signed successfully.'),
          onError: (error) => console.error('Signing failed:', error)
        }
      );
    }
  }, [account]);

  // Sync wallet connection with game state
  // When wallet connects, on-chain data (if available) overrides local cache
  useEffect(() => {
    if (account && player && player.class) {
      // Wallet is connected and player exists - on-chain data would override here
      // For now, just confirm wallet is connected
      console.log('Wallet synced with game state for:', account.address);
    }
  }, [account, player]);

  const goldShopPotions = [
    { id: 'pot_hp_small', name: 'Minor HP Potion', price: 20, effect: () => setPlayer(p => ({ ...p, hp: Math.min(p.maxHp, p.hp + 50) })), description: '+50 HP' },
    { id: 'pot_hp_medium', name: 'HP Potion', price: 50, effect: () => setPlayer(p => ({ ...p, hp: Math.min(p.maxHp, p.hp + 150) })), description: '+150 HP' },
    { id: 'pot_hp_large', name: 'Greater HP Potion', price: 120, effect: () => setPlayer(p => ({ ...p, hp: Math.min(p.maxHp, p.hp + 400) })), description: '+400 HP' },
    { id: 'pot_mana_small', name: 'Minor Mana Potion', price: 25, effect: () => setPlayer(p => ({ ...p, mana: Math.min(p.maxMana, p.mana + 40) })), description: '+40 Mana' },
    { id: 'pot_mana_medium', name: 'Mana Potion', price: 60, effect: () => setPlayer(p => ({ ...p, mana: Math.min(p.maxMana, p.mana + 120) })), description: '+120 Mana' },
    { id: 'pot_mana_large', name: 'Greater Mana Potion', price: 140, effect: () => setPlayer(p => ({ ...p, mana: Math.min(p.maxMana, p.mana + 300) })), description: '+300 Mana' },
  ];

  const goldShopEquipment = [
    { id: 'g_weap_1', name: 'Iron Sword', type: 'Weapon', price: 100, str: 5, rarity: 'Common' },
    { id: 'g_weap_2', name: 'Steel Blade', type: 'Weapon', price: 250, str: 12, rarity: 'Uncommon' },
    { id: 'g_weap_3', name: 'Flame Sword', type: 'Weapon', price: 600, str: 25, int: 8, rarity: 'Rare' },
    { id: 'g_weap_4', name: 'Dragon Slayer', type: 'Weapon', price: 1500, str: 50, rarity: 'Epic' },
    { id: 'g_helm_1', name: 'Leather Cap', type: 'Helmet', price: 80, def: 3, hp: 20, rarity: 'Common' },
    { id: 'g_helm_2', name: 'Iron Helm', type: 'Helmet', price: 200, def: 8, hp: 50, rarity: 'Uncommon' },
    { id: 'g_helm_3', name: 'Mystic Hood', type: 'Helmet', price: 500, def: 12, mana: 80, int: 10, rarity: 'Rare' },
    { id: 'g_armor_1', name: 'Chain Mail', type: 'Armor', price: 300, def: 15, hp: 100, rarity: 'Uncommon' },
    { id: 'g_armor_2', name: 'Plate Armor', type: 'Armor', price: 800, def: 30, hp: 200, rarity: 'Rare' },
    { id: 'g_leg_1', name: 'Swift Greaves', type: 'Legging', price: 400, def: 10, str: 8, rarity: 'Rare' },
    { id: 'g_boot_1', name: 'Winged Boots', type: 'Boots', price: 350, def: 8, mana: 50, rarity: 'Uncommon' },
    { id: 'g_ring_1', name: 'Ring of Power', type: 'Ring', price: 700, str: 15, int: 10, rarity: 'Rare' },
    { id: 'g_ring_2', name: 'Life Ring', type: 'Ring', price: 900, hp: 300, rarity: 'Epic' },
    { id: 'g_amu_1', name: 'Amulet of Wisdom', type: 'Amulet', price: 800, int: 20, mana: 150, rarity: 'Rare' },
    { id: 'g_shield_1', name: 'Wooden Shield', type: 'Sub Weapon', price: 150, def: 10, hp: 80, rarity: 'Common' },
    { id: 'g_shield_2', name: 'Tower Shield', type: 'Sub Weapon', price: 600, def: 25, hp: 200, rarity: 'Rare' },
  ];

  const additionalEquipment = [];
  const equipmentNames = {
    Weapon: ['Blade', 'Axe', 'Mace', 'Dagger', 'Staff', 'Wand', 'Bow'],
    Helmet: ['Helm', 'Crown', 'Visor', 'Mask', 'Circlet'],
    Armor: ['Plate', 'Robes', 'Mail', 'Scale', 'Vest'],
    Legging: ['Greaves', 'Pants', 'Legguards'],
    Boots: ['Boots', 'Sabatons', 'Sandals'],
    Ring: ['Ring', 'Band'],
    Amulet: ['Pendant', 'Necklace', 'Charm'],
    'Sub Weapon': ['Shield', 'Buckler', 'Orb']
  };

  const rarities = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
  let counter = 5;
  for (let i = 0; i < 120; i++) {
    const type = Object.keys(equipmentNames)[Math.floor(Math.random() * Object.keys(equipmentNames).length)];
    const nameBase = equipmentNames[type][Math.floor(Math.random() * equipmentNames[type].length)];
    const rarity = rarities[Math.floor(Math.random() * rarities.length)];
    const mult = rarity === 'Legendary' ? 4 : rarity === 'Epic' ? 3 : rarity === 'Rare' ? 2 : rarity === 'Uncommon' ? 1.5 : 1;
    const basePrice = 100 + i * 20;
    const item = {
      id: `g_eq_${counter++}`,
      name: `${rarity} ${nameBase}`,
      type,
      rarity,
      price: Math.floor(basePrice * mult),
      str: type === 'Weapon' ? Math.floor(5 * mult + i * 0.5) : 0,
      int: ['Staff', 'Wand', 'Orb'].some(w => nameBase.includes(w)) ? Math.floor(8 * mult + i * 0.3) : 0,
      def: ['Shield', 'Armor', 'Helmet', 'Legging', 'Boots'].includes(type) ? Math.floor(5 * mult + i * 0.4) : 0,
      hp: Math.floor(20 * mult + i * 2),
      mana: ['Robes', 'Wand', 'Orb', 'Circlet'].some(w => nameBase.includes(w)) ? Math.floor(30 * mult + i * 1.5) : 0,
    };
    additionalEquipment.push(item);
  }

  const allGoldShopEquipment = [...goldShopEquipment, ...additionalEquipment];

  const mysticalShopItems = [
    { id: 'mys_01', name: 'Mystical Void Cleaver', type: 'Weapon', rarity: 'Mystical', price: 1, str: 180, int: 80 },
    { id: 'mys_02', name: 'Mystical Astral Wand', type: 'Weapon', rarity: 'Mystical', price: 1, int: 200, mana: 800 },
    { id: 'mys_03', name: 'Mystical Soul Harvester', type: 'Weapon', rarity: 'Mystical', price: 1, str: 160, hp: 1200 },
    { id: 'mys_04', name: 'Mystical Eternal Guardian', type: 'Sub Weapon', rarity: 'Mystical', price: 1, def: 120, hp: 1500 },
    { id: 'mys_05', name: 'Mystical Crown of Infinity', type: 'Helmet', rarity: 'Mystical', price: 1, def: 90, mana: 1000, int: 120 },
    { id: 'mys_06', name: 'Mystical Celestial Plate', type: 'Armor', rarity: 'Mystical', price: 1, def: 150, hp: 2000 },
    { id: 'mys_07', name: 'Mystical Thunderstrike Greaves', type: 'Legging', rarity: 'Mystical', price: 1, def: 100, str: 110 },
    { id: 'mys_08', name: 'Mystical Phantom Steps', type: 'Boots', rarity: 'Mystical', price: 1, def: 80, mana: 600 },
    { id: 'mys_09', name: 'Mystical Ring of Eternity', type: 'Ring', rarity: 'Mystical', price: 1, str: 140, int: 140, hp: 1000 },
    { id: 'mys_10', name: 'Mystical Amulet of Divinity', type: 'Amulet', rarity: 'Mystical', price: 1, int: 180, mana: 1200 },
    { id: 'mys_11', name: 'Mystical Chaos Bringer', type: 'Weapon', rarity: 'Mystical', price: 1, str: 190 },
    { id: 'mys_12', name: 'Mystical Oblivion Orb', type: 'Sub Weapon', rarity: 'Mystical', price: 1, int: 170, mana: 900 },
    { id: 'mys_13', name: 'Mystical Starlight Visor', type: 'Helmet', rarity: 'Mystical', price: 1, def: 95, int: 130 },
    { id: 'mys_14', name: 'Mystical Titanforged Mail', type: 'Armor', rarity: 'Mystical', price: 1, def: 160, hp: 2200 },
    { id: 'mys_15', name: 'Mystical Stormrider Boots', type: 'Boots', rarity: 'Mystical', price: 1, def: 85, str: 100 },
    { id: 'mys_16', name: 'Mystical Bloodstone Ring', type: 'Ring', rarity: 'Mystical', price: 1, hp: 1600, str: 120 },
    { id: 'mys_17', name: 'Mystical Sage Pendant', type: 'Amulet', rarity: 'Mystical', price: 1, int: 190, mana: 1100 },
    { id: 'mys_18', name: 'Mystical Frostfang Dagger', type: 'Weapon', rarity: 'Mystical', price: 8000, str: 175, int: 90 },
    { id: 'mys_19', name: 'Mystical Aegis of Dawn', type: 'Sub Weapon', rarity: 'Mystical', price: 7900, def: 130, hp: 1400 },
    { id: 'mys_20', name: 'Mystical Arcane Diadem', type: 'Helmet', rarity: 'Mystical', price: 7700, mana: 1200, int: 150 },
    { id: 'mys_21', name: 'Mystical Voidscale Robes', type: 'Armor', rarity: 'Mystical', price: 8800, def: 110, mana: 1600 },
    { id: 'mys_22', name: 'Mystical Lightning Legguards', type: 'Legging', rarity: 'Mystical', price: 7300, def: 105, int: 100 },
    { id: 'mys_23', name: 'Mystical Emberwalkers', type: 'Boots', rarity: 'Mystical', price: 7050, def: 82, mana: 700 },
    { id: 'mys_24', name: 'Mystical Vitality Band', type: 'Ring', rarity: 'Mystical', price: 9900, hp: 1800 },
    { id: 'mys_25', name: 'Mystical Mana Crystal', type: 'Amulet', rarity: 'Mystical', price: 10300, mana: 1400 },
    { id: 'mys_26', name: 'Mystical Apocalypse Hammer', type: 'Weapon', rarity: 'Mystical', price: 8600, str: 200 },
    { id: 'mys_27', name: 'Mystical Divine Focus', type: 'Sub Weapon', rarity: 'Mystical', price: 8200, int: 180, hp: 1000 },
    { id: 'mys_28', name: 'Mystical Emperor Diadem', type: 'Helmet', rarity: 'Mystical', price: 7800, def: 100, hp: 1200 },
    { id: 'mys_29', name: 'Mystical Netherforged Plate', type: 'Armor', rarity: 'Mystical', price: 9300, def: 170, hp: 2100 },
    { id: 'mys_30', name: 'Mystical Comet Striders', type: 'Legging', rarity: 'Mystical', price: 7400, def: 110, str: 120 },
    { id: 'mys_31', name: 'Mystical Eclipse Ring', type: 'Ring', rarity: 'Mystical', price: 9700, str: 150, int: 130 },
    { id: 'mys_32', name: 'Mystical Soulbound Charm', type: 'Amulet', rarity: 'Mystical', price: 10400, hp: 1400, mana: 1000 },
    { id: 'mys_33', name: 'Mystical Ragnarok Edge', type: 'Weapon', rarity: 'Mystical', price: 8700, str: 195, hp: 800 },
    { id: 'mys_34', name: 'Mystical Sacred Buckler', type: 'Sub Weapon', rarity: 'Mystical', price: 8000, def: 140, mana: 800 },
    { id: 'mys_35', name: 'Mystical Nebula Mask', type: 'Helmet', rarity: 'Mystical', price: 7650, int: 160, mana: 900 },
    { id: 'mys_36', name: 'Mystical Inferno Scale', type: 'Armor', rarity: 'Mystical', price: 8900, def: 130, str: 140 },
    { id: 'mys_37', name: 'Mystical Winddancer Pants', type: 'Legging', rarity: 'Mystical', price: 7350, def: 100, mana: 800 },
    { id: 'mys_38', name: 'Mystical Lunar Sabatons', type: 'Boots', rarity: 'Mystical', price: 7150, def: 90, hp: 1000 },
    { id: 'mys_39', name: 'Mystical Eternal Loop', type: 'Ring', rarity: 'Mystical', price: 9950, hp: 1700, int: 110 },
    { id: 'mys_40', name: 'Mystical Arcane Relic', type: 'Amulet', rarity: 'Mystical', price: 10550, int: 185, mana: 1300 },
    { id: 'mys_41', name: 'Mystical Judgment Halberd', type: 'Weapon', rarity: 'Mystical', price: 8400, str: 185, def: 80 },
    { id: 'mys_42', name: 'Mystical Celestial Sphere', type: 'Sub Weapon', rarity: 'Mystical', price: 8150, int: 175, mana: 1000 },
    { id: 'mys_43', name: 'Mystical Dawnbringer Helm', type: 'Helmet', rarity: 'Mystical', price: 7750, def: 98, str: 120 },
    { id: 'mys_44', name: 'Mystical Shadowforge Armor', type: 'Armor', rarity: 'Mystical', price: 9100, def: 155, hp: 1800 },
    { id: 'mys_45', name: 'Mystical Stormguard Legs', type: 'Legging', rarity: 'Mystical', price: 7450, def: 108, int: 105 },
    { id: 'mys_46', name: 'Mystical Voidwalker Treads', type: 'Boots', rarity: 'Mystical', price: 7200, def: 88, mana: 750 },
    { id: 'mys_47', name: 'Mystical Might Ring', type: 'Ring', rarity: 'Mystical', price: 9850, str: 160, hp: 1200 },
    { id: 'mys_48', name: 'Mystical Wisdom Talisman', type: 'Amulet', rarity: 'Mystical', price: 10600, int: 195, mana: 1400 },
    { id: 'mys_49', name: 'Mystical Doombringer Bow', type: 'Weapon', rarity: 'Mystical', price: 8550, str: 170, int: 110 },
    { id: 'mys_50', name: 'Mystical Realm Protector', type: 'Sub Weapon', rarity: 'Mystical', price: 8300, def: 145, hp: 2000, mana: 600 }
  ];

  const buyMysticalItem = (item) => {
    if (!currentAccount) {
      openConnectModal();
      return;
    }

    // Check if auction house is initialized (required for all purchases)
    if (!auctionHouseId) {
      addLog(`❌ Auction House not initialized. Please initialize first.`, 'error');
      return;
    }

    // Check if auction ID has been created for this specific item
    const auctionId = auctionIds[item.id];
    if (!auctionId) {
      addLog(`❌ Auction not created for ${item.name} yet.`, 'error');
      return;
    }

    // Check if package is configured
    if (AUCTION_HOUSE_CONFIG.packageId === '0x...' || !AUCTION_HOUSE_CONFIG.packageId) {
      addLog(`❌ Auction house not configured. Contact admin.`, 'error');
      return;
    }

    try {
      addLog(`🔄 Preparing purchase for ${item.name}...`, 'info');

      const tx = new Transaction();

      // Step 1: Split payment from gas
      // Takes the gas coin and splits out the payment amount (in MIST)
      const paymentAmount = item.price * 1_000_000_000; // Convert SUI to MIST (1 SUI = 1e9 MIST)
      const [paymentCoin] = tx.splitCoins(tx.gas, [paymentAmount]);

      // Step 2: Get required objects
      const clock = tx.object(AUCTION_HOUSE_CONFIG.clockId);
      const auctionHouse = tx.object(auctionHouseId);
      const auction = tx.object(auctionId);

      // Step 3: Call buy_item function
      tx.moveCall({
        target: `${AUCTION_HOUSE_CONFIG.packageId}::auction_house::buy_item`,
        arguments: [
          auctionHouse,   // &AuctionHouse
          auction,        // &mut Auction
          paymentCoin,    // Coin<SUI>
          clock,          // &Clock
        ],
      });

      // Step 4: Execute transaction
      signAndExecuteTransaction({ transaction: tx, account })
        .then((result) => {
          addLog(`✅ Purchase successful! TxHash: ${result.digest?.slice(0, 10)}...`, 'victory');
          addLog(`📦 You now own ${item.name}!`, 'nft');
          // Optionally add to inventory after confirmation
          setInventory(p => [...p, { ...item, source: 'On-Chain Purchase', equipped: false }]);
        })
        .catch((error) => {
          const errorMsg = error?.message || error?.toString?.() || 'Unknown error';
          addLog(`❌ Transaction failed: ${errorMsg}`, 'error');
          console.error('Transaction error:', error);
        });
    } catch (e) {
      const errorMsg = e?.message || e?.toString?.() || 'Unknown error';
      addLog(`❌ Error creating transaction: ${errorMsg}`, 'error');
      console.error('Tx creation error:', e);
    }
  };

  // === FEATURE 1: CREATE AUCTION ===
  // Lists an item on the auction house for a specified duration
  const createAuction = (item, durationMs = 86400000) => { // Default: 24 hours
    if (!currentAccount) {
      openConnectModal();
      return;
    }

    // Validate auctionHouseId exists and is a valid object ID
    if (!auctionHouseId || auctionHouseId === '0x...' || auctionHouseId === '0x0') {
      addLog(`❌ Auction House not initialized. Please initialize first.`, 'error');
      return;
    }

    if (AUCTION_HOUSE_CONFIG.packageId === '0x...' || !AUCTION_HOUSE_CONFIG.packageId) {
      addLog(`❌ Auction house not configured. Contact admin.`, 'error');
      return;
    }

    try {
      addLog(`🔄 Creating auction for ${item.name}...`, 'info');

      const tx = new Transaction();

      // TODO: In production, pass the actual on-chain Item object ID
      // For now, items would need to be created on-chain first via a separate transaction
      
      // Get the clock object
      const clock = tx.object(AUCTION_HOUSE_CONFIG.clockId);

      // Call the create function
      // NOTE: This will need the actual Item object ID passed as an argument
      const auctionResult = tx.moveCall({
        target: `${AUCTION_HOUSE_CONFIG.packageId}::auction_house::create`,
        arguments: [
          // TODO: Replace '0x...' with actual on-chain Item object ID
          tx.object('0x...'), // item: Item (on-chain object ID)
          tx.pure(BigInt(durationMs)), // duration_ms: u64
          clock,              // clock: &Clock
        ],
      });

      // Step 3: Execute transaction
      signAndExecuteTransaction({ transaction: tx, account })
        .then((result) => {
          addLog(`✅ Auction created! TxHash: ${result.digest?.slice(0, 10)}...`, 'victory');
          
          // Extract auction object ID from objectChanges (real on-chain result)
          let auctionId = null;
          
          if (result.objectChanges && Array.isArray(result.objectChanges)) {
            for (const change of result.objectChanges) {
              if (change.type === 'created' && change.objectType?.includes('Auction')) {
                auctionId = change.objectId;
                break;
              }
            }
          }
          
          // Fallback to effects.created for older transaction formats
          if (!auctionId && result.effects?.created && result.effects.created.length > 0) {
            auctionId = result.effects.created[0]?.reference?.objectId;
          }
          
          if (auctionId) {
            // Store the auction ID in state for use by buyMysticalItem
            setAuctionIds(prev => ({ ...prev, [item.id]: auctionId }));
            addLog(`📋 Auction ID: ${auctionId}`, 'info');
            addLog(`✅ Item ready for purchase!`, 'victory');
          } else {
            addLog(`⚠️ Auction created but object ID not found in transaction results`, 'info');
          }
        })
        .catch((error) => {
          const errorMsg = error?.message || error?.toString?.() || 'Unknown error';
          addLog(`❌ Auction creation failed: ${errorMsg}`, 'error');
          console.error('Auction creation error:', error);
        });
    } catch (e) {
      const errorMsg = e?.message || e?.toString?.() || 'Unknown error';
      addLog(`❌ Error creating auction transaction: ${errorMsg}`, 'error');
      console.error('Auction tx creation error:', e);
    }
  };

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

      const tx = new Transaction();

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
      signAndExecuteTransaction({ transaction: tx, account })
        .then((result) => {
          addLog(`✅ Item claimed successfully! TxHash: ${result.digest?.slice(0, 10)}...`, 'victory');
          addLog(`🎁 Check your inventory for your winnings!`, 'nft');
        })
        .catch((error) => {
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
        });
    } catch (e) {
      const errorMsg = e?.message || e?.toString?.() || 'Unknown error';
      addLog(`❌ Error creating claim transaction: ${errorMsg}`, 'error');
      console.error('Claim tx creation error:', e);
    }
  };

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

      const tx = new Transaction();

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
      signAndExecuteTransaction({ transaction: tx, account })
        .then((result) => {
          addLog(`✅ Payment claimed successfully! TxHash: ${result.digest?.slice(0, 10)}...`, 'victory');
          addLog(`💰 Funds transferred to your wallet (minus 0% fee).`, 'trade');
        })
        .catch((error) => {
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
        });
    } catch (e) {
      const errorMsg = e?.message || e?.toString?.() || 'Unknown error';
      addLog(`❌ Error creating claim transaction: ${errorMsg}`, 'error');
      console.error('Claim seller tx creation error:', e);
    }
  };

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

  const buyFromGoldShop = (item) => {
    if (player.gold < item.price) {
      addLog(`Not enough gold! Need ${item.price}`, 'info');
      return;
    }
    if (item.effect) {
      item.effect();
      addLog(`Used ${item.name}! ${item.description}`, 'info');
    } else {
      setInventory(p => [...p, { ...item, source: 'Gold Shop', equipped: false }]);
      addLog(`Purchased ${item.name} from Gold Shop!`, 'trade');
    }
    setPlayer(p => ({ ...p, gold: p.gold - item.price }));
  };

  // --- PAGINATION CALCULATIONS ---
  const goldTotalPages = Math.ceil(allGoldShopEquipment.length / ITEMS_PER_PAGE);
  const currentGoldItems = allGoldShopEquipment.slice((goldShopPage - 1) * ITEMS_PER_PAGE, goldShopPage * ITEMS_PER_PAGE);

  const suiTotalPages = Math.ceil(mysticalShopItems.length / ITEMS_PER_PAGE);
  const currentSuiItems = mysticalShopItems.slice((suiShopPage - 1) * ITEMS_PER_PAGE, suiShopPage * ITEMS_PER_PAGE);

  // --- NEW EQUIPMENT MODAL HELPER ---
  const EquipmentSlot = ({ type, icon }) => {
    const equippedItem = inventory.find(i => i.type === type && i.equipped);
    return (
      <div className={`w-16 h-16 bg-black/60 rounded-xl flex items-center justify-center relative group transition-all slot-${equippedItem?.rarity || 'Empty'} ${!equippedItem ? 'border border-white/5 opacity-40' : 'hover-lift'}`}>
        {equippedItem ? (
          <div className="text-2xl cursor-help">
            {type === 'Helmet' ? '🪖' : type === 'Armor' ? '👕' : type === 'Legging' ? '👖' : type === 'Boots' ? '🥾' : type === 'Amulet' ? '📿' : type === 'Ring' ? '💍' : type === 'Weapon' ? '🗡️' : '🛡️'}
            {/* Tooltip */}
            <div className="absolute hidden group-hover:block z-50 bg-black border border-white/10 p-3 rounded-lg w-48 -top-2 left-20 shadow-2xl">
               <div className={`text-xs font-black uppercase italic ${getRarityColor(equippedItem.rarity)}`}>{equippedItem.name}</div>
               <div className="text-[10px] text-gray-500 mt-1">
                 {equippedItem.str > 0 && <div>+{equippedItem.str} Strength</div>}
                 {equippedItem.def > 0 && <div>+{equippedItem.def} Resilience</div>}
                 {equippedItem.hp > 0 && <div>+{equippedItem.hp} Vitality</div>}
               </div>
            </div>
          </div>
        ) : (
          <div className="text-gray-700 text-sm font-black opacity-20 uppercase tracking-tighter">{icon}</div>
        )}
      </div>
    );
  };

  // AUTHENTICATION GATE: Show login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#1a1a2e] to-[#0a0a0f] text-white p-4 flex items-center justify-center">
        <GlobalStyles />
        <div className="max-w-4xl w-full">
          <div className="text-center mb-12">
            <h1 className="text-6xl font-black mb-3 bg-gradient-to-r from-yellow-400 via-purple-400 to-blue-500 bg-clip-text text-transparent italic tracking-tighter">
              ⛓️ CHAIN HUNTER ⛓️
            </h1>
            <p className="text-xl text-gray-400 font-medium tracking-widest uppercase">Prove Your Worth</p>
          </div>

          <div className="mb-10 bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-2xl">
            <div className="space-y-6">
              <div className="flex gap-4 p-1 bg-black/30 rounded-xl w-fit mx-auto">
                <button onClick={() => setAuthMode('login')} className={`px-6 py-2 rounded-lg font-bold transition-all ${authMode === 'login' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}>Login</button>
                <button onClick={() => setAuthMode('register')} className={`px-6 py-2 rounded-lg font-bold transition-all ${authMode === 'register' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>Register</button>
              </div>

              {authMode === 'register' ? (
                <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">Warrior Name</label>
                    <input value={regName} onChange={e => setRegName(e.target.value)} placeholder="Username" className="w-full p-3 bg-black/40 border border-white/10 rounded-xl focus:ring-2 ring-blue-500 outline-none transition-all"/>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">Password</label>
                    <input value={regPassword} onChange={e => setRegPassword(e.target.value)} placeholder="••••••••" type="password" className="w-full p-3 bg-black/40 border border-white/10 rounded-xl focus:ring-2 ring-blue-500 outline-none transition-all"/>
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">Confirm Identity</label>
                    <input value={regConfirm} onChange={e => setRegConfirm(e.target.value)} placeholder="Confirm Password" type="password" className="w-full p-3 bg-black/40 border border-white/10 rounded-xl focus:ring-2 ring-blue-500 outline-none transition-all"/>
                  </div>
                  <div className="md:col-span-2 flex gap-3 mt-2">
                    <button type="submit" className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 py-3 rounded-xl font-black uppercase tracking-wider shadow-lg shadow-blue-900/20 hover:scale-[1.02] active:scale-95 transition-all">Begin Registration</button>
                    <button type="button" onClick={() => { setRegName(''); setRegPassword(''); setRegConfirm(''); setMessage(''); }} className="px-6 bg-white/5 py-3 rounded-xl font-bold uppercase text-xs hover:bg-white/10 transition-all">Reset</button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleLogin} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">Hero Name</label>
                    <input value={loginName} onChange={e => setLoginName(e.target.value)} placeholder="Username" className="w-full p-3 bg-black/40 border border-white/10 rounded-xl focus:ring-2 ring-purple-500 outline-none transition-all"/>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">Identity Key</label>
                    <input value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="Password" type="password" className="w-full p-3 bg-black/40 border border-white/10 rounded-xl focus:ring-2 ring-purple-500 outline-none transition-all"/>
                  </div>
                  <div className="md:col-span-2 flex gap-3 mt-2">
                    <button type="submit" className="flex-1 bg-gradient-to-r from-purple-600 to-fuchsia-600 py-3 rounded-xl font-black uppercase tracking-wider shadow-lg shadow-purple-900/20 hover:scale-[1.02] active:scale-95 transition-all">Authenticate Hero</button>
                    <button type="button" onClick={() => { setLoginName(''); setLoginPassword(''); setMessage(''); }} className="px-6 bg-white/5 py-3 rounded-xl font-bold uppercase text-xs hover:bg-white/10 transition-all">Clear</button>
                  </div>
                </form>
              )}

              {message && <div className="mt-3 text-center text-sm font-bold text-red-400 bg-red-400/10 p-2 rounded-lg border border-red-400/20">{message}</div>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // CLASS SELECTION SCREEN: Show after login but before game starts
  if (showClassSelection) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#1a1a2e] to-[#0a0a0f] text-white p-4 flex items-center justify-center">
        <GlobalStyles />
        <div className="max-w-4xl w-full">
          <div className="text-center mb-12">
            <h1 className="text-6xl font-black mb-3 bg-gradient-to-r from-yellow-400 via-purple-400 to-blue-500 bg-clip-text text-transparent italic tracking-tighter">
              ⛓️ CHAIN HUNTER ⛓️
            </h1>
            <p className="text-xl text-gray-400 font-medium tracking-widest uppercase">Select Your Destiny</p>
          </div>

          <div className="mb-10 bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-2xl">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-xl">
                  <User size={32} className="text-white" />
                </div>
                <div>
                  <div className="text-xs font-black text-purple-400 uppercase tracking-widest">Authenticated User</div>
                  <div className="text-2xl font-black text-white">{currentUser?.name}</div>
                  {walletAddress && <div className="text-xs font-mono text-gray-500 mt-1">{walletAddress.slice(0, 12)}...{walletAddress.slice(-8)}</div>}
                </div>
              </div>

              <div className="flex flex-col items-end gap-3">
                {!walletAddress && <div className="text-red-400 text-[10px] font-black uppercase animate-pulse">Connection Required: Slush Wallet</div>}
                <div className="flex gap-2">
                  <button onClick={() => { setIsAuthenticated(false); setCurrentUser(null); setMessage('Logged out.'); setWalletAddress(null); }} className="bg-red-500/20 text-red-400 px-4 py-2 rounded-xl font-bold text-xs hover:bg-red-500/30 transition-all">Sign Out</button>
                  <ConnectButton className="!bg-purple-600 !text-white !font-black !rounded-xl !border-none !shadow-lg !shadow-purple-900/20" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {Object.entries(classes).map(([key, cls]) => (
              <div
                key={key}
                onClick={() => {
                  if (!walletAddress) { setMessage('You must connect wallet before selecting a class.'); return; }
                  initializePlayer(key);
                }}
                className={`group relative overflow-hidden bg-white/5 backdrop-blur-lg p-8 rounded-3xl border-2 border-white/5 hover:border-${cls.color}-500/50 cursor-pointer transition-all duration-300 hover:-translate-y-2`}
              >
                <div className={`absolute top-0 right-0 w-32 h-32 bg-${cls.color}-500/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-${cls.color}-500/20 transition-all`} />
                
                <div className="text-center relative z-10">
                  <div className="text-7xl mb-6 transform group-hover:scale-110 transition-transform">{cls.icon}</div>
                  <h2 className={`text-3xl font-black text-${cls.color}-400 mb-2 italic tracking-tighter uppercase`}>{cls.name}</h2>
                  <p className="text-xs text-gray-400 h-10 leading-relaxed font-medium">{cls.description}</p>
                </div>

                <div className="space-y-2 mt-6 relative z-10">
                  <div className="flex justify-between items-center p-2 bg-black/40 rounded-xl"><span className="text-[10px] font-black text-gray-500 uppercase">Strength</span><span className="font-bold text-red-400">{cls.baseStr}</span></div>
                  <div className="flex justify-between items-center p-2 bg-black/40 rounded-xl"><span className="text-[10px] font-black text-gray-500 uppercase">Endurance</span><span className="font-bold text-green-400">{cls.baseHp}</span></div>
                  <div className="flex justify-between items-center p-2 bg-black/40 rounded-xl"><span className="text-[10px] font-black text-gray-500 uppercase">Mana Flow</span><span className="font-bold text-blue-400">{cls.baseMana}</span></div>
                </div>

                <button className={`w-full mt-6 bg-${cls.color}-600 group-hover:bg-${cls.color}-500 py-3 rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg shadow-${cls.color}-900/20 transition-all`}>
                  Initiate Hero
                </button>
              </div>
            ))}
          </div>

          {message && <div className="mt-8 text-center text-sm font-bold text-red-400 bg-red-400/10 p-3 rounded-lg border border-red-400/20">{message}</div>}
        </div>
      </div>
    );
  }

  if (!player) return null;

  // WALLET GATE: Require wallet connection for game UI
  if (!walletAddress) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#1a1a2e] to-[#0a0a0f] text-white p-4 flex items-center justify-center">
        <GlobalStyles />
        <div className="max-w-4xl w-full text-center">
          <h1 className="text-6xl font-black mb-3 bg-gradient-to-r from-yellow-400 via-purple-400 to-blue-500 bg-clip-text text-transparent italic tracking-tighter">
            ⛓️ CHAIN HUNTER ⛓️
          </h1>
          <div className="mt-12 space-y-6 max-w-md mx-auto">
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10 shadow-2xl space-y-4">
              <div className="text-xl font-black text-yellow-400 mb-6">WALLET CONNECTION REQUIRED</div>
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl space-y-3">
                <p className="text-yellow-400 font-bold text-sm">Connect your Sui wallet to enter the game</p>
                <p className="text-xs text-gray-400">Welcome back, {currentUser?.name}!</p>
                <div className="flex justify-center">
                  <ConnectButton />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-200 p-4 font-sans selection:bg-purple-500/30">
      <GlobalStyles />
      
      {/* EQUIPMENT OVERLAY UI - MATCHING IMAGE REFERENCE */}
      {showEquipmentModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowEquipmentModal(false)} />
          <div className="relative bg-[#1a1a2e] border-2 border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] animate-in zoom-in duration-200">
            <div className="bg-[#252545] p-4 flex justify-between items-center border-b border-white/5">
              <h2 className="text-xl font-black italic tracking-tighter text-white flex items-center gap-2">EQUIPMENT</h2>
              <button onClick={() => setShowEquipmentModal(false)} className="hover:bg-red-500/20 p-2 rounded-xl text-red-500 transition-all"><X size={20}/></button>
            </div>
            
            <div className="p-8 grid grid-cols-3 gap-8">
              {/* Left Column: Armor Pieces */}
              <div className="flex flex-col gap-4">
                <EquipmentSlot type="Helmet" icon="Head" />
                <EquipmentSlot type="Amulet" icon="Neck" />
                <EquipmentSlot type="Armor" icon="Chest" />
                <EquipmentSlot type="Sub Weapon" icon="Arms" />
                <EquipmentSlot type="Legging" icon="Legs" />
                <EquipmentSlot type="Boots" icon="Feet" />
              </div>

              {/* Center Column: Character Model and Stats */}
              <div className="flex flex-col items-center justify-center">
                <div className="text-[120px] mb-6 drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]">{classes[player.class].icon}</div>
                <div className="bg-black/40 border border-white/5 rounded-2xl p-4 w-full space-y-2">
                  <div className="flex justify-between text-[10px] font-bold"><span className="text-gray-500">Damage</span><span className="text-white">{getPlayerAtk()}</span></div>
                  <div className="flex justify-between text-[10px] font-bold"><span className="text-gray-500">Defense</span><span className="text-blue-400">{player.def}</span></div>
                  <div className="flex justify-between text-[10px] font-bold"><span className="text-gray-500">Strength</span><span className="text-red-400">{player.str}</span></div>
                  <div className="flex justify-between text-[10px] font-bold"><span className="text-gray-500">Intelligence</span><span className="text-purple-400">{player.int}</span></div>
                </div>
              </div>

              {/* Right Column: Accessories */}
              <div className="flex flex-col gap-4 items-end">
                <div className="w-16 h-16 bg-black/20 rounded-xl border border-dashed border-white/10 flex items-center justify-center text-[10px] font-black text-gray-800 opacity-20 uppercase">Extra</div>
                <div className="w-16 h-16 bg-black/20 rounded-xl border border-dashed border-white/10 flex items-center justify-center text-[10px] font-black text-gray-800 opacity-20 uppercase">Extra</div>
                <div className="w-16 h-16 bg-black/20 rounded-xl border border-dashed border-white/10 flex items-center justify-center text-[10px] font-black text-gray-800 opacity-20 uppercase">Extra</div>
                <EquipmentSlot type="Ring" icon="Ring" />
                <div className="w-16 h-16 bg-black/20 rounded-xl border border-dashed border-white/10 flex items-center justify-center text-[10px] font-black text-gray-800 opacity-20 uppercase">Extra</div>
                <div className="w-16 h-16 bg-black/20 rounded-xl border border-dashed border-white/10 flex items-center justify-center text-[10px] font-black text-gray-800 opacity-20 uppercase">Extra</div>
              </div>

              {/* Bottom Row: Weapons */}
              <div className="col-span-3 flex justify-center gap-6 mt-4">
                 <EquipmentSlot type="Weapon" icon="Main Weapon" />
                 <div className="w-16 h-16 bg-black/20 rounded-xl border border-dashed border-white/10 flex items-center justify-center text-[10px] font-black text-gray-800 opacity-20 uppercase tracking-tighter text-center">Body Item</div>
              </div>
            </div>
            
            <div className="bg-[#15152a] p-4 text-center">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Equip gear from Cargo to boost node performance</p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
          {player && (
          <div className="flex items-center gap-4">
             <div className="text-4xl bg-white/5 p-3 rounded-2xl border border-white/10 shadow-inner">{classes[player?.class]?.icon}</div>
             <div>
                <h1 className="text-3xl font-black italic bg-gradient-to-r from-yellow-400 to-fuchsia-500 bg-clip-text text-transparent tracking-tighter leading-none mb-1">CHAIN HUNTER</h1>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-black px-2 py-0.5 rounded bg-${classes[player?.class]?.color}-500/20 text-${classes[player?.class]?.color}-400 uppercase tracking-widest border border-${classes[player?.class]?.color}-500/30`}>{classes[player?.class]?.name}</span>
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Slush Mainnet v1.0</span>
                </div>
             </div>
          </div>
          )}

          <div className="bg-white/5 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 flex items-center gap-8 shadow-xl">
             <div className="text-center">
                <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Active Hunter</div>
                <div className="flex items-center gap-2">
                  <div className="font-bold text-white leading-none">{currentUser?.name || 'Loading...'}</div>
                  {/* VIEW EQUIPMENT BUTTON */}
                  <button onClick={() => setShowEquipmentModal(true)} className="bg-blue-600/20 text-blue-400 p-1 rounded-lg border border-blue-500/30 hover:bg-blue-600 hover:text-white transition-all"><Shield size={12}/></button>
                </div>
             </div>
             <div className="text-center">
                <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Wallet Node</div>
                <div className="font-mono text-purple-400 leading-none">{walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Not Connected'}</div>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-slate-900/50 backdrop-blur-xl rounded-3xl p-6 border border-white/5 shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-black uppercase tracking-tighter flex items-center gap-2 text-purple-400">
                <Shield size={18} /> Hero Dossier
              </h2>
              <button onClick={() => setShowEquipmentModal(true)} className="text-[10px] font-black text-blue-400 hover:underline uppercase tracking-widest">Gear UI</button>
            </div>
            
            {player ? (
            <div className="space-y-4">
              <div className="bg-black/30 p-4 rounded-2xl border border-white/5">
                <div className="flex justify-between text-[10px] font-black mb-2 uppercase tracking-widest text-gray-400">
                  <span>Progress Level {player?.level}</span>
                  <span className="text-blue-400">{player?.exp} / {player?.expToNext} EXP</span>
                </div>
                <div className="bg-gray-800 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full transition-all duration-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: `${(player?.exp / player?.expToNext) * 100}%` }} />
                </div>
              </div>

              <div className="bg-black/30 p-4 rounded-2xl border border-white/5">
                <div className="flex justify-between text-[10px] font-black mb-2 uppercase tracking-widest text-gray-400">
                  <span className="flex items-center gap-1 text-red-500"><Heart size={10} fill="currentColor" /> Vitality Points</span>
                  <span>{player?.hp} / {player?.maxHp}</span>
                </div>
                <div className="bg-gray-800 rounded-full h-2 overflow-hidden">
                  <div className="bg-gradient-to-r from-red-600 to-orange-500 h-full transition-all duration-300 shadow-[0_0_10px_rgba(220,38,38,0.5)]" style={{ width: `${(player?.hp / player?.maxHp) * 100}%` }} />
                </div>
              </div>

              <div className="bg-black/30 p-4 rounded-2xl border border-white/5">
                <div className="flex justify-between text-[10px] font-black mb-2 uppercase tracking-widest text-gray-400">
                  <span className="flex items-center gap-1 text-blue-500"><Zap size={10} fill="currentColor" /> Mana Reserve</span>
                  <span>{player?.mana} / {player?.maxMana}</span>
                </div>
                <div className="bg-gray-800 rounded-full h-2 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-600 to-cyan-400 h-full transition-all duration-300 shadow-[0_0_10px_rgba(37,99,235,0.5)]" style={{ width: `${(player?.mana / player?.maxMana) * 100}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-black/40 border border-white/5 rounded-2xl p-3 text-center hover-lift">
                  <Dumbbell size={14} className="mx-auto text-red-500 mb-1" />
                  <div className="text-[10px] font-black text-gray-500 uppercase">STR</div>
                  <div className="text-lg font-black text-white leading-none mt-1">{player?.str}</div>
                </div>
                <div className="bg-black/40 border border-white/5 rounded-2xl p-3 text-center hover-lift">
                  <Brain size={14} className="mx-auto text-purple-500 mb-1" />
                  <div className="text-[10px] font-black text-gray-500 uppercase">INT</div>
                  <div className="text-lg font-black text-white leading-none mt-1">{player?.int}</div>
                </div>
                <div className="bg-black/40 border border-white/5 rounded-2xl p-3 text-center hover-lift">
                  <Shield size={14} className="mx-auto text-blue-500 mb-1" />
                  <div className="text-[10px] font-black text-gray-500 uppercase">DEF</div>
                  <div className="text-lg font-black text-white leading-none mt-1">{player?.def}</div>
                </div>
              </div>

              <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-4 flex items-center justify-between shadow-inner">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-500/10 rounded-xl"><Trophy size={20} className="text-yellow-500" /></div>
                  <div className="text-xs font-black uppercase text-gray-500">Hunter Gold</div>
                </div>
                <div className="text-2xl font-black text-yellow-400 tracking-tighter">{player?.gold}</div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400">Ability Points: {statPoints}</h3>
                  <Sparkles size={14} className="text-orange-400 animate-pulse" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => upgradeStat('str')} disabled={statPoints <= 0} className={`p-3 rounded-xl font-black text-[10px] uppercase transition-all ${statPoints > 0 ? 'bg-red-500 text-white hover:bg-red-400 shadow-lg shadow-red-900/20' : 'bg-white/5 text-gray-500 cursor-not-allowed'}`}>+ Strength</button>
                  <button onClick={() => upgradeStat('int')} disabled={statPoints <= 0} className={`p-3 rounded-xl font-black text-[10px] uppercase transition-all ${statPoints > 0 ? 'bg-purple-500 text-white hover:bg-purple-400 shadow-lg shadow-purple-900/20' : 'bg-white/5 text-gray-500 cursor-not-allowed'}`}>+ Intellect</button>
                  <button onClick={() => upgradeStat('def')} disabled={statPoints <= 0} className={`p-3 rounded-xl font-black text-[10px] uppercase transition-all ${statPoints > 0 ? 'bg-blue-500 text-white hover:bg-blue-400 shadow-lg shadow-blue-900/20' : 'bg-white/5 text-gray-500 cursor-not-allowed'}`}>+ Defense</button>
                  <button onClick={() => upgradeStat('maxMana')} disabled={statPoints <= 0} className={`p-3 rounded-xl font-black text-[10px] uppercase transition-all ${statPoints > 0 ? 'bg-cyan-500 text-white hover:bg-cyan-400 shadow-lg shadow-cyan-900/20' : 'bg-white/5 text-gray-500 cursor-not-allowed'}`}>+ Mana Pot</button>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-white/5">
                <h3 className="text-xs font-black uppercase text-gray-500 flex items-center gap-2"><Sparkles size={14} /> Arcane Techniques</h3>
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 combat-terminal">
                  {skills.map(skill => {
                    const unlocked = player?.level >= skill.unlockLevel;
                    const canUse = unlocked && skill.ready && player?.mana >= skill.manaCost;
                    const skillDamage = getSkillDamage(skill.multiplier);
                    
                    return (
                      <button
                        key={skill.id}
                        onClick={() => useSkill(skill)}
                        disabled={!canUse}
                        className={`w-full p-4 rounded-2xl border transition-all text-left relative overflow-hidden group ${
                          !unlocked 
                            ? 'bg-black/40 border-white/5 opacity-50'
                            : canUse
                            ? 'bg-purple-900/20 border-purple-500/30 hover:bg-purple-900/40 hover:border-purple-500/60'
                            : 'bg-black/60 border-white/5'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1 relative z-10">
                          <span className={`font-black text-sm italic tracking-tighter ${unlocked ? 'text-white' : 'text-gray-500'}`}>{skill.name}</span>
                          {unlocked && <span className="text-xs font-black text-yellow-500">{skillDamage} DMG</span>}
                        </div>
                        <div className="text-[10px] font-bold text-gray-500 leading-tight relative z-10">
                          {unlocked ? `${skill.manaCost} MP — ${skill.description}` : `Classified: Level ${skill.unlockLevel} Required`}
                        </div>
                        {canUse && <div className="absolute bottom-0 left-0 h-1 bg-purple-500/50 transition-all duration-[5000ms] ease-linear group-active:w-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            ) : (
            <div className="flex items-center justify-center h-96 text-center">
              <div className="space-y-2">
                <div className="text-gray-500 font-bold">Initializing game state...</div>
                <div className="text-xs text-gray-600">This will only take a moment</div>
              </div>
            </div>
            )}
          </div>

          <div className="bg-slate-900/50 backdrop-blur-xl rounded-3xl p-6 border border-white/5 shadow-2xl flex flex-col space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-black uppercase tracking-tighter flex items-center gap-2 text-red-500">
                  <Sword size={18} /> Warzone
                </h2>
                {/* GAME SPEED CONTROLS */}
                <div className="flex bg-black/40 rounded-xl p-1 border border-white/5">
                  {[1, 2, 3].map(speed => (
                    <button 
                      key={speed} 
                      onClick={() => setGameSpeed(speed)}
                      className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all ${gameSpeed === speed ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-white'}`}
                    >
                      x{speed}
                    </button>
                  ))}
                </div>
              </div>
              <button 
                onClick={normalAttack}
                disabled={!enemy}
                className={`px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs transition-all ${
                  !enemy 
                    ? 'bg-white/5 text-gray-500 cursor-not-allowed opacity-50' 
                    : 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-xl shadow-blue-900/30 hover:scale-[1.05] active:scale-95'
                }`}
              >
                Normal Strike
              </button>
            </div>

            {enemy && (
              <div className={`p-8 rounded-[2rem] relative overflow-hidden flex flex-col items-center justify-center transition-all ${enemy.isBoss ? 'bg-gradient-to-b from-red-950/40 to-black/80 border-2 border-yellow-500/30 shadow-[0_0_30px_rgba(234,179,8,0.1)]' : 'bg-black/60 border border-white/5'}`}>
                {enemy.isBoss && (
                  <div className="absolute top-4 left-4 flex gap-1">
                    <Sparkles size={16} className="text-yellow-500 animate-pulse" />
                    <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">Ancient Boss Encounter</span>
                  </div>
                )}
                
                <div className="text-center relative z-10 mb-6">
                  <div className={`text-[120px] mb-4 drop-shadow-2xl transition-transform hover:scale-110 duration-500 ${enemy.isBoss ? 'animate-bounce' : 'animate-pulse'}`}>
                    {enemy.isBoss ? '👺' : '👾'}
                  </div>
                  <h3 className={`text-2xl font-black italic tracking-tighter mb-1 ${enemy.isBoss ? 'text-yellow-400 uppercase' : 'text-white'}`}>
                    {enemy.name}
                  </h3>
                  <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                    {enemy.isBoss ? 'Elite Threat Level' : `Minor Manifestation — Lv.${enemy.level}`}
                  </div>
                </div>

                <div className="w-full max-w-sm space-y-4">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-black uppercase text-gray-500">
                      <span>Integrity</span>
                      <span>{enemy.hp} / {enemy.maxHp} HP</span>
                    </div>
                    <div className="bg-gray-800 rounded-full h-3 overflow-hidden p-0.5 border border-white/5">
                      <div className={`h-full rounded-full transition-all duration-300 ${enemy.isBoss ? 'bg-gradient-to-r from-red-600 via-orange-500 to-yellow-400' : 'bg-red-600'}`}
                        style={{ width: `${(enemy.hp / enemy.maxHp) * 100}%` }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-black/40 border border-white/5 rounded-2xl p-4 text-center">
                      <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Attack Power</div>
                      <div className="text-xl font-black text-red-500">{enemy.atk}</div>
                    </div>
                    <div className="bg-black/40 border border-white/5 rounded-2xl p-4 text-center">
                      <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Bounty</div>
                      <div className="text-xl font-black text-yellow-500">{enemy.reward.gold}G</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex-grow flex flex-col bg-black/40 border border-white/5 rounded-3xl p-6 min-h-[300px]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Operational Chronology</h3>
                {gameSpeed > 1 && <div className="text-[8px] font-black text-purple-400 bg-purple-400/10 px-2 py-1 rounded border border-purple-500/20">TIMESTEP x{gameSpeed} ACTIVE</div>}
              </div>
              <div className="flex-grow space-y-3 overflow-y-auto combat-terminal pr-2">
                {combatLog.map((log, i) => (
                  <div key={i} className={`text-[11px] font-medium p-3 rounded-xl border leading-relaxed animate-in slide-in-from-left duration-300 ${
                    log.type === 'victory' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                    log.type === 'nft' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300 font-bold' :
                    log.type === 'skill' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' :
                    log.type === 'trade' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                    'bg-white/5 border-white/5 text-gray-400'
                  }`}>
                    <span className="opacity-40 mr-2 font-mono">[{new Date(log.time).toLocaleTimeString([], { hour12: false, minute:'2-digit', second:'2-digit' })}]</span>
                    {log.message}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-xl rounded-3xl p-6 border border-white/5 shadow-2xl flex flex-col space-y-6">
            <div className="flex p-1 bg-black/40 rounded-2xl border border-white/10">
              <button onClick={() => setShopTab('inventory')} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${shopTab === 'inventory' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>
                Cargo ({inventory.length})
              </button>
              <button onClick={() => setShopTab('gold')} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${shopTab === 'gold' ? 'bg-yellow-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>
                Gold Shop
              </button>
              <button onClick={() => setShopTab('sui')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${shopTab === 'sui' ? 'bg-cyan-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>
                SUI Shop
              </button>
            </div>

            <div className="flex-grow overflow-y-auto pr-1 combat-terminal space-y-4 min-h-[500px]">
              {shopTab === 'inventory' && (
                inventory.length > 0 ? inventory.map(nft => (
                  <div key={nft.id} className={`bg-black/40 rounded-2xl p-4 border transition-all hover-lift ${nft.equipped ? 'border-green-500/50 bg-green-500/5' : 'border-white/5'}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className={`font-black italic tracking-tighter leading-tight ${getRarityColor(nft.rarity || 'Common')}`}>{nft.name}</h4>
                        <p className="text-[10px] font-bold text-gray-600 uppercase mt-0.5">Origin: {nft.source || 'Unknown'}</p>
                      </div>
                      {nft.equipped && (
                        <div className="bg-green-500/20 text-green-400 text-[8px] font-black px-2 py-1 rounded uppercase tracking-[0.2em] border border-green-500/30">Deployed</div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {nft.str > 0 && <div className="text-[10px] font-black text-red-500 p-1.5 bg-red-500/10 rounded-lg">+{nft.str} STR</div>}
                      {nft.int > 0 && <div className="text-[10px] font-black text-purple-500 p-1.5 bg-purple-500/10 rounded-lg">+{nft.int} INT</div>}
                      {nft.def > 0 && <div className="text-[10px] font-black text-blue-500 p-1.5 bg-blue-500/10 rounded-lg">+{nft.def} DEF</div>}
                      {nft.hp > 0 && <div className="text-[10px] font-black text-green-500 p-1.5 bg-green-500/10 rounded-lg">+{nft.hp} HP</div>}
                      {nft.mana > 0 && <div className="text-[10px] font-black text-cyan-500 p-1.5 bg-cyan-500/10 rounded-lg">+{nft.mana} MP</div>}
                    </div>

                    <div className="flex gap-2">
                      <button onClick={() => equipNFT(nft)} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${nft.equipped ? 'bg-gray-800 text-gray-400 hover:text-white' : 'bg-purple-600 text-white hover:bg-purple-500'}`}>
                        {nft.equipped ? 'Unequip' : 'Equip Unit'}
                      </button>
                      <button onClick={() => sellNFT(nft)} className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 py-2 rounded-xl text-[10px] font-black text-gray-400 uppercase tracking-widest transition-all">
                        Liquidate
                      </button>
                    </div>
                  </div>
                )) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center opacity-30">
                    <Box size={48} className="mb-4" />
                    <p className="text-xs font-black uppercase tracking-widest">Inventory Empty</p>
                    <p className="text-[10px] mt-1">Neutralize threats to acquire gear</p>
                  </div>
                )
              )}

              {shopTab === 'gold' && (
                <div className="space-y-8 pb-4">
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.3em] flex items-center gap-2">
                      <Sparkles size={12} /> Medical Supplies
                    </h3>
                    <div className="grid grid-cols-1 gap-2">
                      {goldShopPotions.map(pot => (
                        <div key={pot.id} className="bg-black/40 rounded-2xl p-4 border border-white/5 flex justify-between items-center group hover-lift">
                          <div>
                            <div className="text-xs font-black text-white">{pot.name}</div>
                            <div className="text-[9px] font-bold text-gray-500 uppercase mt-0.5">{pot.description}</div>
                          </div>
                          <button onClick={() => buyFromGoldShop(pot)} className="bg-yellow-600 hover:bg-yellow-500 px-4 py-2 rounded-xl text-[10px] font-black uppercase text-white transition-all active:scale-90">
                            {pot.price}G
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.3em] flex items-center gap-2">
                        <Trophy size={12} /> Arsenal ({allGoldShopEquipment.length})
                      </h3>
                      {/* GOLD SHOP PAGINATION CONTROLS */}
                      <div className="flex items-center gap-2">
                        <button disabled={goldShopPage === 1} onClick={() => setGoldShopPage(p => p - 1)} className="p-1 rounded bg-white/5 disabled:opacity-20 hover:bg-purple-600 transition-all"><ChevronLeft size={12}/></button>
                        <span className="text-[10px] font-black text-gray-500">{goldShopPage} / {goldTotalPages}</span>
                        <button disabled={goldShopPage === goldTotalPages} onClick={() => setGoldShopPage(p => p + 1)} className="p-1 rounded bg-white/5 disabled:opacity-20 hover:bg-purple-600 transition-all"><ChevronRight size={12}/></button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {currentGoldItems.map(item => (
                        <div key={item.id} className="bg-black/40 rounded-2xl p-4 border border-white/5 flex items-center justify-between group hover:border-yellow-500/20 transition-all">
                          <div className="flex-1">
                            <div className={`text-xs font-black italic ${getRarityColor(item.rarity || 'Common')}`}>{item.name}</div>
                            <div className="text-[9px] font-bold text-gray-600 uppercase">{item.type}</div>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {item.str > 0 && <span className="text-[8px] font-black text-red-400">+{item.str} STR</span>}
                              {item.int > 0 && <span className="text-[8px] font-black text-purple-400">+{item.int} INT</span>}
                              {item.def > 0 && <span className="text-[8px] font-black text-blue-400">+{item.def} DEF</span>}
                              {item.hp > 0 && <span className="text-[8px] font-black text-green-400">+{item.hp} HP</span>}
                              {item.mana > 0 && <span className="text-[8px] font-black text-cyan-400">+{item.mana} MP</span>}
                            </div>
                          </div>
                          <button onClick={() => buyFromGoldShop(item)} className="bg-white/10 hover:bg-yellow-600 px-4 py-3 rounded-xl text-[10px] font-black text-white uppercase transition-all">
                            {item.price}G
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {shopTab === 'sui' && (
                <div className="space-y-6 pb-4">
                  <div className="text-center p-6 bg-gradient-to-br from-cyan-900/40 via-blue-900/20 to-transparent rounded-3xl border border-cyan-500/20 shadow-inner">
                    <h3 className="text-2xl font-black italic tracking-tighter text-cyan-300 mb-1">MYSTICAL HUB</h3>
                    <p className="text-[9px] font-bold text-cyan-500 uppercase tracking-widest leading-relaxed">Direct Blockchain Transactions Required via Slush Protocol</p>
                    
                    {/* Auction House Status & Initialization */}
                    <div className="mt-4 p-4 rounded-2xl border" style={{
                      borderColor: auctionHouseStatus === 'initialized' ? '#22c55e' : auctionHouseStatus === 'initializing' ? '#f59e0b' : auctionHouseStatus === 'failed' ? '#ef4444' : '#64748b',
                      backgroundColor: auctionHouseStatus === 'initialized' ? 'rgba(34, 197, 94, 0.1)' : auctionHouseStatus === 'initializing' ? 'rgba(245, 158, 11, 0.1)' : auctionHouseStatus === 'failed' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                    }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest" style={{
                          color: auctionHouseStatus === 'initialized' ? '#22c55e' : auctionHouseStatus === 'initializing' ? '#f59e0b' : auctionHouseStatus === 'failed' ? '#ef4444' : '#94a3b8'
                        }}>
                          {auctionHouseStatus === 'initialized' ? '✅ Auction House Ready' : auctionHouseStatus === 'initializing' ? '⏳ Initializing...' : auctionHouseStatus === 'failed' ? '❌ Initialization Failed' : '⚠️ Not Initialized'}
                        </span>
                        {auctionHouseId && <span className="text-[8px] font-mono text-gray-500">{auctionHouseId.slice(0, 8)}...</span>}
                      </div>
                      {initError && <p className="text-[9px] text-red-400 mb-3">{initError}</p>}
                      {auctionHouseStatus !== 'initialized' && (
                        <button
                          onClick={initializeAuctionHouseHandler}
                          disabled={auctionHouseStatus === 'initializing' || !currentAccount}
                          className={`w-full py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                            auctionHouseStatus === 'initializing' || !currentAccount
                              ? 'bg-white/5 text-gray-500 cursor-not-allowed'
                              : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                          }`}
                        >
                          {auctionHouseStatus === 'initializing' ? 'Initializing...' : !currentAccount ? 'Connect Wallet' : 'Initialize Auction House'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-cyan-500 uppercase tracking-widest">Ancient Cache</span>
                      {/* SUI SHOP PAGINATION CONTROLS */}
                      <div className="flex items-center gap-2">
                        <button disabled={suiShopPage === 1} onClick={() => setSuiShopPage(p => p - 1)} className="p-1 rounded bg-white/5 disabled:opacity-20 hover:bg-cyan-600 transition-all"><ChevronLeft size={12}/></button>
                        <span className="text-[10px] font-black text-gray-500">{suiShopPage} / {suiTotalPages}</span>
                        <button disabled={suiShopPage === suiTotalPages} onClick={() => setSuiShopPage(p => p + 1)} className="p-1 rounded bg-white/5 disabled:opacity-20 hover:bg-cyan-600 transition-all"><ChevronRight size={12}/></button>
                      </div>
                    </div>

                    {auctionHouseStatus === 'initialized' ? (
                      currentSuiItems.map(item => (
                        <div key={item.id} className="bg-gradient-to-br from-indigo-950/40 via-black to-indigo-950/40 rounded-[2rem] p-6 border-2 border-cyan-500/20 group hover:border-cyan-500/50 transition-all duration-500 shadow-xl shadow-cyan-950/20 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-cyan-500/10 transition-all" />
                          
                          <div className="flex justify-between items-start mb-4 relative z-10">
                            <div>
                              <h4 className="font-black italic text-xl text-cyan-300 tracking-tighter leading-none animate-pulse">{item.name}</h4>
                              <p className="text-[10px] font-bold text-cyan-700 uppercase mt-1">Tier: Mystical Asset</p>
                            </div>
                            <div className="bg-cyan-500/20 px-2 py-1 rounded-lg border border-cyan-500/30">
                              <Box size={14} className="text-cyan-400" />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 mb-6 relative z-10">
                            {item.str > 0 && <div className="text-[10px] font-black text-red-400 p-2 bg-red-400/10 rounded-xl">+{item.str} Strength</div>}
                            {item.int > 0 && <div className="text-[10px] font-black text-purple-400 p-2 bg-purple-400/10 rounded-xl">+{item.int} Intelligence</div>}
                            {item.def > 0 && <div className="text-[10px] font-black text-blue-400 p-2 bg-blue-400/10 rounded-xl">+{item.def} Resilience</div>}
                            {item.hp > 0 && <div className="text-[10px] font-black text-green-400 p-2 bg-green-400/10 rounded-xl">+{item.hp} Core Vitality</div>}
                            {item.mana > 0 && <div className="text-[10px] font-black text-cyan-400 p-2 bg-cyan-400/10 rounded-xl">+{item.mana} MP Capacity</div>}
                          </div>

                          <button
                            onClick={() => buyMysticalItem(item)}
                            disabled={!walletAddress || !auctionHouseId || !auctionIds[item.id]}
                            className={`w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all flex items-center justify-center gap-2 ${
                              walletAddress && auctionHouseId && auctionIds[item.id]
                                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_10px_20px_rgba(8,145,178,0.3)] hover:scale-[1.02] active:scale-95' 
                                : 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/5'
                            }`}
                          >
                            {!walletAddress ? 'Connect Wallet' : !auctionHouseId ? 'Auction Not Ready' : !auctionIds[item.id] ? 'Creating Auction...' : `Authorize ${item.price} SUI`}
                            {walletAddress && auctionHouseId && auctionIds[item.id] && <LogIn size={14}/>}
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center opacity-50">
                        <Box size={48} className="mb-4" />
                        <p className="text-xs font-black uppercase tracking-widest">Auction House Offline</p>
                        <p className="text-[10px] mt-1">Initialize above to enable transactions</p>
                      </div>
                    )}
                  </div>

                  {marketplace.length > 0 && (
                    <div className="space-y-4 pt-6 mt-6 border-t border-white/5">
                      <h3 className="text-[10px] font-black text-purple-400 uppercase tracking-[0.3em] flex items-center gap-2">
                        <ShoppingBag size={12} /> P2P Exchange
                      </h3>
                      {marketplace.map((nft, i) => (
                        <div key={i} className="bg-black/60 rounded-2xl p-4 border border-white/10 flex items-center justify-between hover-lift">
                          <div className="flex-1">
                            <h4 className={`text-xs font-black italic ${getRarityColor(nft.rarity)}`}>{nft.name}</h4>
                            <p className="text-[9px] font-bold text-gray-500 uppercase">Vendor: {nft.seller || 'Unknown'}</p>
                          </div>
                          <button onClick={() => buyNFT(nft)} className="bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600 hover:text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase border border-cyan-600/30 transition-all">
                             {nft.price} SUI
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 bg-slate-800/80 border-t border-slate-800 rounded-b-3xl">
              <div className="flex justify-between items-center text-xs font-black uppercase tracking-tighter">
                <span className="text-slate-500">Gold Balance</span>
                <span className="text-yellow-500 text-lg">{player.gold}G</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/10 shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-center relative z-10">
            <div className="space-y-1">
              <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Selected Class</div>
              <div className={`font-black uppercase italic tracking-tighter text-${classes[player.class].color}-400`}>
                {classes[player.class].icon} {classes[player.class].name}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Raid Target</div>
              <div className="font-black text-yellow-400 tracking-tighter uppercase italic">
                Boss Lv.{Math.ceil((player.level + 1) / 10) * 10}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Loot Matrix</div>
              <div className="font-black text-blue-400 tracking-tighter">
                {Math.min(5 + (player.level * 0.5), 30).toFixed(1)}% Yield
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Owned Assets</div>
              <div className="font-black text-purple-400 tracking-tighter">{inventory.length} NFTs</div>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Slush Interface</div>
              <div className="font-black text-green-400 text-xs uppercase tracking-widest">Connected (OK)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const queryClient = new QueryClient();
const networkConfig = {
  testnet: { url: getFullnodeUrl('testnet') },
};

const AppWrapper = () => (
  <QueryClientProvider client={queryClient}>
    <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
      <WalletProvider>
        <ChainHunter />
      </WalletProvider>
    </SuiClientProvider>
  </QueryClientProvider>
);

export default AppWrapper;