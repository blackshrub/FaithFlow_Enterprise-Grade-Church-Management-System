# Install Dependencies for Bible Import

## Error
```
ModuleNotFoundError: No module named 'motor'
```

## Solution

Install the required Python dependencies on your production server:

```bash
# Navigate to backend directory
cd /root/FaithFlow_Enterprise-Grade-Church-Management-System/backend

# Install dependencies from requirements.txt
pip3 install -r requirements.txt

# OR install just the required packages:
pip3 install motor requests python-dotenv
```

## Verify Installation

```bash
python3 -c "import motor; print('motor installed')"
python3 -c "import requests; print('requests installed')"
python3 -c "from dotenv import load_dotenv; print('python-dotenv installed')"
```

## Then Run Import Again

```bash
cd scripts
python3 import_bible_complete.py
```

## Alternative: Use Python Virtual Environment (Recommended)

```bash
# Create virtual environment
cd /root/FaithFlow_Enterprise-Grade-Church-Management-System/backend
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run import script
cd scripts
python import_bible_complete.py

# Deactivate when done
deactivate
```
