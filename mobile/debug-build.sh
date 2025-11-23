#!/bin/bash

# FaithFlow Mobile Debug Build Script
# This script performs comprehensive cleanup and debugging for Reanimated Babel plugin errors

set -e  # Exit on error

echo "🔍 FaithFlow Mobile - Build Debugging Script"
echo "============================================="
echo ""

# Step 1: Check current directory
echo "📁 Step 1: Verifying directory..."
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this from the mobile directory."
    exit 1
fi
echo "✅ Correct directory confirmed"
echo ""

# Step 2: Show versions
echo "📦 Step 2: Current versions..."
node --version
yarn --version
echo ""

# Step 3: Nuclear cleanup
echo "🧹 Step 3: Nuclear cleanup (removing all caches)..."
rm -rf node_modules
rm -rf .expo
rm -rf .expo-shared
rm -rf $HOME/.expo
rm -rf $TMPDIR/react-*
rm -rf $TMPDIR/metro-*
rm -rf $TMPDIR/haste-*
yarn cache clean
echo "✅ All caches cleared"
echo ""

# Step 4: Reinstall dependencies
echo "📥 Step 4: Reinstalling dependencies..."
yarn install
echo "✅ Dependencies installed"
echo ""

# Step 5: Verify Reanimated installation
echo "🔍 Step 5: Verifying react-native-reanimated installation..."
REANIMATED_VERSION=$(node -p "require('./node_modules/react-native-reanimated/package.json').version")
echo "   Installed version: $REANIMATED_VERSION"
echo ""

# Step 6: Check babel config
echo "📝 Step 6: Current babel.config.js:"
cat babel.config.js
echo ""

# Step 7: Verify babel plugin
echo "🔍 Step 7: Checking Reanimated Babel plugin..."
if [ -f "node_modules/react-native-reanimated/plugin.js" ]; then
    echo "✅ Reanimated Babel plugin found"
else
    echo "❌ Reanimated Babel plugin NOT found"
    exit 1
fi
echo ""

# Step 8: Try to start with cleared cache
echo "🚀 Step 8: Starting Expo with cleared cache..."
echo "   Command: npx expo start --clear"
echo ""
echo "If you still see errors, try these alternatives:"
echo "   1. npx expo start --clear --dev-client"
echo "   2. npx expo start --tunnel --clear"
echo "   3. Check for TypeScript errors: yarn type-check"
echo ""
echo "Press Ctrl+C to cancel, or Enter to continue..."
read

npx expo start --clear
