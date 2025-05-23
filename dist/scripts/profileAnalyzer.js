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
const playwright_1 = require("playwright");
const dotenv = __importStar(require("dotenv"));
const gpt4Evaluator_1 = require("../evaluator/gpt4Evaluator");
dotenv.config();
async function extractProfileData(page, username) {
    // Wait for key elements to load
    await page.waitForSelector('header section');
    // Extract bio and link
    const bio = await page.evaluate(() => document.querySelector('header > div:nth-child(3)')?.textContent || '');
    const link = await page.evaluate(() => document.querySelector('header a[href^="http"]')?.getAttribute('href') || '');
    // Extract follower count
    const followers = await page.evaluate(() => {
        const items = document.querySelectorAll('header section ul li');
        const followerItem = Array.from(items)[1]; // Second item is followers
        const text = followerItem?.textContent || '0';
        const count = parseInt(text.replace(/[^0-9]/g, ''));
        return count || 0;
    });
    // Extract latest post captions
    const captions = await page.evaluate(() => {
        const articles = document.querySelectorAll('article');
        return Array.from(articles).slice(0, 5).map(article => {
            const caption = article.querySelector('h1')?.textContent ||
                article.querySelector('div[role="menuitem"]')?.textContent || '';
            return caption.trim();
        });
    });
    // Basic description of link contents (without actually visiting)
    const linkContentsDescription = link ?
        `Link in bio: ${link} (appears to be ${link.includes('linktr.ee') ? 'a Linktree page' : 'a direct website'})` :
        'No link in bio';
    return {
        username,
        followers,
        bio,
        captions,
        link,
        linkContentsDescription
    };
}
async function analyzeProfile(username) {
    const browser = await playwright_1.chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
        // Go directly to profile
        console.log(`Analyzing profile: ${username}...`);
        await page.goto(`https://www.instagram.com/${username}/`);
        // Wait for content to load
        await page.waitForSelector('header', { timeout: 10000 });
        // Extract profile data
        const profileData = await extractProfileData(page, username);
        console.log('\nProfile Data:', JSON.stringify(profileData, null, 2));
        // Evaluate using GPT-4
        console.log('\nEvaluating profile with GPT-4...');
        const evaluation = await (0, gpt4Evaluator_1.evaluateProfile)(profileData);
        // Print evaluation results
        console.log('\nEvaluation Results:');
        console.log('-------------------');
        console.log(`Valid for outreach: ${evaluation.isValid ? 'Yes' : 'No'}`);
        console.log(`Confidence Score: ${evaluation.confidenceScore}%`);
        console.log('\nExplanation:');
        console.log(evaluation.explanation);
        if (evaluation.suggestedApproach) {
            console.log('\nSuggested Approach:');
            console.log(evaluation.suggestedApproach);
        }
    }
    catch (error) {
        console.error('Analysis failed:', error);
    }
    finally {
        await browser.close();
    }
}
// Check for username argument
const username = process.argv[2];
if (!username) {
    console.error('Please provide an Instagram username as an argument');
    process.exit(1);
}
// Run the analyzer
analyzeProfile(username)
    .then(() => console.log('Analysis completed'))
    .catch(error => console.error('Analysis failed:', error));
