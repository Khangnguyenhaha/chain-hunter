@echo off
REM Deploy and Configure Sui Auction House (Windows)
REM This script publishes the Move module and automatically updates the frontend config

setlocal enabledelayedexpansion

echo ================================
echo Sui Auction House Deployment
echo ================================
echo.

REM Check if we're in the right directory
if not exist "auction_house\Move.toml" (
    echo Error: auction_house\Move.toml not found
    echo Please run this script from the project root directory
    exit /b 1
)

REM Optional: Set gas budget from argument or use default
set GAS_BUDGET=%1
if "!GAS_BUDGET!"=="" set GAS_BUDGET=100000000

echo Publishing Auction House module...
echo    Gas Budget: !GAS_BUDGET!
echo.

REM Change to auction_house directory
cd auction_house

REM Check if sui client is available
where sui >nul 2>nul
if errorlevel 1 (
    echo Error: 'sui' command not found
    echo Please install Sui CLI: https://docs.sui.io/guides/developer/getting-started/sui-install
    cd ..
    exit /b 1
)

REM Publish and capture output to file
sui client publish --gas-budget !GAS_BUDGET! > deploy-output.txt 2>&1
set PUBLISH_CODE=!errorlevel!

cd ..

if not !PUBLISH_CODE! equ 0 (
    echo Error: Publish failed. See deploy-output.txt for details
    exit /b 1
)

echo Publishing complete!
echo.

echo Parsing deployment output...
echo.

REM Use the parser script
node scripts\parse-sui-deploy.js < auction_house\deploy-output.txt

echo.
echo ================================
echo Deployment Complete!
echo ================================
echo.
echo Next steps:
echo 1. Frontend config (src/config/sui.ts) has been updated
echo 2. Deployment info saved to deployments\
echo 3. Ready to use in your frontend code!
echo.

endlocal
