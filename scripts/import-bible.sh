#!/bin/bash

# Import Bible Data from Local JSON Files
# Run this on your production server (flow.gkbj.org)

set -e  # Exit on error

echo "========================================="
echo "FaithFlow Bible Import from JSON Files"
echo "========================================="
echo ""

# Navigate to backend directory
cd "$(dirname "$0")/backend"

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

# Show .env configuration (masked)
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

# Check if Bible JSON files exist
if [ ! -d "data/bible" ]; then
    echo "ERROR: data/bible directory not found!"
    exit 1
fi

JSON_COUNT=$(find data/bible -name "*.json" -type f | wc -l)
echo "Found $JSON_COUNT Bible JSON file(s) in data/bible/"
echo ""

if [ "$JSON_COUNT" -eq 0 ]; then
    echo "ERROR: No Bible JSON files found in data/bible/"
    exit 1
fi

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
echo "Starting Bible data import from local JSON files..."
echo "This will import Bible data from:"
ls -lh data/bible/*.json | awk '{print "  - " $9 " (" $5 ")"}'
echo ""

cd scripts
python import_bible_from_json.py

echo ""
echo "========================================="
echo "Bible Import Complete!"
echo "========================================="
echo ""
echo "Verify with:"
echo "  curl https://flow.gkbj.org/api/bible/versions"
echo "  curl https://flow.gkbj.org/api/bible/books"
echo "  curl https://flow.gkbj.org/api/bible/TB/Kejadian/1"
echo "  curl https://flow.gkbj.org/api/bible/NIV/Genesis/1"
echo ""

# Deactivate virtual environment
deactivate
