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
const scraperAgent_js_1 = require("../subagents/scraperAgent.js");
const dotenv = __importStar(require("dotenv"));
const url_1 = require("url");
const path_1 = require("path");
// Load environment variables
dotenv.config();
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = (0, path_1.dirname)(__filename);
async function main() {
    try {
        console.log('Initializing scraper agent...');
        const scraper = new scraperAgent_js_1.ScraperAgent({
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
        }
        else {
            console.error('Scraping failed:', result.error);
        }
    }
    catch (error) {
        console.error('Error running test:', error);
    }
    finally {
        process.exit(0);
    }
}
// Run the test
main().catch(console.error);
