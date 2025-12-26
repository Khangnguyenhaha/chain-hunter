#!/bin/bash

# Deploy and Configure Sui Auction House
# This script publishes the Move module and automatically updates the frontend config

set -e  # Exit on error

echo "================================"
echo "Sui Auction House Deployment"
echo "================================"
echo ""

# Check if we're in the right directory
if [ ! -f "auction_house/Move.toml" ]; then
    echo "❌ Error: auction_house/Move.toml not found"
    echo "Please run this script from the project root directory"
    exit 1
fi

# Optional: Set gas budget from argument or use default
GAS_BUDGET="${1:-100000000}"

echo "📦 Publishing Auction House module..."
echo "   Gas Budget: $GAS_BUDGET"
echo ""

# Run the publish command and capture output
cd auction_house

# Check if sui client is available
if ! command -v sui &> /dev/null; then
    echo "❌ Error: 'sui' command not found"
    echo "Please install Sui CLI: https://docs.sui.io/guides/developer/getting-started/sui-install"
    exit 1
fi

# Publish and capture output
DEPLOY_OUTPUT=$(sui client publish --gas-budget "$GAS_BUDGET" 2>&1)

cd ..

echo "Publishing complete!"
echo ""

# Parse the output
echo "🔍 Parsing deployment output..."
echo ""

# Use the parser script
echo "$DEPLOY_OUTPUT" | node scripts/parse-sui-deploy.js

echo ""
echo "================================"
echo "✅ Deployment Complete!"
echo "================================"
echo ""
echo "Next steps:"
echo "1. ✅ Frontend config (src/config/sui.ts) has been updated"
echo "2. ✅ Deployment info saved to deployments/"
echo "3. 🚀 Ready to use in your frontend code!"
echo ""
