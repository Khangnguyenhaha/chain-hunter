#!/usr/bin/env node

/**
 * Parse Sui client publish output and extract packageId + AuctionHouse objectId
 * 
 * Usage:
 *   # Direct input
 *   node scripts/parse-sui-deploy.js "$(sui client publish ...)"
 *   
 *   # From file
 *   node scripts/parse-sui-deploy.js < publish-output.txt
 *   
 *   # Interactive (paste output and press Ctrl+D when done)
 *   node scripts/parse-sui-deploy.js
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  bold: '\x1b[1m',
};

/**
 * Extract packageId from Sui CLI output
 */
function extractPackageId(output) {
  // Look for: "Published Objects:"  followed by object with type ending in "::auction_house"
  // Pattern: objectId, version, digest
  const publishedMatch = output.match(/Published Objects:\s*-\s*ID:\s*(0x[a-f0-9]+)/i);
  if (publishedMatch) {
    return publishedMatch[1];
  }

  // Fallback: Look for any object ID in the output that looks like a package
  const packageMatch = output.match(/Package ID:\s*(0x[a-f0-9]+)/i);
  if (packageMatch) {
    return packageMatch[1];
  }

  return null;
}

/**
 * Extract AuctionHouse objectId from Sui CLI output
 * The init function creates and shares an AuctionHouse object
 */
function extractAuctionHouseObjectId(output) {
  // Look for shared objects created by the init function
  // Pattern: "Shared Objects:" followed by object with AuctionHouse type
  const sharedMatch = output.match(/Shared Objects:\s*-\s*ID:\s*(0x[a-f0-9]+)/i);
  if (sharedMatch) {
    return sharedMatch[1];
  }

  // Fallback: Look for any shared object in the output
  // Sometimes the format varies
  const lines = output.split('\n');
  let inSharedSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.includes('Shared Objects:')) {
      inSharedSection = true;
      continue;
    }
    
    if (inSharedSection) {
      if (line.match(/ID:\s*(0x[a-f0-9]+)/i)) {
        const match = line.match(/ID:\s*(0x[a-f0-9]+)/i);
        return match[1];
      }
      
      if (!line.trim().startsWith('-') && line.trim() !== '' && !line.includes('ID:')) {
        inSharedSection = false;
      }
    }
  }

  return null;
}

/**
 * Parse the complete output and extract all relevant info
 */
function parseDeploymentOutput(output) {
  const packageId = extractPackageId(output);
  const auctionHouseObjectId = extractAuctionHouseObjectId(output);

  return {
    packageId,
    auctionHouseObjectId,
    timestamp: new Date().toISOString(),
    network: 'testnet', // Can be updated based on detection
  };
}

/**
 * Update the frontend config file
 */
function updateConfigFile(data) {
  const configPath = path.join(__dirname, '../src/config/sui.ts');
  
  try {
    let content = fs.readFileSync(configPath, 'utf8');
    
    // Update PACKAGE_ID
    if (data.packageId) {
      content = content.replace(
        /export const PACKAGE_ID = '0x[a-f0-9]+'/,
        `export const PACKAGE_ID = '${data.packageId}'`
      );
    }
    
    // Update AUCTION_HOUSE_ID (add if it doesn't exist)
    if (data.auctionHouseObjectId) {
      if (content.includes('export const AUCTION_HOUSE_ID')) {
        content = content.replace(
          /export const AUCTION_HOUSE_ID = '[^']*'/,
          `export const AUCTION_HOUSE_ID = '${data.auctionHouseObjectId}'`
        );
      } else {
        // Add after PACKAGE_ID
        content = content.replace(
          /(export const PACKAGE_ID = '[^']*';)/,
          `$1\n\n/**\n * Auction House object ID (created during deployment)\n * Shared object created by the init function\n */\nexport const AUCTION_HOUSE_ID = '${data.auctionHouseObjectId}';`
        );
      }
    }
    
    fs.writeFileSync(configPath, content, 'utf8');
    return true;
  } catch (error) {
    console.error(`Error updating config file: ${error.message}`);
    return false;
  }
}

