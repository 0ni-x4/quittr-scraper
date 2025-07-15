import { ScraperAgent } from '../subagents/scraperAgent';
import { DMAgent } from '../agents/dmAgent';
import * as dotenv from 'dotenv';
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  if (err && err.stack) {
    console.error('Stack trace:', err.stack);
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  if (reason && (reason as any).stack) {
    console.error('Stack trace:', (reason as any).stack);
  }
  process.exit(1);
});

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

async function runScraperTest() {
  console.log('\n=== Running Scraper Test ===');
  const scraper = new ScraperAgent({
    threadCount: 1,
    timeoutMs: 60000
  });

  const referenceAccount = await askQuestion('Enter a reference account username to start from: ');
  console.log(`\nStarting scraper with reference account: ${referenceAccount}`);

  await scraper.setReferenceAccount(referenceAccount);
  const result = await scraper.execute();

  if (result.success && result.data) {
    console.log('\nScraping completed successfully!');
    console.log(`Processed ${result.data.processedItems} profiles`);
    
    const resultsDir = path.join(process.cwd(), 'results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultsPath = path.join(resultsDir, `scraped-profiles-${timestamp}.json`);
    fs.writeFileSync(resultsPath, JSON.stringify(result.data, null, 2));
    console.log(`\nResults saved to: ${resultsPath}`);
    return result.data;
  } else {
    console.error('\nScraping failed:', result.error);
    return null;
  }
}

async function runDmTest(scrapedProfiles: any) {
  console.log('\n=== Running DM Test ===');
  
  const config = {
    accounts: [
      {
        username: process.env.INSTAGRAM_USERNAME_1 || '',
        password: process.env.INSTAGRAM_PASSWORD_1 || ''
      },
      {
        username: process.env.INSTAGRAM_USERNAME_2 || '',
        password: process.env.INSTAGRAM_PASSWORD_2 || ''
      }
    ],
    messageTemplate: `Hi {username}! 👋

I noticed your amazing content and {followers} engaged followers. I'd love to discuss potential collaboration opportunities that could benefit both our audiences.

Would you be open to a quick chat about this?

Best regards,
[Your Name]`
  };

  if (!config.accounts.every(acc => acc.username && acc.password)) {
    console.error('Please set all Instagram account credentials in .env file');
    return;
  }

  const agent = new DMAgent(config);

  try {
    await agent.start();
    
    // Use scraped profiles for DM test
    const targetUsernames = scrapedProfiles?.profiles?.map((p: any) => p.username) || [];
    
    if (targetUsernames.length === 0) {
      console.log('No profiles to process for DM test');
      return;
    }

    console.log(`Processing ${targetUsernames.length} profiles for DM test...`);
    
    for (const username of targetUsernames) {
      const success = await agent.processProfile(username);
      if (success) {
        console.log(`Successfully processed ${username}`);
      } else {
        console.log(`Failed to process ${username}`);
      }

      // Random delay between profiles
      await new Promise(resolve => setTimeout(resolve, Math.random() * 5000 + 2000));
    }

  } catch (error) {
    console.error('Error running DM agent:', error);
  } finally {
    await agent.stop();
  }
}

async function main() {
  try {
    console.log('Starting comprehensive test of all features...');
    
    // Run scraper test first
    const scrapedProfiles = await runScraperTest();
    
    // Run DM test with scraped profiles
    await runDmTest(scrapedProfiles);
    
    console.log('\nAll tests completed!');
  } catch (error) {
    console.error('Error running tests:', error);
    const err = error as any;
    if (err && err.stack) {
      console.error('Stack trace:', err.stack);
    } else {
      console.error('Error (stringified):', JSON.stringify(error, null, 2));
    }
  } finally {
    process.exit(0);
  }
}

// Run all tests
main().catch(console.error); 