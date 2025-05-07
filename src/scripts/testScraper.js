const { ScraperAgent } = require('../subagents/scraperAgent');
require('dotenv').config();

async function main() {
  try {
    console.log('Initializing scraper agent...');
    const scraper = new ScraperAgent({
      threadCount: 1,
      maxRetries: 3,
      timeoutMs: 60000
    });

    // Test with a reference account
    const testAccount = 'instagram'; // Using Instagram's official account as a test
    console.log(`Testing with reference account: ${testAccount}`);
    
    await scraper.setReferenceAccount(testAccount);
    const result = await scraper.execute();

    if (result.success) {
      console.log('Scraping completed successfully!');
      console.log(`Processed ${result.data.processedItems} profiles`);
      console.log('Errors:', result.data.errors);
    } else {
      console.error('Scraping failed:', result.error);
    }

  } catch (error) {
    console.error('Error running test:', error);
  } finally {
    process.exit(0);
  }
}

// Run the test
main().catch(console.error); 