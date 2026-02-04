#!/usr/bin/env node
/**
 * Multi-Year Breakout Scanner
 * Scans for 3-5 year highs/lows across major asset classes
 * 
 * Categories:
 * - Major Currencies (vs USD)
 * - Dollar Indices
 * - Emerging Markets
 * - Energy
 * - Natural Resources / Commodities
 * - Major ETFs
 */

const https = require('https');
const fs = require('fs');

// Asset list by category
const ASSETS = {
  "Currencies": [
    { symbol: "EURUSD=X", name: "EUR/USD", yahoo: "EURUSD=X" },
    { symbol: "GBPUSD=X", name: "GBP/USD", yahoo: "GBPUSD=X" },
    { symbol: "USDJPY=X", name: "USD/JPY", yahoo: "USDJPY=X", inverse: true },
    { symbol: "USDCHF=X", name: "USD/CHF", yahoo: "USDCHF=X", inverse: true },
    { symbol: "AUDUSD=X", name: "AUD/USD", yahoo: "AUDUSD=X" },
    { symbol: "NZDUSD=X", name: "NZD/USD", yahoo: "NZDUSD=X" },
    { symbol: "USDCAD=X", name: "USD/CAD", yahoo: "USDCAD=X", inverse: true },
    { symbol: "USDMXN=X", name: "USD/MXN", yahoo: "USDMXN=X", inverse: true },
    { symbol: "USDBRL=X", name: "USD/BRL", yahoo: "USDBRL=X", inverse: true },
    { symbol: "USDZAR=X", name: "USD/ZAR", yahoo: "USDZAR=X", inverse: true },
  ],
  "Dollar Indices": [
    { symbol: "DX-Y.NYB", name: "DXY (Dollar Index)", yahoo: "DX-Y.NYB" },
    { symbol: "UUP", name: "UUP (Invesco DB USD)", yahoo: "UUP" },
    { symbol: "USDU", name: "USDU (WisdomTree Strong $)", yahoo: "USDU" },
  ],
  "Emerging Markets": [
    { symbol: "EEM", name: "EEM (iShares EM)", yahoo: "EEM" },
    { symbol: "VWO", name: "VWO (Vanguard EM)", yahoo: "VWO" },
    { symbol: "IEMG", name: "IEMG (Core EM)", yahoo: "IEMG" },
    { symbol: "FXI", name: "FXI (China Large-Cap)", yahoo: "FXI" },
    { symbol: "EWZ", name: "EWZ (Brazil)", yahoo: "EWZ" },
    { symbol: "EWW", name: "EWW (Mexico)", yahoo: "EWW" },
    { symbol: "INDA", name: "INDA (India)", yahoo: "INDA" },
    { symbol: "EWT", name: "EWT (Taiwan)", yahoo: "EWT" },
    { symbol: "EWY", name: "EWY (South Korea)", yahoo: "EWY" },
  ],
  "Energy": [
    { symbol: "XLE", name: "XLE (Energy Select)", yahoo: "XLE" },
    { symbol: "XOP", name: "XOP (Oil & Gas E&P)", yahoo: "XOP" },
    { symbol: "OIH", name: "OIH (Oil Services)", yahoo: "OIH" },
    { symbol: "USO", name: "USO (US Oil Fund)", yahoo: "USO" },
    { symbol: "UNG", name: "UNG (US Nat Gas)", yahoo: "UNG" },
    { symbol: "CL=F", name: "Crude Oil Futures", yahoo: "CL=F" },
    { symbol: "NG=F", name: "Natural Gas Futures", yahoo: "NG=F" },
  ],
  "Natural Resources": [
    { symbol: "GDX", name: "GDX (Gold Miners)", yahoo: "GDX" },
    { symbol: "GDXJ", name: "GDXJ (Jr Gold Miners)", yahoo: "GDXJ" },
    { symbol: "SLV", name: "SLV (Silver)", yahoo: "SLV" },
    { symbol: "GLD", name: "GLD (Gold)", yahoo: "GLD" },
    { symbol: "COPX", name: "COPX (Copper Miners)", yahoo: "COPX" },
    { symbol: "LIT", name: "LIT (Lithium & Battery)", yahoo: "LIT" },
    { symbol: "URA", name: "URA (Uranium)", yahoo: "URA" },
    { symbol: "REMX", name: "REMX (Rare Earth)", yahoo: "REMX" },
    { symbol: "WOOD", name: "WOOD (Timber)", yahoo: "WOOD" },
    { symbol: "MOO", name: "MOO (Agribusiness)", yahoo: "MOO" },
  ],
  "Major ETFs": [
    { symbol: "SPY", name: "SPY (S&P 500)", yahoo: "SPY" },
    { symbol: "QQQ", name: "QQQ (Nasdaq 100)", yahoo: "QQQ" },
    { symbol: "IWM", name: "IWM (Russell 2000)", yahoo: "IWM" },
    { symbol: "DIA", name: "DIA (Dow Jones)", yahoo: "DIA" },
    { symbol: "TLT", name: "TLT (20+ Yr Treasury)", yahoo: "TLT" },
    { symbol: "HYG", name: "HYG (High Yield Corp)", yahoo: "HYG" },
    { symbol: "XLF", name: "XLF (Financials)", yahoo: "XLF" },
    { symbol: "XLK", name: "XLK (Technology)", yahoo: "XLK" },
    { symbol: "XLV", name: "XLV (Healthcare)", yahoo: "XLV" },
    { symbol: "XLI", name: "XLI (Industrials)", yahoo: "XLI" },
    { symbol: "XLU", name: "XLU (Utilities)", yahoo: "XLU" },
    { symbol: "XLRE", name: "XLRE (Real Estate)", yahoo: "XLRE" },
  ],
};

