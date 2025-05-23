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
const dotenv = __importStar(require("dotenv"));
// Load environment variables
dotenv.config();
async function testScraper() {
    console.log('Starting scraper test...');
    // Create scraper instance with reasonable timeouts
    const scraper = new scraperAgent_1.ScraperAgent({
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
    }
    catch (error) {
        console.error('Error during test:', error);
    }
    finally {
        // Clean up
        console.log('Cleaning up...');
        await scraper.stop();
    }
}
// Run the test
testScraper().catch(console.error);
//# sourceMappingURL=test-scraper.js.map