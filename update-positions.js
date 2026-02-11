#!/usr/bin/env node
/**
 * Update open positions with current prices from Kraken
 * Run periodically to keep dashboard current
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const POSITIONS_FILE = path.join(__dirname, 'open-positions.json');

// Fetch ticker from Kraken
async function getPrice(asset) {
    const pair = asset === 'BTC' ? 'XXBTZUSD' : 
                 asset === 'ETH' ? 'XETHZUSD' :
                 asset === 'XRP' ? 'XXRPZUSD' :
                 `${asset}USD`;
    
    return new Promise((resolve, reject) => {
        https.get(`https://api.kraken.com/0/public/Ticker?pair=${pair}`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.error && json.error.length > 0) {
                        reject(new Error(json.error[0]));
                        return;
                    }
                    const key = Object.keys(json.result)[0];
                    const price = parseFloat(json.result[key].c[0]);
                    resolve(price);
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

// Calculate P&L for a position
function calculatePnl(pos, currentPrice) {
    const entryPrice = pos.entryPrice;
    const size = pos.positionSize;
    const leverage = pos.leverage || 3;
    
    let priceDiff;
    if (pos.direction === 'LONG') {
        priceDiff = currentPrice - entryPrice;
    } else {
        priceDiff = entryPrice - currentPrice;
    }
    
    const pnlPct = (priceDiff / entryPrice) * 100 * leverage;
    const pnlUsd = (size * priceDiff / entryPrice) * leverage;
    
    return { pnlPct, pnlUsd };
}

async function main() {
    // Load current positions
    let positions = [];
    if (fs.existsSync(POSITIONS_FILE)) {
        positions = JSON.parse(fs.readFileSync(POSITIONS_FILE, 'utf8'));
    }
    
    if (positions.length === 0) {
        console.log('No open positions to update');
        return;
    }
    
    console.log(`Updating ${positions.length} positions...`);
    
    // Update each position
    for (const pos of positions) {
        try {
            const currentPrice = await getPrice(pos.asset);
            const { pnlPct, pnlUsd } = calculatePnl(pos, currentPrice);
            
            pos.currentPrice = currentPrice;
            pos.unrealizedPnl = Math.round(pnlUsd * 100) / 100;
            pos.unrealizedPnlPct = Math.round(pnlPct * 100) / 100;
            pos.lastUpdated = Date.now();
            
            console.log(`  ${pos.asset} ${pos.direction}: $${currentPrice} → ${pnlUsd >= 0 ? '+' : ''}$${pnlUsd.toFixed(2)} (${pnlPct.toFixed(2)}%)`);
        } catch (err) {
            console.error(`  Failed to update ${pos.asset}: ${err.message}`);
        }
    }
    
    // Save updated positions
    fs.writeFileSync(POSITIONS_FILE, JSON.stringify(positions, null, 2));
    console.log('Positions updated');
}

main().catch(console.error);
