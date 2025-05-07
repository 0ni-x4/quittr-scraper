import { ScraperAgent } from '../subagents/scraperAgent';
import * as dotenv from 'dotenv';
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();

async function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  try {
    // Create the scraper agent
    const scraper = new ScraperAgent({
      threadCount: 1,
      maxRetries: 3,
      timeoutMs: 60000
    });

    // Get user input for scraping method
    console.log('\nChoose scraping method:');
    console.log('1. Search by hashtag');
    console.log('2. Search by reference account');
    const choice = await askQuestion('Enter your choice (1 or 2): ');

    if (choice === '1') {
      // Hashtag search
      const targetNiche = await askQuestion('What type of accounts are you looking for? (e.g., fitness, art, food): ');
      await askQuestion('How many profiles to scrape per hashtag? (default 5): ');
      console.log(`\nStarting hashtag search for ${targetNiche} accounts...`);
      // TODO: Implement hashtag search
      console.log('Hashtag search not implemented yet');
      
    } else if (choice === '2') {
      // Reference account search
      const referenceAccount = await askQuestion('Enter a reference account username to start from: ');
      console.log(`\nStarting scraper with reference account: ${referenceAccount}`);

      // Set the reference account
      await scraper.setReferenceAccount(referenceAccount);

      // Execute the scraper
      console.log('\nStarting scraping process...');
      const result = await scraper.execute();

      if (result.success) {
        console.log('\nScraping completed successfully!');
        console.log(`Processed ${result.data.processedItems} profiles`);
        
        // Create results directory if it doesn't exist
        const resultsDir = path.join(process.cwd(), 'results');
        if (!fs.existsSync(resultsDir)) {
          fs.mkdirSync(resultsDir);
        }

        // Save results to a file
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const resultsPath = path.join(resultsDir, `scraped-profiles-${timestamp}.json`);
        fs.writeFileSync(resultsPath, JSON.stringify(result.data, null, 2));
        console.log(`\nResults saved to: ${resultsPath}`);
      } else {
        console.error('\nScraping failed:', result.error);
      }
    } else {
      console.log('Invalid choice. Please run the script again and choose 1 or 2.');
    }

  } catch (error) {
    console.error('Error running scraper:', error);
  } finally {
    process.exit(0);
  }
}

// Run the script
main().catch(console.error); 