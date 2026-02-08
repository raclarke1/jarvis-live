#!/usr/bin/env node
/**
 * Updates XRP vs BTC performance comparison chart
 * Scheduled to run monthly
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

async function fetchDaily(symbol, limit) {
  return new Promise((resolve, reject) => {
    const url = `https://min-api.cryptocompare.com/data/v2/histoday?fsym=${symbol}&tsym=USD&limit=${limit}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.Response === 'Success') {
            resolve(json.Data.Data);
          } else {
            reject(new Error(json.Message));
          }
        } catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('📊 Updating XRP vs BTC comparison chart...');
  console.log('Fetching 5-year historical data...\n');
  
  const btcData = await fetchDaily('BTC', 1825);
  const xrpData = await fetchDaily('XRP', 1825);
  
  // 5-year calculations
  const btcStart5y = btcData[0].close;
  const btcEnd5y = btcData[btcData.length-1].close;
  const xrpStart5y = xrpData[0].close;
  const xrpEnd5y = xrpData[xrpData.length-1].close;
  
  const btcReturn5y = ((btcEnd5y - btcStart5y) / btcStart5y * 100);
  const xrpReturn5y = ((xrpEnd5y - xrpStart5y) / xrpStart5y * 100);
  
  // 1-year calculations
  const btc1y = btcData.slice(-365);
  const xrp1y = xrpData.slice(-365);
  
  const btcStart1y = btc1y[0].close;
  const btcEnd1y = btc1y[btc1y.length-1].close;
  const xrpStart1y = xrp1y[0].close;
  const xrpEnd1y = xrp1y[xrp1y.length-1].close;
  
  const btcReturn1y = ((btcEnd1y - btcStart1y) / btcStart1y * 100);
  const xrpReturn1y = ((xrpEnd1y - xrpStart1y) / xrpStart1y * 100);
  
  // Date ranges
  const startDate5y = new Date(btcData[0].time * 1000).toLocaleDateString();
  const endDate = new Date(btcData[btcData.length-1].time * 1000).toLocaleDateString();
  const startDate1y = new Date(btc1y[0].time * 1000).toLocaleDateString();
  
  console.log('5-YEAR RETURNS (' + startDate5y + ' → ' + endDate + ')');
  console.log(`  BTC: ${btcReturn5y >= 0 ? '+' : ''}${btcReturn5y.toFixed(1)}%`);
  console.log(`  XRP: ${xrpReturn5y >= 0 ? '+' : ''}${xrpReturn5y.toFixed(1)}%`);
  console.log(`  Outperformance: ${(xrpReturn5y - btcReturn5y).toFixed(1)}%\n`);
  
  console.log('1-YEAR RETURNS (' + startDate1y + ' → ' + endDate + ')');
  console.log(`  BTC: ${btcReturn1y >= 0 ? '+' : ''}${btcReturn1y.toFixed(1)}%`);
  console.log(`  XRP: ${xrpReturn1y >= 0 ? '+' : ''}${xrpReturn1y.toFixed(1)}%`);
  console.log(`  Outperformance: ${(xrpReturn1y - btcReturn1y).toFixed(1)}%\n`);
  
  // Calculate normalized performance
  const normalized = {
    btc: btcData.map(d => ({ 
      date: new Date(d.time * 1000).toISOString().split('T')[0], 
      value: (d.close / btcStart5y) * 100 
    })),
    xrp: xrpData.map(d => ({ 
      date: new Date(d.time * 1000).toISOString().split('T')[0], 
      value: (d.close / xrpStart5y) * 100 
    }))
  };
  
  // Save data
  const outputPath = path.join(__dirname, 'xrp-btc-comparison.json');
  fs.writeFileSync(outputPath, JSON.stringify({
    lastUpdated: new Date().toISOString(),
    normalized,
    summary: {
      period5y: { start: startDate5y, end: endDate },
      period1y: { start: startDate1y, end: endDate },
      btc: { 
        start5y: btcStart5y, end5y: btcEnd5y, return5y: btcReturn5y, 
        start1y: btcStart1y, end1y: btcEnd1y, return1y: btcReturn1y 
      },
      xrp: { 
        start5y: xrpStart5y, end5y: xrpEnd5y, return5y: xrpReturn5y, 
        start1y: xrpStart1y, end1y: xrpEnd1y, return1y: xrpReturn1y 
      }
    }
  }, null, 2));
  
  console.log('✅ Data updated: xrp-btc-comparison.json');
  console.log('📈 Chart: https://raclarke1.github.io/jarvis-live/xrp-btc-chart.html');
}

main().catch(err => {
  console.error('❌ Update failed:', err.message);
  process.exit(1);
});
