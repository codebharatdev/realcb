#!/usr/bin/env node

/**
 * System Reset Script for CodeBharat.dev
 * 
 * This script resets the entire system for fresh testing.
 * It clears all user data, apps, credits, and history.
 * 
 * Usage: node scripts/reset-system.js
 */

import https from 'https';
import http from 'http';

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN_KEY = process.env.ADMIN_RESET_KEY || 'reset-all-data-2024';

function makeRequest(url, options, data) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http;
    
    const req = protocol.request(url, options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve({
            statusCode: res.statusCode,
            data: parsedData
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            data: responseData
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function resetSystem() {
  console.log('🔄 Starting complete system reset...\n');
  
  try {
    // Make the reset request
    const response = await makeRequest(
      `${BASE_URL}/api/admin/reset-system`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      },
      {
        adminKey: ADMIN_KEY
      }
    );
    
    if (response.statusCode === 200 && response.data.success) {
      console.log('✅ System reset successful!');
      console.log('\n📊 Reset Summary:');
      console.log('================');
      
      const summary = response.data.resetSummary;
      console.log(`👥 Users reset: ${summary.userTokens}`);
      console.log(`📱 Apps deleted: ${summary.savedApps}`);
      console.log(`💰 Credit history cleared: ${summary.creditConsumptionHistory}`);
      console.log(`💳 Transactions deleted: ${summary.tokenTransactions}`);
      console.log(`📁 Sandbox files cleared: ${summary.sandboxFiles}`);
      console.log(`📄 Total documents processed: ${summary.totalDocuments}`);
      console.log(`⏰ Timestamp: ${summary.timestamp}`);
      console.log(`📝 Status: ${summary.status}`);
      
      console.log('\n🎯 System is now ready for fresh testing!');
      console.log('💡 All users have been reset to 1000 credits.');
      console.log('🚀 You can now test end-to-end scenarios.');
      
    } else {
      console.error('❌ Reset failed:');
      console.error('Status:', response.statusCode);
      console.error('Error:', response.data.error || response.data);
    }
    
  } catch (error) {
    console.error('❌ Error during reset:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('1. Make sure your development server is running');
    console.log('2. Check if BASE_URL is correct (currently:', BASE_URL, ')');
    console.log('3. Verify ADMIN_RESET_KEY environment variable');
  }
}

// Run the reset
resetSystem();
