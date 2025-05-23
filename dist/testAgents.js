"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const scraperAgent_1 = require("./subagents/scraperAgent");
const evaluatorAgent_1 = require("./subagents/evaluatorAgent");
const outreachAgent_1 = require("./subagents/outreachAgent");
const settingsStore_1 = require("./stores/settingsStore");
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
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
    const scraper = new scraperAgent_1.ScraperAgent({
        threadCount: 1,
        timeoutMs: 30000 // Reduced timeout to 30 seconds
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
    }
    catch (error) {
        console.error('Error during testing:', error);
    }
    finally {
        await scraper.stop();
    }
}
async function testEvaluatorAgent() {
    console.log('Testing Evaluator Agent...');
    const evaluator = new evaluatorAgent_1.EvaluatorAgent({ threadCount: 2, maxRetries: 3, timeoutMs: 30000 });
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
    const outreach = new outreachAgent_1.OutreachAgent({ threadCount: 2, maxRetries: 3, timeoutMs: 30000 });
    const result = await outreach.execute();
    console.log('Outreach Result:', result);
}
async function main() {
    try {
        // Set up credentials
        const settingsStore = settingsStore_1.useSettingsStore.getState();
        settingsStore.updateSettings({
            ...settingsStore.settings,
            instagramUsername: process.env.INSTAGRAM_USERNAME || '',
            instagramPassword: process.env.INSTAGRAM_PASSWORD || '',
            openaiKey: process.env.OPENAI_API_KEY || ''
        });
        await testScraperAgent();
        await testEvaluatorAgent();
        await testOutreachAgent();
    }
    catch (error) {
        console.error('Error during testing:', error);
    }
}
main();
//# sourceMappingURL=testAgents.js.map