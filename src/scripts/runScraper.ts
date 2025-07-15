import { ScraperAgent } from '../subagents/scraperAgent';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  try {
    // Initialize scraper agent
    const scraper = new ScraperAgent({ 
      threadCount: 2,
      timeoutMs: 30000
    });
    
    // Set reference account
    await scraper.setReferenceAccount('openai');
    
    // Execute scraping
    const result = await scraper.execute();
    
    if (result.success && result.data) {
      console.log('Scraping completed successfully');
      console.log(`Processed ${result.data.processedItems} profiles`);
    } else {
      console.error('Scraping failed:', result.error);
    }
  } catch (error) {
    console.error('Error during scraping:', error);
  }
}

main(); 