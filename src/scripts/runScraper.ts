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

    // Get user input for reference account
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

  } catch (error) {
    console.error('Error running scraper:', error);
  } finally {
    process.exit(0);
  }
}

// Run the script
main().catch(console.error); 