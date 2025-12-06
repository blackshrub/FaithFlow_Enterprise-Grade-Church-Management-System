#!/bin/bash

# Quick Bible Import Script for Production Server
# Run this on your production server (flow.gkbj.org)

set -e  # Exit on error

echo "========================================="
echo "FaithFlow Bible Data Import"
echo "========================================="
echo ""

# Navigate to backend directory
cd /root/FaithFlow_Enterprise-Grade-Church-Management-System/backend

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
    echo "✓ Virtual environment created"
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "Installing Python dependencies..."
pip install --upgrade pip
pip install motor requests python-dotenv

echo "✓ Dependencies installed"
echo ""

# Run the import script
echo "Starting Bible data import..."
echo "This will take 15-30 minutes to import ~31,000 verses"
echo ""

cd scripts
python import_bible_complete.py

echo ""
echo "========================================="
echo "Bible Import Complete!"
echo "========================================="
echo ""
echo "Verify with:"
echo "  curl https://flow.gkbj.org/api/bible/versions"
echo ""

# Deactivate virtual environment
deactivate
