import React, { useState } from 'react';
import { LogIn, AlertCircle, CheckCircle2, Loader, Zap } from 'lucide-react';
import { SuiClientProvider, WalletProvider, useCurrentAccount, ConnectButton, useConnectWallet, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { getFullnodeUrl } from '@mysten/sui/client';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { CLOCK_ID, PACKAGE_ID } from './config/sui';

import '@mysten/dapp-kit/dist/index.css';

const GlobalStyles = () => (
  <style>{`
    .hover-lift { transition: transform 0.2s ease, box-shadow 0.2s ease; }
    .hover-lift:hover { transform: translateY(-3px); box-shadow: 0 10px 20px -10px rgba(0,0,0,0.5); }
  `}</style>
);

const ChainHunter = () => {
  // Hooks
  const account = useCurrentAccount();
  const connectWallet = useConnectWallet();
  const { mutate: executeTransaction } = useSignAndExecuteTransaction();

  // UI state
  const [isInitializingAH, setIsInitializingAH] = useState(false);
  const [error, setError] = useState(null);

  // Derived values
  const currentAccount = account;
  const openConnectModal = connectWallet.openConnectModal;

  // Sample mystical items for MVP
  const mysticalShopItems = [
    { id: 'mys_01', name: 'Mystical Void Cleaver', price: 1, str: 180, int: 80 },
    { id: 'mys_02', name: 'Mystical Astral Wand', price: 1, int: 200, mana: 800 },
    { id: 'mys_03', name: 'Mystical Soul Harvester', price: 1, str: 160, hp: 1200 },
    { id: 'mys_04', name: 'Mystical Eternal Guardian', price: 1, def: 120, hp: 1500 },
    { id: 'mys_05', name: 'Mystical Crown of Infinity', price: 1, def: 90, mana: 1000, int: 120 },
    { id: 'mys_06', name: 'Mystical Celestial Plate', price: 1, def: 150, hp: 2000 },
  ];

  // Helper: Ensure Auction House exists (lazy initialization)
  const ensureAuctionHouse = () => {
    return new Promise((resolve, reject) => {
      // Check localStorage first
      const storedAuctionHouseId = localStorage.getItem('AUCTION_HOUSE_ID');
      if (storedAuctionHouseId) {
        resolve(storedAuctionHouseId);
        return;
      }

      // Create new Auction House
      if (!currentAccount) {
        reject(new Error('Please connect your wallet first'));
        return;
      }

      setIsInitializingAH(true);
      setError(null);

      try {
        const tx = new Transaction();
        const clock = tx.object(CLOCK_ID);

        tx.moveCall({
          target: `${PACKAGE_ID}::auction_house::create`,
          arguments: [clock],
        });

        executeTransaction(
          { transaction: tx },
          {
            onSuccess: (result) => {
              let auctionHouseObjectId = null;

              if (result.objectChanges && Array.isArray(result.objectChanges)) {
                for (const change of result.objectChanges) {
                  if (change.type === 'created' && change.objectType?.includes('AuctionHouse')) {
                    auctionHouseObjectId = change.objectId;
                    break;
                  }
                }
              }

              if (!auctionHouseObjectId && result.effects?.created && result.effects.created.length > 0) {
                auctionHouseObjectId = result.effects.created[0]?.reference?.objectId;
              }

              if (auctionHouseObjectId) {
                localStorage.setItem('AUCTION_HOUSE_ID', auctionHouseObjectId);
                setIsInitializingAH(false);
                resolve(auctionHouseObjectId);
              } else {
                setIsInitializingAH(false);
                reject(new Error('Could not extract Auction House object ID'));
              }
            },
            onError: (error) => {
              setIsInitializingAH(false);
              const errorMsg = error?.message || 'Unknown error';
              reject(new Error(`Transaction failed: ${errorMsg}`));
            },
          }
        );
      } catch (error) {
        setIsInitializingAH(false);
        reject(new Error(`Error: ${error?.message || 'Unexpected error'}`));
      }
    });
  };

  // Buy mystical item
  const buyMysticalItem = async (item) => {
    try {
      setError(null);

      if (!currentAccount) {
        openConnectModal();
        return;
      }

      // Ensure Auction House exists before buying
      const auctionHouseId = await ensureAuctionHouse();

      alert(`Purchase initiated for ${item.name}!\n\nNote: Auction integration requires on-chain item creation.`);
    } catch (err) {
      setError(err.message || 'Failed to process purchase');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#1a1a2e] to-[#0a0a0f] text-white p-6">
      <GlobalStyles />

      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-black mb-2 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            AUCTION HOUSE MVP
          </h1>
          <p className="text-sm text-gray-400 uppercase tracking-widest">Sui Testnet</p>
        </div>

        {/* Wallet Connection */}
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl p-6 border border-white/10 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black uppercase tracking-tighter flex items-center gap-2">
              <Zap size={18} className="text-cyan-400" /> Wallet
            </h2>
            <ConnectButton />
          </div>
          {currentAccount && (
            <div className="text-sm font-mono text-gray-300">
              Connected: {currentAccount.address.slice(0, 10)}...{currentAccount.address.slice(-6)}
            </div>
          )}
        </div>

        {/* Auction House Initialization */}
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl p-6 border border-white/10 mb-6">
          <h2 className="text-lg font-black uppercase tracking-tighter mb-4">Mystical Items</h2>
          <div className="space-y-3">
            {mysticalShopItems.map((item) => (
              <div
                key={item.id}
                className="bg-indigo-950/40 border border-cyan-500/20 rounded-xl p-4 hover-lift"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-cyan-300">{item.name}</h3>
                    <div className="text-xs text-gray-400 mt-1 flex gap-3">
                      {item.str && <span>STR: +{item.str}</span>}
                      {item.int && <span>INT: +{item.int}</span>}
                      {item.def && <span>DEF: +{item.def}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => buyMysticalItem(item)}
                    disabled={!currentAccount || isInitializingAH}
                    className={`py-2 px-4 rounded-lg font-bold text-xs transition-all flex items-center gap-2 ${
                      currentAccount && !isInitializingAH
                        ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
                        : 'bg-white/5 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {isInitializingAH ? (
                      <>
                        <Loader size={12} className="animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <LogIn size={12} />
                        {item.price} SUI
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div className="mt-3 bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-300">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const queryClient = new QueryClient();

const AppWrapper = () => (
  <QueryClientProvider client={queryClient}>
    <SuiClientProvider networks={{ testnet: { url: getFullnodeUrl('testnet') } }} defaultNetwork="testnet">
      <WalletProvider>
        <ChainHunter />
      </WalletProvider>
    </SuiClientProvider>
  </QueryClientProvider>
);

export default AppWrapper;
