import { SuiClient } from '@mysten/sui/client';
import { getFullnodeUrl } from '@mysten/sui/client';

/**
 * Sui Testnet Client Configuration
 * Connects to the Sui Testnet fullnode
 */
export const SUI_CLIENT = new SuiClient({
  url: getFullnodeUrl('testnet'),
});

/**
 * Deployed Auction House package ID
 * Updated automatically by parse-sui-deploy.js script
 * Format: 0x<hex_characters>
 */
export const PACKAGE_ID = '0xefe8d731c7d9ea0fc22e063986091187ab87c338257318b1b0392b3daa429bb7';

/**
 * Auction House object ID (created during deployment)
 * Shared object created by the init function
 * Updated automatically by parse-sui-deploy.js script
 * Format: 0x<hex_characters>
 */
export const AUCTION_HOUSE_ID = '0x0'; // Will be populated after first deployment

/**
 * System constants
 */
export const CLOCK_ID = '0x6'; // Standard Sui clock object ID

export default {
  SUI_CLIENT,
  PACKAGE_ID,
  AUCTION_HOUSE_ID,
  CLOCK_ID,
};
