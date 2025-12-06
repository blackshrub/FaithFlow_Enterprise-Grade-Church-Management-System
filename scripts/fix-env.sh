#!/bin/bash

# Fix .env and Import Bible Data
# Run this on your production server

set -e  # Exit on error

echo "========================================="
echo "FaithFlow Bible Import - Setup & Import"
echo "========================================="
echo ""

cd /root/FaithFlow_Enterprise-Grade-Church-Management-System/backend

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "ERROR: .env file not found!"
    echo ""
    echo "Please create backend/.env with:"
    echo ""
    echo "MONGO_URL=mongodb://localhost:27017"
    echo "DB_NAME=church_management"
    echo "JWT_SECRET=your-secret-key-here"
    echo "JWT_ALGORITHM=HS256"
    echo ""
    echo "Then run this script again."
    exit 1
fi

# Show .env contents (masked)
echo "Current .env configuration:"
echo "----------------------------"
if grep -q "MONGO_URL" .env; then
    echo "✓ MONGO_URL is set"
else
    echo "✗ MONGO_URL is missing!"
    echo ""
    echo "Add this to backend/.env:"
    echo "MONGO_URL=mongodb://localhost:27017"
    exit 1
fi

if grep -q "DB_NAME" .env; then
    DB_NAME=$(grep "DB_NAME" .env | cut -d'=' -f2)
    echo "✓ DB_NAME = $DB_NAME"
else
    echo "✗ DB_NAME is missing!"
    echo ""
    echo "Add this to backend/.env:"
    echo "DB_NAME=church_management"
    exit 1
fi

echo ""

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
pip install --upgrade pip -q
pip install motor requests python-dotenv -q

echo "✓ Dependencies installed"
echo ""

# Run the import script
echo "Starting Bible data import..."
echo "This will take 15-30 minutes to import ~31,000 verses"
echo ""
echo "Importing from: https://graphql-alkitabapi.herokuapp.com"
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
echo "  curl https://flow.gkbj.org/api/bible/books"
echo ""

# Deactivate virtual environment
deactivate
