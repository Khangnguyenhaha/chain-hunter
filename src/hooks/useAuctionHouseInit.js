import { useCallback } from 'react';
import { useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { PACKAGE_ID, CLOCK_ID, SUI_CLIENT } from '../config/sui';

/**
 * Hook to initialize the AuctionHouse on-chain
 * Calls auction_house::init, waits for effects, extracts objectId
 * Saves to localStorage and updates UI state
 */
export const useAuctionHouseInit = () => {
  const { mutate: executeTransaction } = useSignAndExecuteTransaction();

  /**
   * Execute the auction_house::init transaction
   * @param {Object} options
   * @param {string} options.packageId - Package ID to use for the call (defaults to config)
   * @param {Function} options.onSuccess - Callback on success: (auctionHouseObjectId) => void
   * @param {Function} options.onError - Callback on error: (error) => void
   * @param {Function} options.onLoading - Callback on loading state: (isLoading) => void
   */
  const initializeAuctionHouse = useCallback(
    (options = {}) => {
      const {
        packageId = PACKAGE_ID,
        onSuccess,
        onError,
        onLoading,
      } = options;

      if (!packageId || packageId === '0x0') {
        const error = new Error('Package ID not set. Deploy the contract first.');
        onError?.(error);
        return;
      }

      onLoading?.(true);

      try {
        // Create transaction block
        const tx = new Transaction();

        // Call auction_house::init
        // This creates and returns a shared AuctionHouse object
        const result = tx.moveCall({
          target: `${packageId}::auction_house::init`,
          arguments: [],
        });

        console.log('📡 Executing auction_house::init transaction...');

        // Execute via wallet
        executeTransaction(
          { transaction: tx },
          {
            onSuccess: (response) => {
              onLoading?.(false);
              console.log('✅ Transaction executed:', response);

              try {
                // Extract the created AuctionHouse object ID from transaction effects
                const auctionHouseId = extractAuctionHouseObjectId(response);

                if (auctionHouseId) {
                  // Save to localStorage
                  localStorage.setItem('chain_hunter_auction_house_id', auctionHouseId);
                  console.log('💾 Saved AuctionHouse ID to localStorage:', auctionHouseId);

                  onSuccess?.(auctionHouseId);
                } else {
                  const error = new Error(
                    'Transaction successful but could not extract AuctionHouse object ID'
                  );
                  console.error('❌ Extraction failed:', response);
                  onError?.(error);
                }
              } catch (extractError) {
                console.error('❌ Error parsing transaction response:', extractError);
                onError?.(extractError);
              }
            },
            onError: (error) => {
              onLoading?.(false);
              const errorMsg = error?.message || error?.toString() || 'Unknown error';
              console.error('❌ Transaction failed:', errorMsg);
              onError?.(error);
            },
          }
        );
      } catch (error) {
        onLoading?.(false);
        console.error('❌ Transaction creation failed:', error);
        onError?.(error);
      }
    },
    [executeTransaction]
  );

  return { initializeAuctionHouse };
};

/**
 * Extract AuctionHouse object ID from transaction response
 * Supports both objectChanges and effects formats
 *
 * @param {Object} response - Transaction response from signAndExecuteTransaction
 * @returns {string|null} - The AuctionHouse object ID or null if not found
 */
export function extractAuctionHouseObjectId(response) {
  if (!response) return null;

  // Method 1: Check objectChanges array (primary method)
  if (response.objectChanges && Array.isArray(response.objectChanges)) {
    for (const change of response.objectChanges) {
      // Look for created objects of type AuctionHouse
      if (change.type === 'created') {
        // Check if this is an AuctionHouse object
        if (
          change.objectType &&
          (change.objectType.includes('::auction_house::AuctionHouse') ||
            change.objectType.includes('AuctionHouse'))
        ) {
          console.log('Found AuctionHouse in objectChanges:', change);
          return change.objectId;
        }
      }
    }
  }

  // Method 2: Check effects.created as fallback
  if (response.effects?.created && Array.isArray(response.effects.created)) {
    for (const created of response.effects.created) {
      const objId = created.reference?.objectId;
      if (objId) {
        console.log('Found object in effects.created:', objId);
        return objId;
      }
    }
  }

  // Method 3: Check objectId in response directly (some SDK versions)
  if (response.objectId && response.objectId.startsWith('0x')) {
    console.log('Found objectId directly in response:', response.objectId);
    return response.objectId;
  }

  return null;
}

/**
 * Utility function to check if AuctionHouseId exists and initialize if needed
 *
 * @param {Object} options
 * @param {string} options.auctionHouseId - Current auction house ID from state
 * @param {Function} options.onInitialized - Callback when initialized: (objectId) => void
 * @param {Function} options.onError - Callback on error: (error) => void
 * @returns {Function} - Function to trigger initialization
 */
export function useAutoAuctionHouseInit(options = {}) {
  const { auctionHouseId, onInitialized, onError } = options;
  const { initializeAuctionHouse } = useAuctionHouseInit();

  return useCallback(() => {
    // Check if already initialized
    if (auctionHouseId && auctionHouseId !== '0x0') {
      console.log('✅ AuctionHouse already initialized:', auctionHouseId);
      return;
    }

    // Check localStorage
    const stored = localStorage.getItem('chain_hunter_auction_house_id');
    if (stored && stored !== '0x0') {
      console.log('✅ AuctionHouse found in localStorage:', stored);
      onInitialized?.(stored);
      return;
    }

    // Initialize
    console.log('🚀 Initializing AuctionHouse...');
    initializeAuctionHouse({
      onSuccess: (objectId) => {
        console.log('🎉 AuctionHouse initialized:', objectId);
        onInitialized?.(objectId);
      },
      onError: (error) => {
        console.error('💥 AuctionHouse initialization failed:', error);
        onError?.(error);
      },
    });
  }, [auctionHouseId, initializeAuctionHouse, onInitialized, onError]);
}

export default useAuctionHouseInit;
