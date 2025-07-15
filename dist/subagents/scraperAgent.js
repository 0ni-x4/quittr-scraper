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
exports.ScraperAgent = void 0;
const baseAgent_1 = require("./baseAgent");
const playwright_1 = require("playwright");
const dotenv = __importStar(require("dotenv"));
// Load environment variables
dotenv.config();
class ScraperAgent extends baseAgent_1.BaseAgent {
    constructor(options) {
        super({
            threadCount: options.threadCount,
            maxRetries: 3,
            timeoutMs: options.timeoutMs
        });
        this.browser = null;
        this.context = null;
        this.mainPage = null;
        this.targets = [];
        this.processedUsernames = new Set();
        this.isLoggedIn = false;
        this.accountsToProcess = [];
        this.scrapedAccounts = {};
        this.processedCount = 0;
        this.maxAccountsToScan = 100;
        this.minFollowers = 15000;
        this.timeoutMs = options.timeoutMs;
    }
    async getItems() {
        return this.targets;
    }
    getScrapedData() {
        const scrapedData = [];
        for (const [username, accountData] of Object.entries(this.scrapedAccounts)) {
            scrapedData.push({
                username,
                platform: 'instagram',
                content: accountData.bio || '',
                metadata: {
                    followers: accountData.followers_count?.toString() || '0',
                    depth: accountData.depth,
                    suggested_accounts: accountData.suggested_accounts || [],
                    lastUpdated: new Date().toISOString()
                },
                timestamp: new Date()
            });
        }
        return scrapedData;
    }
    async initBrowser() {
        if (this.browser)
            return;
        console.log('Initializing browser...');
        this.browser = await playwright_1.chromium.launch({
            headless: false,
            args: [
                '--disable-blink-features=AutomationControlled',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process',
                '--disable-site-isolation-trials',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=1920,1080'
            ]
        });
        this.context = await this.browser.newContext({
            viewport: { width: 1280, height: 800 },
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            deviceScaleFactor: 1,
            hasTouch: false,
            isMobile: false,
            locale: 'en-US',
            timezoneId: 'America/New_York',
            permissions: ['geolocation'],
            extraHTTPHeaders: {
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1'
            }
        });
        // Set cookies if available
        if (process.env.INSTAGRAM_CSRF_TOKEN && process.env.INSTAGRAM_SESSION_ID) {
            const cookies = [
                {
                    name: 'csrftoken',
                    value: process.env.INSTAGRAM_CSRF_TOKEN,
                    domain: '.instagram.com',
                    path: '/',
                    expires: Math.floor(Date.now() / 1000) + 31536000,
                    httpOnly: false,
                    secure: true,
                    sameSite: 'Lax'
                },
                {
                    name: 'sessionid',
                    value: process.env.INSTAGRAM_SESSION_ID,
                    domain: '.instagram.com',
                    path: '/',
                    expires: Math.floor(Date.now() / 1000) + 31536000,
                    httpOnly: true,
                    secure: true,
                    sameSite: 'Lax'
                }
            ];
            await this.context.addCookies(cookies);
        }
        // Create main page
        this.mainPage = await this.context.newPage();
        // Add stealth measures
        await this.context.addInitScript(() => {
            Object.defineProperty(window.navigator, 'webdriver', { get: () => false });
            Object.defineProperty(window.navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
            Object.defineProperty(window.navigator, 'languages', { get: () => ['en-US', 'en'] });
            // @ts-ignore
            window.chrome = { runtime: {} };
        });
        // Set timeouts
        this.mainPage.setDefaultTimeout(5000);
        this.mainPage.setDefaultNavigationTimeout(5000);
        // Verify login
        this.isLoggedIn = await this.verifyLogin();
        if (!this.isLoggedIn) {
            throw new Error('Failed to log in with cookies');
        }
    }
    async verifyLogin() {
        if (!this.context || !this.mainPage) {
            console.error('Browser context not initialized');
            return false;
        }
        try {
            console.log('Verifying login status...');
            await this.mainPage.goto('https://www.instagram.com/', {
                waitUntil: 'domcontentloaded',
                timeout: 15000
            });
            // Check if we're already logged in
            try {
                await this.mainPage.waitForSelector('svg[aria-label="Home"]', { timeout: 5000 });
                console.log('Already logged in!');
                return true;
            }
            catch {
                console.log('Need to log in manually...');
                return await this.waitForManualLogin();
            }
        }
        catch (error) {
            console.error('Error verifying login:', error);
            return false;
        }
    }
    async waitForManualLogin() {
        console.log('Please log in manually to Instagram...');
        console.log('Waiting for login to complete...');
        if (!this.mainPage)
            return false;
        // Wait until we detect that we're logged in
        while (true) {
            try {
                await this.mainPage.waitForSelector('svg[aria-label="Home"]', { timeout: 2000 });
                console.log('Login detected!');
                return true;
            }
            catch {
                await new Promise(resolve => setTimeout(resolve, 1000));
                continue;
            }
        }
    }
    convertFollowersToNumber(followersText) {
        if (!followersText)
            return 0;
        const cleanText = followersText.replace(/,/g, '');
        let multiplier = 1;
        if (cleanText.includes('K')) {
            multiplier = 1000;
        }
        else if (cleanText.includes('M')) {
            multiplier = 1000000;
        }
        else if (cleanText.includes('B')) {
            multiplier = 1000000000;
        }
        const numberMatch = cleanText.match(/[\d.]+/);
        if (numberMatch) {
            return Math.floor(parseFloat(numberMatch[0]) * multiplier);
        }
        return 0;
    }
    async getAccountInfo(page) {
        try {
            console.log('Waiting for page to load...');
            await page.waitForSelector('header', { timeout: 10000 });
            console.log('Header found, extracting info...');
            // Name - try multiple selectors
            let name = '';
            try {
                const nameElement = await page.$('header section [class*="html-div"] span');
                if (nameElement) {
                    name = await nameElement.textContent() || '';
                    console.log(`Found name: ${name}`);
                }
                else {
                    // Fallback: try any span in header that looks like a name
                    const headerSpans = await page.$$('header span');
                    for (let i = 0; i < Math.min(3, headerSpans.length); i++) {
                        const text = await headerSpans[i].textContent();
                        if (text && text.length < 50) {
                            name = text;
                            console.log(`Found name (fallback): ${name}`);
                            break;
                        }
                    }
                }
            }
            catch (e) {
                console.log(`Name selector failed: ${e}`);
            }
            // Bio - try multiple approaches
            let bio = '';
            let bioFound = false;
            console.log('Looking for bio...');
            try {
                const headerSections = await page.$$('header section');
                for (const section of headerSections) {
                    const spans = await section.$$('span');
                    for (const span of spans) {
                        const text = await span.textContent();
                        if (text && text !== name && text.length > 10) {
                            bio = text;
                            bioFound = true;
                            console.log(`Found bio: ${bio.substring(0, 50)}...`);
                            break;
                        }
                    }
                    if (bioFound)
                        break;
                }
            }
            catch (e) {
                console.log(`Bio search failed: ${e}`);
            }
            if (!bioFound) {
                console.log('No bio found, checking if account has description area...');
                bio = '';
                bioFound = true; // Allow accounts without bios to continue
            }
            // Followers count - more robust approach
            let followersCount = 0;
            console.log('Looking for followers count...');
            try {
                const links = await page.$$('header a');
                for (const link of links) {
                    const text = await link.textContent();
                    if (text && (text.toLowerCase().includes('followers') || /\d/.test(text))) {
                        const followersMatch = text.match(/([\d,]+\.?\d*)\s*([KMB])?\s*followers/i);
                        if (followersMatch) {
                            const number = followersMatch[1].replace(/,/g, '');
                            const suffix = followersMatch[2];
                            let baseNumber = parseFloat(number);
                            if (suffix) {
                                if (suffix.toUpperCase() === 'K') {
                                    followersCount = Math.floor(baseNumber * 1000);
                                }
                                else if (suffix.toUpperCase() === 'M') {
                                    followersCount = Math.floor(baseNumber * 1000000);
                                }
                                else if (suffix.toUpperCase() === 'B') {
                                    followersCount = Math.floor(baseNumber * 1000000000);
                                }
                            }
                            else {
                                followersCount = Math.floor(baseNumber);
                            }
                            console.log(`Found followers: ${followersCount.toLocaleString()}`);
                            break;
                        }
                        else {
                            // Fallback: just extract numbers
                            const numbers = text.match(/[\d,]+/g);
                            if (numbers) {
                                followersCount = this.convertFollowersToNumber(numbers[0]);
                                console.log(`Found followers (fallback): ${followersCount.toLocaleString()}`);
                                break;
                            }
                        }
                    }
                }
            }
            catch (e) {
                console.log(`Followers count search failed: ${e}`);
            }
            // Website link
            let website = null;
            console.log('Looking for website...');
            try {
                const links = await page.$$('header a[href]');
                for (const link of links) {
                    const href = await link.getAttribute('href');
                    if (href && !href.startsWith('/') && (href.includes('http') || href.includes('.'))) {
                        website = href;
                        console.log(`Found website: ${website}`);
                        break;
                    }
                }
            }
            catch (e) {
                console.log(`Website search failed: ${e}`);
            }
            console.log(`Account info gathered - Name: ${name}, Bio: ${bio.substring(0, 30)}..., Followers: ${followersCount}`);
            return {
                name,
                bio,
                website,
                website_text: '',
                followers_count: followersCount,
                has_required_info: true
            };
        }
        catch (error) {
            console.log(`Error getting account info: ${error}`);
            try {
                const url = page.url();
                console.log(`Current page URL: ${url}`);
            }
            catch { }
            return null;
        }
    }
    async getSuggestedAccounts(username, depth = 0) {
        if (!this.mainPage || !this.isLoggedIn) {
            throw new Error('Browser not initialized or not logged in');
        }
        try {
            console.log(`Getting suggested accounts for ${username}...`);
            const page = await this.context.newPage();
            await page.goto(`https://www.instagram.com/${username}/`, {
                waitUntil: 'domcontentloaded',
                timeout: 15000
            });
            // Add a small delay for page to stabilize
            await page.waitForTimeout(2000);
            const accountInfo = await this.getAccountInfo(page);
            if (!accountInfo) {
                console.log(`Failed to get account info for ${username}`);
                await page.close();
                return [];
            }
            // Validate account meets minimum requirements
            if (accountInfo.followers_count < this.minFollowers) {
                console.log(`Account ${username} has insufficient followers: ${accountInfo.followers_count}`);
                await page.close();
                return [];
            }
            this.processedCount++;
            console.log(`Progress: ${this.processedCount} accounts processed`);
            // Store account info
            if (!(username in this.scrapedAccounts)) {
                this.scrapedAccounts[username] = {
                    depth,
                    followers_count: accountInfo.followers_count,
                    suggested_accounts: []
                };
            }
            console.log('Looking for similar accounts...');
            const suggestedUsernames = [];
            try {
                // First, try to click "Similar accounts" button
                let suggestedButtonClicked = false;
                try {
                    // Look for the "Similar accounts" button with SVG
                    const similarAccountsButton = await page.$('div[role="button"] svg[aria-label="Similar accounts"]');
                    if (similarAccountsButton) {
                        const buttonDiv = await similarAccountsButton.evaluateHandle((el) => el.parentElement);
                        if (buttonDiv) {
                            console.log('Clicking Similar accounts button');
                            await buttonDiv.click();
                            await page.waitForTimeout(3000);
                            suggestedButtonClicked = true;
                        }
                    }
                    if (!suggestedButtonClicked) {
                        // Fallback: look for button with specific classes
                        const buttonDiv = await page.$('div.x1i10hfl.x9f619.xe8uvvx.xdj266r.x14z9mp.xat24cr.x1lziwak.x16tdsg8.x1hl2dhg.xggy1nq.x1a2a7pz.x6s0dn4.x1ejq31n.x18oe1m7.x1sy0etr.xstzfhl.x1ypdohk.xl56j7k.x1y1aw1k.xf159sx.xwib8y2.xmzvs34.xcdnw81.x1gjpkn9.x1obq294.x5a5i1n.xde0f50.x15x8krk.x972fbf.x10w94by.x1qhh985.x14e42zd.xt0psk2.xsz8vos[role="button"]');
                        if (buttonDiv) {
                            console.log('Clicking Similar accounts button (fallback)');
                            await buttonDiv.click();
                            await page.waitForTimeout(3000);
                            suggestedButtonClicked = true;
                        }
                    }
                    if (!suggestedButtonClicked) {
                        // Last fallback: look for any button with "Similar" text
                        const buttons = await page.$$('div[role="button"]');
                        for (const button of buttons) {
                            const svg = await button.$('svg[aria-label="Similar accounts"]');
                            if (svg) {
                                console.log('Clicking Similar accounts button (found in scan)');
                                await button.click();
                                await page.waitForTimeout(3000);
                                suggestedButtonClicked = true;
                                break;
                            }
                        }
                    }
                }
                catch (e) {
                    console.log(`Could not click Similar accounts button: ${e}`);
                }
                if (suggestedButtonClicked) {
                    console.log('Similar accounts section should now be expanded');
                }
                else {
                    console.log('Could not find or click Similar accounts button');
                }
                // Now look for usernames in the specific span elements
                const containerDiv = await page.$('div.x1qjc9v5.x78zum5.x1q0g3np.x5yr21d.xw2csxc.x10wlt62.x1n2onr6.x1rohswg.xfk6m8');
                if (containerDiv) {
                    console.log('Found suggested accounts container');
                    // Look for links in the suggested accounts section
                    let usernameLinks = await page.$$('header section.xc3tme8.xcrlgei.x1tmp44o.xwqlbqq.x7y0ge5.xhayw2b ul li a[href^="/"]');
                    if (usernameLinks.length === 0) {
                        usernameLinks = await containerDiv.$$('ul li a[href^="/"]');
                    }
                    if (usernameLinks.length === 0) {
                        usernameLinks = await containerDiv.$$('a[href^="/"][href$="/"]');
                    }
                    for (const link of usernameLinks) {
                        try {
                            const href = await link.getAttribute('href');
                            if (href && href.startsWith('/') && href.endsWith('/')) {
                                const usernameCandidate = href.replace(/\//g, '');
                                // Validate username
                                if (usernameCandidate &&
                                    usernameCandidate.length > 0 &&
                                    usernameCandidate.length < 50 &&
                                    !usernameCandidate.includes(' ') &&
                                    usernameCandidate !== username &&
                                    !(usernameCandidate in this.scrapedAccounts) &&
                                    !suggestedUsernames.includes(usernameCandidate) &&
                                    !usernameCandidate.startsWith('p/') &&
                                    !usernameCandidate.startsWith('reel') &&
                                    !usernameCandidate.startsWith('tv') &&
                                    !usernameCandidate.startsWith('explore')) {
                                    suggestedUsernames.push(usernameCandidate);
                                    console.log(`Found username in container: ${usernameCandidate}`);
                                    if (suggestedUsernames.length >= 10) {
                                        break;
                                    }
                                }
                            }
                        }
                        catch (e) {
                            console.log(`Error processing username link: ${e}`);
                        }
                    }
                    if (suggestedUsernames.length === 0) {
                        console.log('No valid usernames found in container links');
                    }
                }
                else {
                    console.log('Suggested accounts container not found');
                }
                // Add found accounts to the scraped accounts and queue
                for (const suggestedUsername of suggestedUsernames) {
                    console.log(`Added to queue: ${suggestedUsername}`);
                    this.scrapedAccounts[username].suggested_accounts.push(suggestedUsername);
                    this.accountsToProcess.push({ username: suggestedUsername, depth: depth + 1 });
                }
            }
            catch (error) {
                console.log(`Error scraping suggested accounts: ${error}`);
            }
            await page.close();
            return suggestedUsernames;
        }
        catch (error) {
            console.error(`Error getting suggested accounts for ${username}:`, error);
            return [];
        }
    }
    async scrapeInstagramProfile(username) {
        if (!this.mainPage || !this.isLoggedIn) {
            throw new Error('Browser not initialized or not logged in');
        }
        try {
            const profileUrl = `https://www.instagram.com/${username}/`;
            console.log(`Navigating to ${profileUrl}`);
            await this.mainPage.goto(profileUrl, {
                waitUntil: 'domcontentloaded',
                timeout: this.timeoutMs
            });
            // Check if profile exists
            const errorMessage = await this.mainPage.$('text="Sorry, this page isn\'t available."');
            if (errorMessage) {
                console.log(`Profile ${username} does not exist or is private`);
                return {
                    content: '',
                    metadata: {
                        error: 'Profile not found or private',
                        platform: 'instagram',
                        followers: '0',
                        following: '0',
                        posts: '0',
                        engagement: 0
                    }
                };
            }
            // Get account info using the improved method
            const accountInfo = await this.getAccountInfo(this.mainPage);
            if (!accountInfo) {
                throw new Error('Failed to get account info');
            }
            // Get follower count, following count, and post count
            const metadata = await this.mainPage.evaluate(() => {
                const metricItems = document.querySelectorAll('header section ul li');
                const metrics = {};
                metricItems.forEach((item, index) => {
                    const text = item.textContent || '';
                    if (index === 0)
                        metrics.posts = text.match(/[\d,]+/)?.[0] || '0';
                    if (index === 1)
                        metrics.followers = text.match(/[\d,]+/)?.[0] || '0';
                    if (index === 2)
                        metrics.following = text.match(/[\d,]+/)?.[0] || '0';
                });
                return metrics;
            });
            // Get recent posts data
            const recentPosts = await this.mainPage.evaluate(() => {
                const posts = Array.from(document.querySelectorAll('article')).slice(0, 12);
                return posts.map(post => {
                    const caption = post.querySelector('h1')?.textContent ||
                        post.querySelector('div[role="menuitem"]')?.textContent || '';
                    const likes = post.querySelector('section span')?.textContent || '0';
                    const timestamp = post.querySelector('time')?.getAttribute('datetime') || '';
                    const isVideo = !!post.querySelector('video');
                    const isCarousel = !!post.querySelector('ul[role="tablist"]');
                    return {
                        caption: caption.trim(),
                        likes: likes.replace(/[^0-9]/g, ''),
                        timestamp,
                        type: isVideo ? 'video' : isCarousel ? 'carousel' : 'image'
                    };
                });
            });
            // Calculate engagement metrics
            const cleanNumber = (str) => parseInt(str.replace(/,/g, '')) || 0;
            const followers = accountInfo.followers_count;
            const posts = cleanNumber(metadata.posts || '0');
            const totalLikes = recentPosts.reduce((sum, post) => sum + cleanNumber(post.likes), 0);
            const avgLikes = recentPosts.length > 0 ? totalLikes / recentPosts.length : 0;
            const engagementRate = followers > 0 ? (avgLikes / followers) * 100 : 0;
            // Extract hashtags from bio and recent posts
            const hashtagRegex = /#[\w-]+/g;
            const bioHashtags = (accountInfo.bio.match(hashtagRegex) || []).map((tag) => tag.slice(1));
            const postHashtags = recentPosts
                .map(post => post.caption.match(hashtagRegex) || [])
                .flat()
                .map(tag => tag.slice(1));
            const uniqueHashtags = [...new Set([...bioHashtags, ...postHashtags])];
            return {
                content: accountInfo.bio,
                metadata: {
                    ...metadata,
                    name: accountInfo.name,
                    website: accountInfo.website,
                    platform: 'instagram',
                    followers: followers.toString(),
                    posts: posts.toString(),
                    engagement: engagementRate,
                    avgLikes: avgLikes.toString(),
                    recentPosts: recentPosts,
                    hashtags: uniqueHashtags,
                    lastUpdated: new Date().toISOString()
                }
            };
        }
        catch (error) {
            console.error(`Error scraping Instagram profile ${username}:`, error);
            throw error;
        }
    }
    async setReferenceAccount(username) {
        this.targets = [{
                username,
                platform: 'instagram',
                keywords: [],
                isReferenceAccount: true
            }];
        this.processedUsernames.clear();
        this.accountsToProcess = [{ username, depth: 0 }];
    }
    async processItem(target) {
        try {
            // Initialize browser if not already initialized
            if (!this.browser || !this.isLoggedIn) {
                await this.initBrowser();
            }
            // Process accounts sequentially
            await this.processAccounts();
            // Scrape the profile
            console.log(`Scraping profile: ${target.username}`);
            const scrapedData = await this.scrapeInstagramProfile(target.username);
            const timestamp = new Date();
            return {
                username: target.username,
                platform: target.platform,
                content: scrapedData.content || '',
                metadata: scrapedData.metadata || {},
                timestamp
            };
        }
        catch (error) {
            console.error(`Error processing item ${target.username}:`, error);
            throw error;
        }
    }
    async processAccounts() {
        console.log('Processing accounts sequentially...');
        while (this.accountsToProcess.length > 0 && this.processedCount < this.maxAccountsToScan) {
            const { username, depth } = this.accountsToProcess.shift();
            if (!(username in this.scrapedAccounts)) {
                try {
                    await this.getSuggestedAccounts(username, depth);
                }
                catch (error) {
                    console.error(`Error processing account ${username}:`, error);
                }
            }
        }
    }
    async execute() {
        try {
            // Initialize browser first
            if (!this.browser || !this.isLoggedIn) {
                await this.initBrowser();
            }
            // Process all targets
            await this.processItems(this.targets);
            return {
                success: true,
                data: {
                    processedItems: this.processedCount,
                    scrapedAccounts: this.scrapedAccounts,
                    errors: []
                }
            };
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            return {
                success: false,
                error: err,
                data: {
                    processedItems: this.processedCount,
                    scrapedAccounts: this.scrapedAccounts,
                    errors: [err]
                }
            };
        }
    }
    async stop() {
        if (this.browser) {
            if (this.mainPage) {
                await this.mainPage.close();
                this.mainPage = null;
            }
            await this.browser.close();
            this.browser = null;
            this.context = null;
            this.isLoggedIn = false;
        }
        await super.stop();
    }
}
exports.ScraperAgent = ScraperAgent;
//# sourceMappingURL=scraperAgent.js.map