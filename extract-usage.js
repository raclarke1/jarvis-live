#!/usr/bin/env node
/**
 * Extract API usage data from OpenClaw session logs
 * Outputs JSON for the usage dashboard
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const SESSIONS_DIR = path.join(process.env.HOME, '.openclaw/agents/jarvis/sessions');

async function parseSessionFile(filePath) {
  const usage = [];
  
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath),
    crlfDelay: Infinity
  });
  
  for await (const line of rl) {
    try {
      const entry = JSON.parse(line);
      if (entry.type === 'message' && entry.message?.usage) {
        const u = entry.message.usage;
        const cost = u.cost || {};
        usage.push({
          timestamp: entry.timestamp,
          model: entry.message.model || 'unknown',
          provider: entry.message.provider || 'unknown',
          input: u.input || 0,
          output: u.output || 0,
          cacheRead: u.cacheRead || 0,
          cacheWrite: u.cacheWrite || 0,
          totalTokens: u.totalTokens || 0,
          cost: cost.total || 0
        });
      }
    } catch (e) {
      // Skip malformed lines
    }
  }
  
  return usage;
}

async function main() {
  const files = fs.readdirSync(SESSIONS_DIR)
    .filter(f => f.endsWith('.jsonl') && !f.includes('.lock'))
    .map(f => path.join(SESSIONS_DIR, f));
  
  let allUsage = [];
  
  for (const file of files) {
    const usage = await parseSessionFile(file);
    allUsage = allUsage.concat(usage);
  }
  
  // Sort by timestamp
  allUsage.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  
  // Aggregate by day
  const byDay = {};
  for (const u of allUsage) {
    const day = u.timestamp.split('T')[0];
    if (!byDay[day]) {
      byDay[day] = {
        date: day,
        requests: 0,
        inputTokens: 0,
        outputTokens: 0,
        cacheRead: 0,
        cacheWrite: 0,
        totalTokens: 0,
        totalCost: 0,
        models: {}
      };
    }
    byDay[day].requests++;
    byDay[day].inputTokens += u.input;
    byDay[day].outputTokens += u.output;
    byDay[day].cacheRead += u.cacheRead;
    byDay[day].cacheWrite += u.cacheWrite;
    byDay[day].totalTokens += u.totalTokens;
    byDay[day].totalCost += u.cost;
    
    // Track by model
    const model = u.model;
    if (!byDay[day].models[model]) {
      byDay[day].models[model] = { requests: 0, tokens: 0, cost: 0 };
    }
    byDay[day].models[model].requests++;
    byDay[day].models[model].tokens += u.totalTokens;
    byDay[day].models[model].cost += u.cost;
  }
  
  // Convert to array and calculate totals
  const dailyData = Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));
  
  const totals = {
    requests: dailyData.reduce((s, d) => s + d.requests, 0),
    inputTokens: dailyData.reduce((s, d) => s + d.inputTokens, 0),
    outputTokens: dailyData.reduce((s, d) => s + d.outputTokens, 0),
    cacheRead: dailyData.reduce((s, d) => s + d.cacheRead, 0),
    totalTokens: dailyData.reduce((s, d) => s + d.totalTokens, 0),
    totalCost: dailyData.reduce((s, d) => s + d.totalCost, 0)
  };
  
  const result = {
    generatedAt: new Date().toISOString(),
    totals,
    daily: dailyData.slice(-30), // Last 30 days
    recentRequests: allUsage.slice(-100) // Last 100 requests for detail
  };
  
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
