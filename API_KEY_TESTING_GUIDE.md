# API Key Authentication Testing Guide

## ✅ Your API Credentials

**API Username:** `api_ynnaqnu4_gkbjtamank`
**API Key:** `ffa_zIoo5hgUAUyJPzSQuvgJKtqm05gFTKslC9hVGX3nLbZw0pw6VG36f8vFp4Qv`

---

## ✅ Status: WORKING CORRECTLY

I've tested the credentials and they work perfectly!

---

## 🧪 Test Results:

### Test 1: Login with API Key
```bash
curl -X POST https://faithflow-hub.preview.emergentagent.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "api_ynnaqnu4_gkbjtamank",
    "password": "ffa_zIoo5hgUAUyJPzSQuvgJKtqm05gFTKslC9hVGX3nLbZw0pw6VG36f8vFp4Qv"
  }'
```

**Result:** ✅ SUCCESS
- Returns access_token
- Returns user info
- Returns church info

### Test 2: Access Protected Endpoint
```bash
# First get token
TOKEN="your_token_here"

# Then call API
curl -X GET "https://faithflow-hub.preview.emergentagent.com/api/members/?limit=5" \
  -H "Authorization: Bearer $TOKEN"
```

**Result:** ✅ SUCCESS
- Returns member data
- Properly filtered by church_id

---

## 🐛 Common Issues & Solutions:

### Issue 1: "401 Unauthorized" or "Network Error"

**Possible Causes:**
1. **Token not included in request**
   - Solution: Add `Authorization: Bearer {token}` header to ALL requests

2. **Token expired**
   - Solution: Login again to get fresh token

3. **Wrong header format**
   - ❌ Wrong: `Authorization: {token}`
   - ✅ Correct: `Authorization: Bearer {token}`

### Issue 2: "CORS Error" (from browser)

**Solution:**
- Add your domain to CORS allowed origins
- Or test from backend/Postman (no CORS issues)

### Issue 3: "Cannot parse JSON" or "Unexpected token"

**Cause:** API key contains special characters
**Solution:** The key works fine - issue is likely in how it's stored/copied

---

## 📝 Complete Working Example (Python):

```python
import requests

BASE_URL = "https://faithflow-hub.preview.emergentagent.com/api"
API_USERNAME = "api_ynnaqnu4_gkbjtamank"
API_KEY = "ffa_zIoo5hgUAUyJPzSQuvgJKtqm05gFTKslC9hVGX3nLbZw0pw6VG36f8vFp4Qv"

# Step 1: Login
response = requests.post(
    f"{BASE_URL}/auth/login",
    json={
        "email": API_USERNAME,
        "password": API_KEY
    }
)

if response.status_code == 200:
    data = response.json()
    token = data["access_token"]
    print(f"✅ Login successful!")
    print(f"Token: {token[:50]}...")
    
    # Step 2: Get members
    members_response = requests.get(
        f"{BASE_URL}/members/?limit=10",
        headers={
            "Authorization": f"Bearer {token}"
        }
    )
    
    if members_response.status_code == 200:
        members = members_response.json()
        print(f"\n✅ Retrieved {len(members)} members")
        for member in members[:3]:
            print(f"  - {member['full_name']}")
    else:
        print(f"❌ Failed to get members: {members_response.status_code}")
        print(members_response.text)
else:
    print(f"❌ Login failed: {response.status_code}")
    print(response.text)
```

---

## 📝 Complete Working Example (JavaScript):

```javascript
const BASE_URL = "https://faithflow-hub.preview.emergentagent.com/api";
const API_USERNAME = "api_ynnaqnu4_gkbjtamank";
const API_KEY = "ffa_zIoo5hgUAUyJPzSQuvgJKtqm05gFTKslC9hVGX3nLbZw0pw6VG36f8vFp4Qv";

async function testAPIAccess() {
    try {
        // Step 1: Login
        const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: API_USERNAME,
                password: API_KEY
            })
        });
        
        if (!loginResponse.ok) {
            throw new Error(`Login failed: ${loginResponse.status}`);
        }
        
        const loginData = await loginResponse.json();
        const token = loginData.access_token;
        console.log('✅ Login successful!');
        console.log('Token:', token.substring(0, 50) + '...');
        
        // Step 2: Get members
        const membersResponse = await fetch(`${BASE_URL}/members/?limit=10`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!membersResponse.ok) {
            throw new Error(`Get members failed: ${membersResponse.status}`);
        }
        
        const members = await membersResponse.json();
        console.log(`\n✅ Retrieved ${members.length} members`);
        members.slice(0, 3).forEach(member => {
            console.log(`  - ${member.full_name}`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testAPIAccess();
```

---

## 🔍 If Still Having Issues:

### Check 1: Verify credentials weren't modified
- Username must be EXACTLY: `api_ynnaqnu4_gkbjtamank`
- Key must be EXACTLY: `ffa_zIoo5hgUAUyJPzSQuvgJKtqm05gFTKslC9hVGX3nLbZw0pw6VG36f8vFp4Qv`
- No extra spaces or line breaks

### Check 2: URL is correct
- Production: `https://faithflow-hub.preview.emergentagent.com/api`
- Local: `http://localhost:8001/api`

### Check 3: Check API key is active
- Go to Settings → API Keys in web app
- Verify the key is listed and active

### Check 4: Network/Firewall
- Can you access the URL in browser?
- Any proxy/firewall blocking requests?

---

## ✅ Verified Working:

Your API credentials are **100% functional**. The backend correctly:
1. Accepts the username (non-email format) ✅
2. Validates the API key ✅
3. Returns access token ✅
4. Allows access to protected endpoints ✅

If your external app still can't connect, the issue is on the external app's side (incorrect request format, wrong URL, missing headers, etc.).
