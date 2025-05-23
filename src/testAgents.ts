import { ScraperAgent } from './subagents/scraperAgent';
import { EvaluatorAgent } from './subagents/evaluatorAgent';
import { OutreachAgent } from './subagents/outreachAgent';
import { useSettingsStore } from './stores/settingsStore';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env');
console.log('Loading .env file from:', envPath);
dotenv.config({ path: envPath });

// Log environment variables (without showing full values for security)
console.log('Environment variables loaded:');
console.log('INSTAGRAM_CSRF_TOKEN exists:', !!process.env.INSTAGRAM_CSRF_TOKEN);
console.log('INSTAGRAM_SESSION_ID exists:', !!process.env.INSTAGRAM_SESSION_ID);

async function testScraperAgent() {
  console.log('Testing Scraper Agent...');
  const scraper = new ScraperAgent({ 
    threadCount: 1, 
    timeoutMs: 30000  // Reduced timeout to 30 seconds
  });
  
  try {
    // Initialize browser and verify login
    await scraper.initBrowser();
    
    // Set a reference account to scrape
    await scraper.setReferenceAccount('openai');
    
    // Add a delay to ensure the browser has time to load
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const result = await scraper.execute();
    console.log('Scraper Result:', result);
    
    // Keep the browser open for a moment to see the results
    await new Promise(resolve => setTimeout(resolve, 30000));
  } catch (error) {
    console.error('Error during testing:', error);
  } finally {
    await scraper.stop();
  }
}

async function testEvaluatorAgent() {
  console.log('Testing Evaluator Agent...');
  const evaluator = new EvaluatorAgent({ threadCount: 2, maxRetries: 3, timeoutMs: 30000 });
  
  // Add some test data to evaluate
  evaluator.addToQueue({
    url: 'https://instagram.com/example',
    platform: 'instagram',
    content: 'AI and machine learning enthusiast. Working on exciting projects in artificial intelligence.',
    metadata: {
      followers: 10000,
      engagement: 0.05
    }
  });
  
  const result = await evaluator.execute();
  console.log('Evaluator Result:', result);
}

async function testOutreachAgent() {
  console.log('Testing Outreach Agent...');
  const outreach = new OutreachAgent({ threadCount: 2, maxRetries: 3, timeoutMs: 30000 });
  const result = await outreach.execute();
  console.log('Outreach Result:', result);
}

async function main() {
  try {
    // Set up credentials
    const settingsStore = useSettingsStore.getState();
    settingsStore.updateSettings({
      ...settingsStore.settings,
      instagramUsername: process.env.INSTAGRAM_USERNAME || '',
      instagramPassword: process.env.INSTAGRAM_PASSWORD || '',
      openaiKey: process.env.OPENAI_API_KEY || ''
    });

    await testScraperAgent();
    await testEvaluatorAgent();
    await testOutreachAgent();
  } catch (error) {
    console.error('Error during testing:', error);
  }
}

main(); 