// Fetch historical data from Yahoo Finance
async function fetchYahooData(symbol, years = 5) {
  return new Promise((resolve, reject) => {
    const now = Math.floor(Date.now() / 1000);
    const period1 = now - (years * 365 * 24 * 60 * 60);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${period1}&period2=${now}&interval=1wk`;
    
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    };

    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.chart?.result?.[0]) {
            resolve(json.chart.result[0]);
          } else {
            reject(new Error(`No data for ${symbol}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// Calculate multi-year highs/lows
function analyzeAsset(data, yearsBack) {
  const quotes = data.indicators?.quote?.[0];
  const timestamps = data.timestamp;
  
  if (!quotes || !timestamps || !quotes.high || !quotes.low) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const cutoff3y = now - (3 * 365 * 24 * 60 * 60);
  const cutoff5y = now - (5 * 365 * 24 * 60 * 60);

  let high3y = -Infinity, low3y = Infinity;
  let high5y = -Infinity, low5y = Infinity;
  let currentPrice = null;

  for (let i = 0; i < timestamps.length; i++) {
    const t = timestamps[i];
    const h = quotes.high[i];
    const l = quotes.low[i];
    const c = quotes.close[i];

    if (h == null || l == null) continue;

    // Get latest close as current price
    if (c != null) currentPrice = c;

    // 5-year range
    if (t >= cutoff5y) {
      if (h > high5y) high5y = h;
      if (l < low5y) low5y = l;
    }

    // 3-year range
    if (t >= cutoff3y) {
      if (h > high3y) high3y = h;
      if (l < low3y) low3y = l;
    }
  }

  if (!currentPrice || high5y === -Infinity) return null;

  // Calculate distance from extremes
  const pctFrom3yHigh = ((currentPrice - high3y) / high3y) * 100;
  const pctFrom3yLow = ((currentPrice - low3y) / low3y) * 100;
  const pctFrom5yHigh = ((currentPrice - high5y) / high5y) * 100;
  const pctFrom5yLow = ((currentPrice - low5y) / low5y) * 100;

  // Determine signal
  let signal = 'NEUTRAL';
  let signalStrength = 0;
  
  if (pctFrom5yHigh >= -2) {
    signal = 'BREAKOUT';
    signalStrength = pctFrom5yHigh >= 0 ? 3 : 2; // At or above = stronger
  } else if (pctFrom3yHigh >= -2) {
    signal = 'BREAKOUT';
    signalStrength = 1;
  } else if (pctFrom5yLow <= 2) {
    signal = 'BREAKDOWN';
    signalStrength = pctFrom5yLow <= 0 ? 3 : 2;
  } else if (pctFrom3yLow <= 2) {
    signal = 'BREAKDOWN';
    signalStrength = 1;
  }

  return {
    currentPrice: currentPrice.toFixed(currentPrice < 10 ? 4 : 2),
    high3y: high3y.toFixed(high3y < 10 ? 4 : 2),
    low3y: low3y.toFixed(low3y < 10 ? 4 : 2),
    high5y: high5y.toFixed(high5y < 10 ? 4 : 2),
    low5y: low5y.toFixed(low5y < 10 ? 4 : 2),
    pctFrom3yHigh: pctFrom3yHigh.toFixed(1),
    pctFrom3yLow: pctFrom3yLow.toFixed(1),
    pctFrom5yHigh: pctFrom5yHigh.toFixed(1),
    pctFrom5yLow: pctFrom5yLow.toFixed(1),
    signal,
    signalStrength,
  };
}

// Main scanner
async function runScanner() {
  console.log('🔍 Running Multi-Year Breakout Scanner...\n');
  
  const results = {
    lastUpdate: new Date().toISOString(),
    breakouts: [],
    breakdowns: [],
    allAssets: {},
  };

  for (const [category, assets] of Object.entries(ASSETS)) {
    console.log(`\n📊 Scanning ${category}...`);
    results.allAssets[category] = [];

    for (const asset of assets) {
      try {
        process.stdout.write(`  ${asset.name}... `);
        const data = await fetchYahooData(asset.yahoo, 5);
        const analysis = analyzeAsset(data);
        
        if (analysis) {
          const entry = {
            symbol: asset.symbol,
            name: asset.name,
            category,
            ...analysis,
          };
          
          results.allAssets[category].push(entry);
          
          if (analysis.signal === 'BREAKOUT') {
            results.breakouts.push(entry);
            console.log(`✅ BREAKOUT (${analysis.pctFrom5yHigh}% from 5y high)`);
          } else if (analysis.signal === 'BREAKDOWN') {
            results.breakdowns.push(entry);
            console.log(`🔻 BREAKDOWN (${analysis.pctFrom5yLow}% from 5y low)`);
          } else {
            console.log(`○ neutral`);
          }
        } else {
          console.log('⚠️ No data');
        }

        // Rate limit
        await new Promise(r => setTimeout(r, 200));
      } catch (err) {
        console.log(`❌ Error: ${err.message}`);
      }
    }
  }

  // Sort by signal strength
  results.breakouts.sort((a, b) => b.signalStrength - a.signalStrength);
  results.breakdowns.sort((a, b) => b.signalStrength - a.signalStrength);

  // Write results
  const outputPath = __dirname + '/breakout-data.json';
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n✅ Results saved to ${outputPath}`);
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📈 BREAKOUTS (at/near 3-5 year highs):');
  results.breakouts.forEach(b => {
    console.log(`  • ${b.name}: ${b.currentPrice} (${b.pctFrom5yHigh}% from 5y high)`);
  });
  
  console.log('\n📉 BREAKDOWNS (at/near 3-5 year lows):');
  results.breakdowns.forEach(b => {
    console.log(`  • ${b.name}: ${b.currentPrice} (${b.pctFrom5yLow}% from 5y low)`);
  });

  return results;
}

// Run if called directly
if (require.main === module) {
  runScanner().catch(console.error);
}

module.exports = { runScanner, ASSETS };
