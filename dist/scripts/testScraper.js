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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const readline = __importStar(require("readline"));
dotenv.config();
// Create readline interface for user input
const rl = readline.createInterface({
    // Function to get user input
    function: askQuestion(query, string), Promise() {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        return new Promise(resolve => rl.question(query, ans => {
            rl.close();
            resolve(ans);
        }));
    }
    // Generate relevant hashtags based on user input
    ,
    // Generate relevant hashtags based on user input
    function: generateHashtags(topic, string), string, []: {
        const: baseWord = topic.toLowerCase().replace(/[^a-z0-9]/g, ''),
        return: [
            baseWord,
            `${baseWord}s`,
            `${baseWord}lover`,
            `${baseWord}life`,
            `${baseWord}community`,
            `${baseWord}ofinstagram`,
            `${baseWord}world`,
            `${baseWord}daily`
        ]
    },
    function: loginToInstagram(page, playwright_1.Page), Promise() {
        console.log('Navigating to Instagram login page...');
        await page.goto('https://www.instagram.com/accounts/login/');
        // Wait for the login form to be visible
        await page.waitForSelector('input[name="username"]', { timeout: 10000 });
        // Fill in the login form
        await page.fill('input[name="username"]', process.env.INSTAGRAM_USERNAME || '');
        await page.fill('input[name="password"]', process.env.INSTAGRAM_PASSWORD || '');
        // Click the login button
        await page.click('button[type="submit"]');
        // Wait for navigation and handle potential security checks
        try {
            // Wait for either the home feed or a security check
            await Promise.race([
                page.waitForSelector('svg[aria-label="Home"]', { timeout: 10000 }),
                page.waitForSelector('input[name="verificationCode"]', { timeout: 10000 })
            ]);
            // Check if we need to handle a security verification
            const needsVerification = await page.isVisible('input[name="verificationCode"]');
            if (needsVerification) {
                console.log('Security verification required. Please check your email or phone for the verification code.');
                const rl = readline.createInterface({
                    input: process.stdin,
                    output: process.stdout
                });
                const code = await new Promise(resolve => {
                    rl.question('Enter the verification code: ', (answer) => {
                        rl.close();
                        resolve(answer);
                    });
                });
                await page.fill('input[name="verificationCode"]', code);
                await page.click('button[type="button"]');
                // Wait for the home feed after verification
                await page.waitForSelector('svg[aria-label="Home"]', { timeout: 10000 });
            }
            // Wait a bit for the page to fully load
            await page.waitForTimeout(5000);
            // Verify we're logged in by checking for the home icon
            const isLoggedIn = await page.isVisible('svg[aria-label="Home"]');
            if (!isLoggedIn) {
                throw new Error('Could not verify successful login');
            }
            console.log('Successfully logged in to Instagram');
            return true;
        }
        catch (error) {
            console.error('Login failed:', error);
            return false;
        }
    },
    function: findProfilesFromHashtag(page, playwright_1.Page, hashtag, string, maxProfiles, number = 5), []:  > {
        console, : .log(`Searching hashtag #${hashtag}...`),
        await, page, : .goto(`https://www.instagram.com/explore/tags/${hashtag}/`),
        try: {
            // Wait for posts to load
            await, page, : .waitForSelector('article', { timeout: 60000 }),
            3: , i
        }++
    }
}), { await, page, evaluate };
(() => window.scrollBy(0, window.innerHeight));
await page.waitForTimeout(1000);
// Get profile links from the posts
const profileLinks = await page.evaluate(() => {
    const posts = document.querySelectorAll('article');
    const uniqueProfiles = new Set();
    posts.forEach(post => {
        // Find the username link in the post
        const usernameLink = post.querySelector('a[role="link"]');
        if (usernameLink) {
            const href = usernameLink.getAttribute('href') || '';
            const username = href.split('/')[1]; // Get username from URL path
            if (username && !uniqueProfiles.has(username)) {
                uniqueProfiles.add(username);
            }
        }
    });
    return Array.from(uniqueProfiles);
});
console.log(`Found ${profileLinks.length} unique profiles from #${hashtag}`);
return profileLinks.slice(0, maxProfiles);
try { }
catch (error) {
    console.log(`Error finding profiles for #${hashtag}:`, error);
    return [];
}
async function scrapeProfile(page, username, discoveredVia) {
    try {
        console.log(`\nScraping profile: ${username}`);
        await page.goto(`https://www.instagram.com/${username}/`);
        // Wait for profile to load
        await page.waitForSelector('header section', { timeout: 30000 });
        // Extract profile data
        const profileData = await page.evaluate(() => {
            const header = document.querySelector('header section');
            if (!header)
                return null;
            // Get metrics (posts, followers, following)
            const metrics = Array.from(header.querySelectorAll('ul li')).map(li => {
                const text = li.textContent || '';
                return parseInt(text.replace(/[^0-9]/g, '')) || 0;
            });
            // Get bio and other info
            const bio = header.querySelector('h1')?.nextElementSibling?.textContent || '';
            const category = header.querySelector('div > span')?.textContent || '';
            const name = header.querySelector('h2')?.textContent || '';
            return {
                metrics,
                bio,
                category,
                name
            };
        });
        if (!profileData) {
            console.log(`Could not extract data for ${username}`);
            return null;
        }
        const profile = {
            username,
            platform: 'instagram',
            followers: profileData.metrics[1] || 0,
            following: profileData.metrics[2] || 0,
            posts: profileData.metrics[0] || 0,
            bio: profileData.bio,
            category: profileData.category,
            scrapedAt: new Date(),
            discoveredVia
        };
        console.log('Profile Data:');
        console.log('Username:', profile.username);
        console.log('Name:', profileData.name);
        console.log('Followers:', profile.followers.toLocaleString());
        console.log('Posts:', profile.posts.toLocaleString());
        console.log('Bio:', profile.bio);
        console.log('Category:', profile.category);
        console.log('Discovered via:', profile.discoveredVia);
        console.log('----------------------------------------');
        return profile;
    }
    catch (error) {
        console.error(`Error scraping profile ${username}:`, error);
        return null;
    }
}
async function main() {
    // Check for Instagram credentials
    if (!process.env.INSTAGRAM_USERNAME || !process.env.INSTAGRAM_PASSWORD) {
        console.error('Error: Instagram credentials not found in .env file');
        console.error('Please add your Instagram credentials to the .env file:');
        console.error('INSTAGRAM_USERNAME=your_username');
        console.error('INSTAGRAM_PASSWORD=your_password');
        return;
    }
    const browser = await playwright_1.chromium.launch({ headless: false });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    });
    const page = await context.newPage();
    try {
        // Login to Instagram
        console.log('Logging in to Instagram...');
        const loginSuccess = await loginToInstagram(page);
        if (!loginSuccess) {
            throw new Error('Failed to log in to Instagram');
        }
        const scrapedProfiles = [];
        // Get user input for the target niche
        const targetNiche = await askQuestion('What type of accounts are you looking for? (e.g., fitness, art, food): ');
        const maxProfilesPerHashtag = await askQuestion('How many profiles to scrape per hashtag? (default 5): ');
        const maxProfiles = parseInt(maxProfilesPerHashtag) || 5;
        console.log(`\nSearching for ${targetNiche} accounts...`);
        console.log('Generating relevant hashtags...');
        // Generate hashtags based on user input
        const hashtags = generateHashtags(targetNiche);
        console.log('Will search these hashtags:', hashtags.map(h => '#' + h).join(', '), '\n');
        // Search each hashtag and collect profiles
        for (const hashtag of hashtags) {
            const profiles = await findProfilesFromHashtag(page, hashtag, maxProfiles);
            // Scrape each profile
            for (const username of profiles) {
                // Skip if we already scraped this profile
                if (scrapedProfiles.some(p => p.username === username)) {
                    console.log(`Skipping ${username} - already scraped`);
                    continue;
                }
                const profileData = await scrapeProfile(page, username, `#${hashtag}`);
                if (profileData) {
                    scrapedProfiles.push(profileData);
                }
                // Add delay between profile scrapes
                await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));
            }
            // Add delay between hashtag searches
            await new Promise(resolve => setTimeout(resolve, 5000 + Math.random() * 3000));
        }
        // Save results to a JSON file
        const resultsDir = path.join(process.cwd(), 'results');
        if (!fs.existsSync(resultsDir)) {
            fs.mkdirSync(resultsDir);
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const resultsPath = path.join(resultsDir, `${targetNiche}-profiles-${timestamp}.json`);
        fs.writeFileSync(resultsPath, JSON.stringify(scrapedProfiles, null, 2));
        console.log(`\nResults saved to: ${resultsPath}`);
        console.log(`Total profiles found: ${scrapedProfiles.length}`);
    }
    catch (error) {
        console.error('Error during scraping:', error);
    }
    finally {
        await browser.close();
    }
}
// Run the scraper
main()
    .then(() => console.log('Scraping completed'))
    .catch(error => console.error('Scraping failed:', error));
//# sourceMappingURL=testScraper.js.map