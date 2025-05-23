import { ScraperAgent } from './subagents/scraperAgent';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testScraper() {
    console.log('Starting scraper test...');
    
    // Create scraper instance with reasonable timeouts
    const scraper = new ScraperAgent({
        threadCount: 1,
        timeoutMs: 60000
    });

    try {
        // Initialize browser
        console.log('Initializing browser...');
        await scraper.initBrowser();

        // Set a test account
        const testAccount = 'pierreekhoury'; // Using the same test account from the example
        console.log(`Setting reference account: ${testAccount}`);
        await scraper.setReferenceAccount(testAccount);

        // Execute the scraper
        console.log('Executing scraper...');
        const result = await scraper.execute();
        
        console.log('Scraper execution result:', result);
        
        // Get the scraped items
        const items = await scraper.getItems();
        console.log('Scraped items:', items);

    } catch (error) {
        console.error('Error during test:', error);
    } finally {
        // Clean up
        console.log('Cleaning up...');
        await scraper.stop();
    }
}

// Run the test
testScraper().catch(console.error); 