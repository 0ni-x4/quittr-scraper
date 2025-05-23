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
            maxRetries: 3, // Default value
            timeoutMs: options.timeoutMs
        });
        this.browser = null;
        this.context = null;
        this.mainPage = null;
        this.targets = [];
        this.processedUsernames = new Set();
        this.maxSuggestedAccounts = 50;
        this.maxDepth = 3;
        this.isLoggedIn = false;
        this.timeoutMs = options.timeoutMs;
    }
    async getItems() {
        return this.targets;
    }
    async initBrowser() {
        if (this.browser)
            return; // Already initialized
        console.log('Initializing browser...');
        console.log('CSRF Token:', process.env.INSTAGRAM_CSRF_TOKEN);
        this.browser = await playwright_1.chromium.launch({
            headless: false, // Set to false to see what's happening
            args: [
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
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            viewport: { width: 1920, height: 1080 },
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
        // Set cookies
        const cookies = [
            {
                name: 'csrftoken',
                value: process.env.INSTAGRAM_CSRF_TOKEN || '',
                domain: '.instagram.com',
                path: '/',
                expires: Math.floor(Date.now() / 1000) + 31536000, // 1 year
                httpOnly: false,
                secure: true,
                sameSite: 'Lax'
            },
            {
                name: 'sessionid',
                value: process.env.INSTAGRAM_SESSION_ID || '',
                domain: '.instagram.com',
                path: '/',
                expires: Math.floor(Date.now() / 1000) + 31536000, // 1 year
                httpOnly: true,
                secure: true,
                sameSite: 'Lax'
            }
        ];
        console.log('Setting cookies:', JSON.stringify(cookies, null, 2));
        await this.context.addCookies(cookies);
        // Create main page
        this.mainPage = await this.context.newPage();
        // Add stealth measures
        await this.context.addInitScript(() => {
            Object.defineProperty(window.navigator, 'webdriver', { get: () => false });
            Object.defineProperty(window.navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
            Object.defineProperty(window.navigator, 'languages', { get: () => ['en-US', 'en'] });
            // @ts-ignore - Adding chrome runtime to window
            window.chrome = { runtime: {} };
        });
        // Verify login once during initialization
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
            // Set a longer timeout for navigation
            this.mainPage.setDefaultTimeout(60000); // 60 seconds
            this.mainPage.setDefaultNavigationTimeout(60000);
            // Navigate to Instagram with retry logic
            let retryCount = 0;
            const maxRetries = 3;
            while (retryCount < maxRetries) {
                try {
                    await this.mainPage.goto('https://www.instagram.com/', {
                        waitUntil: 'domcontentloaded', // Changed from networkidle to domcontentloaded
                        timeout: 60000
                    });
                    break;
                }
                catch (error) {
                    retryCount++;
                    if (retryCount === maxRetries)
                        throw error;
                    console.log(`Navigation attempt ${retryCount} failed, retrying...`);
                    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before retry
                }
            }
            // Wait for either login form or logged-in elements
            const loginForm = await this.mainPage.$('form[action="/accounts/login/ajax/"]');
            const loggedInElements = await Promise.race([
                this.mainPage.waitForSelector('svg[aria-label="Home"]', { timeout: 10000 }).then(() => true).catch(() => false),
                this.mainPage.waitForSelector('a[href="/direct/inbox/"]', { timeout: 10000 }).then(() => true).catch(() => false)
            ]);
            if (loginForm) {
                console.log('Not logged in - login form detected');
                return false;
            }
            if (loggedInElements) {
                console.log('Successfully logged in!');
                return true;
            }
            console.log('Login status unclear - no definitive indicators found');
            return false;
        }
        catch (error) {
            console.error('Error verifying login:', error);
            return false;
        }
    }
    async scrapeInstagramProfile(username) {
        if (!this.mainPage || !this.isLoggedIn)
            throw new Error('Browser not initialized or not logged in');
        try {
            const profileUrl = `https://www.instagram.com/${username}/`;
            console.log(`Navigating to ${profileUrl}`);
            await this.mainPage.goto(profileUrl, {
                waitUntil: 'domcontentloaded',
                timeout: this.timeoutMs
            });
            // First check if the profile exists
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
            // Wait for the main content to load
            console.log('Waiting for profile content to load...');
            await this.mainPage.waitForSelector('header', { timeout: 60000 });
            // Get follower count, following count, and post count
            console.log('Extracting profile metrics...');
            const metadata = await this.mainPage.evaluate(() => {
                const metricItems = window.document.querySelectorAll('header section ul li');
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
            // Get bio and other profile information
            console.log('Extracting bio and profile info...');
            const profileInfo = await this.mainPage.evaluate(() => {
                const bioSection = window.document.querySelector('header section');
                const bio = bioSection?.querySelector('h1')?.nextElementSibling?.textContent || '';
                const name = bioSection?.querySelector('h2')?.textContent || '';
                const category = bioSection?.querySelector('div > span')?.textContent || '';
                const website = bioSection?.querySelector('a[href^="http"]')?.getAttribute('href') || '';
                return {
                    bio,
                    name,
                    category,
                    website
                };
            });
            // Get recent posts data
            console.log('Extracting recent posts data...');
            const recentPosts = await this.mainPage.evaluate(() => {
                const posts = Array.from(window.document.querySelectorAll('article')).slice(0, 12);
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
            const followers = cleanNumber(metadata.followers);
            const posts = cleanNumber(metadata.posts);
            const totalLikes = recentPosts.reduce((sum, post) => sum + cleanNumber(post.likes), 0);
            const avgLikes = recentPosts.length > 0 ? totalLikes / recentPosts.length : 0;
            const engagementRate = followers > 0 ? (avgLikes / followers) * 100 : 0;
            // Extract hashtags from bio and recent posts
            const hashtagRegex = /#[\w-]+/g;
            const bioHashtags = (profileInfo.bio.match(hashtagRegex) || []).map((tag) => tag.slice(1));
            const postHashtags = recentPosts
                .map(post => post.caption.match(hashtagRegex) || [])
                .flat()
                .map(tag => tag.slice(1));
            const uniqueHashtags = [...new Set([...bioHashtags, ...postHashtags])];
            return {
                content: profileInfo.bio,
                metadata: {
                    ...metadata,
                    name: profileInfo.name,
                    category: profileInfo.category,
                    website: profileInfo.website,
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
    }
    async getSuggestedAccounts(username) {
        if (!this.mainPage || !this.isLoggedIn)
            throw new Error('Browser not initialized or not logged in');
        try {
            console.log(`Getting suggested accounts for ${username}...`);
            const profileUrl = `https://www.instagram.com/${username}/`;
            await this.mainPage.goto(profileUrl, {
                waitUntil: 'domcontentloaded',
                timeout: 60000
            });
            // Wait for the profile page to load
            console.log('Waiting for profile content to load...');
            await this.mainPage.waitForSelector('header', { timeout: 30000 });
            await this.mainPage.waitForTimeout(3000); // Give it time to fully load
            console.log('Looking for Similar accounts button...');
            // Use the same approach as the working Python code
            const clickResult = await this.mainPage.evaluate(() => {
                const svg = document.querySelector('svg[aria-label="Similar accounts"]');
                if (svg && svg.parentElement) {
                    svg.parentElement.click();
                    return { success: true, found: true };
                }
                return { success: false, found: false };
            });
            if (!clickResult.found) {
                console.log('Similar accounts button not found');
                await this.mainPage.screenshot({ path: 'debug_no_similar_button.png' });
                return [];
            }
            if (!clickResult.success) {
                console.log('Failed to click Similar accounts button');
                return [];
            }
            console.log('Successfully clicked Similar accounts button');
            await this.mainPage.waitForTimeout(2000); // Wait for suggestions to appear
            // Extract suggested accounts using the same selector as the Python code
            const suggestedAccounts = await this.mainPage.evaluate(() => {
                const accounts = [];
                // Look for account containers - using the exact selector from Python code
                const containers = document.querySelectorAll('div.x9f619.xjbqb8w.x78zum5.x168nmei.x13lgxp2.x5pf9jr.xo71vjh.x1uhb9sk.x1plvlek.xryxfnj.x1c4vz4f.x2lah0s.x1q0g3np.xqjyukv.x1qjc9v5.x1oa3qoh.xl56j7k');
                containers.forEach(container => {
                    const span = container.querySelector('a[role="link"] span.x1lliihq.x193iq5w.x6ikm8r.x10wlt62.xlyipyv.xuxw1ft');
                    if (span && span.textContent) {
                        accounts.push(span.textContent);
                    }
                });
                return accounts;
            });
            console.log(`Found ${suggestedAccounts.length} suggested accounts`);
            // Close the suggestions by pressing Escape
            await this.mainPage.keyboard.press('Escape');
            await this.mainPage.waitForTimeout(1000);
            // Recursively get suggestions from each suggested account (limit to prevent infinite loops)
            const allSuggestions = new Set(suggestedAccounts);
            for (const suggestedUsername of suggestedAccounts) {
                if (allSuggestions.size >= this.maxSuggestedAccounts)
                    break;
                try {
                    console.log(`Getting nested suggestions for ${suggestedUsername}...`);
                    const nestedSuggestions = await this.getSuggestedAccounts(suggestedUsername);
                    nestedSuggestions.forEach(suggestion => allSuggestions.add(suggestion));
                }
                catch (error) {
                    console.error(`Error getting nested suggestions for ${suggestedUsername}:`, error);
                    continue;
                }
            }
            return Array.from(allSuggestions).slice(0, this.maxSuggestedAccounts);
        }
        catch (error) {
            console.error(`Error getting suggested accounts for ${username}:`, error);
            return [];
        }
    }
    async expandTargetsWithSuggestions(target, depth = 0) {
        if (depth >= this.maxDepth || this.processedUsernames.has(target.username)) {
            return;
        }
        this.processedUsernames.add(target.username);
        const suggestedAccounts = await this.getSuggestedAccounts(target.username);
        for (const username of suggestedAccounts) {
            if (!this.processedUsernames.has(username)) {
                this.targets.push({
                    username,
                    platform: 'instagram',
                    keywords: [...target.keywords],
                    isReferenceAccount: false
                });
            }
        }
        // Recursively process suggested accounts if we haven't reached max depth
        if (depth < this.maxDepth - 1) {
            for (const username of suggestedAccounts) {
                if (!this.processedUsernames.has(username)) {
                    await this.expandTargetsWithSuggestions({
                        username,
                        platform: 'instagram',
                        keywords: [...target.keywords],
                        isReferenceAccount: false
                    }, depth + 1);
                }
            }
        }
    }
    async processItem(target) {
        try {
            // Initialize browser if not already initialized
            if (!this.browser || !this.isLoggedIn) {
                await this.initBrowser();
            }
            // If this is a reference account, expand targets with suggestions
            if (target.isReferenceAccount) {
                await this.expandTargetsWithSuggestions(target);
            }
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
    async execute() {
        try {
            // Initialize browser first
            if (!this.browser || !this.isLoggedIn) {
                await this.initBrowser();
            }
            // Process all targets
            await this.processItems(this.targets);
            // Don't close the browser here - let it be managed by the stop() method
            return {
                success: true,
                data: {
                    processedItems: this.targets.length,
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
                    processedItems: 0,
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