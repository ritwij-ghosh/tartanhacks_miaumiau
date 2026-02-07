# Apple Wallet Pass Testing Guide

## Overview

Travel Butler generates `.pkpass` files that can be added to Apple Wallet.
In development, we generate **mock passes** without real Apple signing.

## Architecture

A `.pkpass` file is a ZIP archive containing:
- `pass.json` — pass definition (layout, fields, colors)
- `manifest.json` — SHA1 hashes of all files
- `signature` — PKCS7 detached signature (requires Apple certs)
- `icon.png`, `icon@2x.png`, `logo.png` — image assets

## Testing on iOS Simulator

### 1. Generate a Mock Pass

```bash
# Start the backend
cd services/api
uvicorn api.main:app --reload

# Download the pass
curl -X POST http://localhost:8000/wallet/pkpass \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT" \
  -d '{"trip_id": "test-trip"}' \
  --output trip-pass.pkpass
```

### 2. Open in iOS Simulator

```bash
# Boot a simulator (if not already running)
xcrun simctl boot "iPhone 16 Pro"

# Open the .pkpass file
xcrun simctl openurl booted "file://$(pwd)/trip-pass.pkpass"
```

**Note:** Mock passes won't validate signature in Wallet. For real testing:
1. Obtain a Pass Type ID certificate from Apple Developer Portal
2. Generate signing assets (see below)
3. Set env vars: `WALLET_CERT_PATH`, `WALLET_KEY_PATH`, `WALLET_WWDR_PATH`

### 3. Alternative: Safari Download

1. Start the API server
2. Open Safari in Simulator
3. Navigate to a URL that triggers the download
4. The `.pkpass` file will prompt to add to Wallet

## Real Signing Setup

### Prerequisites
- Apple Developer Program membership
- Pass Type ID registered at developer.apple.com

### Steps

1. **Create Pass Type ID:**
   - Go to Certificates, Identifiers & Profiles
   - Register new Pass Type ID: `pass.com.yourcompany.travelbutler`

2. **Generate Certificate:**
   ```bash
   # Generate CSR
   openssl req -new -newkey rsa:2048 -nodes \
     -keyout pass.key -out pass.csr

   # Upload CSR to Apple Developer Portal
   # Download the signed certificate (.cer)

   # Convert to PEM
   openssl x509 -in pass.cer -inform DER -out pass.pem
   ```

3. **Download WWDR Certificate:**
   ```bash
   curl -o wwdr.pem https://www.apple.com/certificateauthority/AppleWWDRCAG4.cer
   openssl x509 -in wwdr.pem -inform DER -out wwdr.pem
   ```

4. **Place certificates:**
   ```
   services/api/certs/
   ├── pass.pem       # Your pass signing certificate
   ├── pass.key       # Private key
   └── wwdr.pem       # Apple WWDR intermediate cert
   ```

5. **Update .env:**
   ```
   WALLET_PASS_TYPE_ID=pass.com.yourcompany.travelbutler
   WALLET_TEAM_ID=YOUR_TEAM_ID
   WALLET_CERT_PATH=certs/pass.pem
   WALLET_KEY_PATH=certs/pass.key
   WALLET_WWDR_PATH=certs/wwdr.pem
   ```

## Pass JSON Structure

Our passes use the `boardingPass` style with transit type `PKTransitTypeAir`:

```json
{
  "formatVersion": 1,
  "passTypeIdentifier": "pass.com.example.travelbutler",
  "serialNumber": "tb-trip001-user123",
  "teamIdentifier": "ABCDEF1234",
  "organizationName": "Travel Butler",
  "description": "Trip Pass",
  "foregroundColor": "rgb(255, 255, 255)",
  "backgroundColor": "rgb(99, 102, 241)",
  "boardingPass": {
    "transitType": "PKTransitTypeAir",
    "headerFields": [...],
    "primaryFields": [...],
    "secondaryFields": [...],
    "auxiliaryFields": [...],
    "backFields": [...]
  }
}
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Pass not valid" in Wallet | Expected for unsigned mock passes. Set up real signing. |
| Simulator won't open .pkpass | Ensure file is valid ZIP: `unzip -t trip-pass.pkpass` |
| Pass shows wrong data | Check `pass.json` in the ZIP: `unzip -p trip-pass.pkpass pass.json` |
| Signing errors | Verify cert chain: `openssl verify -CAfile wwdr.pem pass.pem` |
