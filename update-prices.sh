#!/bin/bash
# Update state.json with fresh prices from Coinbase

BTC=$(curl -s "https://api.coinbase.com/v2/prices/BTC-USD/spot" | jq -r '.data.amount')
SOL=$(curl -s "https://api.coinbase.com/v2/prices/SOL-USD/spot" | jq -r '.data.amount')
XRP=$(curl -s "https://api.coinbase.com/v2/prices/XRP-USD/spot" | jq -r '.data.amount')
SUI=$(curl -s "https://api.coinbase.com/v2/prices/SUI-USD/spot" | jq -r '.data.amount')
NOW=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")

cd ~/clawd/jarvis-live

# Update state.json with new prices and timestamp
jq --arg btc "$BTC" --arg sol "$SOL" --arg xrp "$XRP" --arg sui "$SUI" --arg now "$NOW" '
  .lastUpdate = $now |
  .prices.BTC.price = ($btc | tonumber) |
  .prices.SOL.price = ($sol | tonumber) |
  .prices.XRP.price = ($xrp | tonumber) |
  .prices.SUI.price = ($sui | tonumber)
' state.json > state.tmp && mv state.tmp state.json

# Commit and push
git add state.json
git commit -m "Price update: BTC \$$BTC | SOL \$$SOL | XRP \$$XRP" --quiet
git push --quiet

echo "✅ Updated: BTC=$BTC SOL=$SOL XRP=$XRP SUI=$SUI"