/**
 * Save deployment info to JSON for backup
 */
function saveDeploymentInfo(data) {
  const deployDir = path.join(__dirname, '../deployments');
  
  // Create deployments directory if it doesn't exist
  if (!fs.existsSync(deployDir)) {
    fs.mkdirSync(deployDir, { recursive: true });
  }
  
  const filename = `deployment-${data.timestamp.split('T')[0]}-${Date.now()}.json`;
  const filepath = path.join(deployDir, filename);
  
  try {
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
    return filepath;
  } catch (error) {
    console.error(`Error saving deployment info: ${error.message}`);
    return null;
  }
}

/**
 * Read input from stdin or command line argument
 */
function getInput() {
  return new Promise((resolve) => {
    const args = process.argv.slice(2);
    
    if (args.length > 0) {
      // Input from command line argument
      resolve(args.join(' '));
    } else if (!process.stdin.isTTY) {
      // Input from piped stdin
      let data = '';
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', chunk => { data += chunk; });
      process.stdin.on('end', () => { resolve(data); });
    } else {
      // Interactive mode
      console.log(`${colors.cyan}Paste the output from 'sui client publish' (press Ctrl+D when done):${colors.reset}\n`);
      let data = '';
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', chunk => { data += chunk; });
      process.stdin.on('end', () => { resolve(data); });
    }
  });
}

/**
 * Main function
 */
async function main() {
  try {
    const input = await getInput();
    
    if (!input.trim()) {
      console.error(`${colors.red}Error: No input provided${colors.reset}`);
      process.exit(1);
    }
    
    console.log(`${colors.cyan}Parsing deployment output...${colors.reset}\n`);
    
    const data = parseDeploymentOutput(input);
    
    // Validate extraction
    let hasErrors = false;
    if (!data.packageId) {
      console.error(`${colors.red}✗ Could not extract packageId${colors.reset}`);
      hasErrors = true;
    } else {
      console.log(`${colors.green}✓ packageId: ${colors.bold}${data.packageId}${colors.reset}`);
    }
    
    if (!data.auctionHouseObjectId) {
      console.error(`${colors.red}✗ Could not extract AuctionHouse objectId${colors.reset}`);
      hasErrors = true;
    } else {
      console.log(`${colors.green}✓ AuctionHouse objectId: ${colors.bold}${data.auctionHouseObjectId}${colors.reset}`);
    }
    
    if (hasErrors) {
      console.error(`\n${colors.red}Failed to extract all required values. Make sure you pasted the complete output from 'sui client publish'.${colors.reset}`);
      process.exit(1);
    }
    
    // Update config file
    console.log(`\n${colors.cyan}Updating config file...${colors.reset}`);
    const configUpdated = updateConfigFile(data);
    if (configUpdated) {
      console.log(`${colors.green}✓ Config file updated: src/config/sui.ts${colors.reset}`);
    } else {
      console.error(`${colors.red}✗ Failed to update config file${colors.reset}`);
      hasErrors = true;
    }
    
    // Save deployment info
    console.log(`${colors.cyan}Saving deployment info...${colors.reset}`);
    const savedPath = saveDeploymentInfo(data);
    if (savedPath) {
      console.log(`${colors.green}✓ Deployment info saved: ${savedPath}${colors.reset}`);
    }
    
    // Final summary
    console.log(`\n${colors.bold}${colors.green}Deployment Information:${colors.reset}`);
    console.log(`  Package ID:          ${data.packageId}`);
    console.log(`  AuctionHouse ID:     ${data.auctionHouseObjectId}`);
    console.log(`  Timestamp:           ${data.timestamp}`);
    console.log(`  Network:             ${data.network}`);
    
    if (!hasErrors) {
      console.log(`\n${colors.green}${colors.bold}✓ All done! Your frontend is ready to use these IDs.${colors.reset}`);
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (error) {
    console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Run the main function
main();
