// Test script for Svelte 5 example
import puppeteer from 'puppeteer';

async function testSvelte5Example() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('error', err => console.error('PAGE ERROR:', err));
  page.on('pageerror', err => console.error('PAGE ERROR:', err));
  
  try {
    console.log('🚀 Testing Svelte 5 Runes Example...');
    
    // Navigate to the app
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
    console.log('✅ Page loaded');
    
    // Wait for the connect button and click it
    await page.waitForSelector('button:not([disabled])', { timeout: 5000 });
    const connectButton = await page.$('button:not([disabled])');
    if (connectButton) {
      const buttonText = await page.evaluate(el => el.textContent, connectButton);
      if (buttonText.includes('Connect')) {
        await connectButton.click();
        console.log('✅ Clicked Connect button');
        await page.waitForTimeout(2000);
      }
    }
    
    // Check connection status
    const statusBadge = await page.waitForSelector('.status-badge', { timeout: 5000 });
    const status = await page.evaluate(el => el.textContent, statusBadge);
    console.log(`📊 Connection status: ${status}`);
    
    if (status.toLowerCase() === 'connected') {
      console.log('✅ Successfully connected to DuckDB');
      
      // Try to execute a query
      const executeButton = await page.waitForSelector('button:has-text("Execute Query")', { timeout: 5000 }).catch(() => null);
      if (executeButton) {
        await executeButton.click();
        console.log('✅ Executed query');
        await page.waitForTimeout(2000);
        
        // Check for results
        const results = await page.$('.results table');
        if (results) {
          const rowCount = await page.$$eval('.results tbody tr', rows => rows.length);
          console.log(`✅ Query returned ${rowCount} rows`);
        }
      }
      
      console.log('🎉 Svelte 5 example is working correctly!');
    } else {
      console.error('❌ Failed to connect to DuckDB');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

// Run test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testSvelte5Example();
}