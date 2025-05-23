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
exports.DMAgent = void 0;
const playwright_1 = require("playwright");
const cookieManager_1 = require("../utils/cookieManager");
const messageManager_1 = require("../utils/messageManager");
const gpt4Evaluator_1 = require("../evaluator/gpt4Evaluator");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
class DMAgent {
    constructor(config) {
        this.currentUsername = null;
        this.browser = null;
        this.context = null;
        this.page = null;
        this.cookieManager = new cookieManager_1.CookieManager();
        this.messageManager = new messageManager_1.MessageManager();
        this.config = config;
        // Initialize accounts in cookie manager
        config.accounts.forEach(account => {
            this.cookieManager.addAccount(account.username);
        });
    }
    async login(username, password) {
        try {
            if (!this.browser) {
                this.browser = await playwright_1.chromium.launch({ headless: false });
            }
            this.context = await this.browser.newContext();
            // Try to load cookies first
            let isLoggedIn = await this.cookieManager.loadCookies(this.context, username);
            this.page = await this.context.newPage();
            await this.page.goto('https://www.instagram.com/');
            // Check if cookies worked
            try {
                await this.page.waitForSelector('button[type="submit"]', { timeout: 3000 });
                // If we see the login button, cookies didn't work
                isLoggedIn = false;
            }
            catch {
                // No login button means we're logged in
                return true;
            }
            if (!isLoggedIn) {
                // Regular login
                await this.page.waitForSelector('input[name="username"]');
                await this.page.fill('input[name="username"]', username);
                await this.page.fill('input[name="password"]', password);
                await this.page.click('button[type="submit"]');
                // Handle "Save Login Info" popup
                try {
                    await this.page.waitForSelector('button:has-text("Not Now")', { timeout: 5000 });
                    await this.page.click('button:has-text("Not Now")');
                }
                catch {
                    // Popup didn't appear
                }
                // Save cookies for next time
                await this.cookieManager.saveCookies(this.context, username);
            }
            this.currentUsername = username;
            return true;
        }
        catch (error) {
            console.error(`Login failed for ${username}:`, error);
            return false;
        }
    }
    async extractProfileData(page, username) {
        // Wait for key elements to load
        await page.waitForSelector('header section');
        // Extract bio and link
        const bio = await page.evaluate(() => {
            const bioElement = document.querySelector('header > div:nth-child(3)');
            return bioElement?.textContent || '';
        });
        const link = await page.evaluate(() => {
            const linkElement = document.querySelector('header a[href^="http"]');
            return linkElement?.getAttribute('href') || '';
        });
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
                const captionElement = article.querySelector('h1') ||
                    article.querySelector('div[role="menuitem"]');
                return captionElement?.textContent?.trim() || '';
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
    async switchAccount() {
        const nextUsername = this.cookieManager.getAvailableAccount();
        if (!nextUsername) {
            console.log('No available accounts to switch to');
            return false;
        }
        const account = this.config.accounts.find(a => a.username === nextUsername);
        if (!account) {
            console.log(`Account ${nextUsername} not found in config`);
            return false;
        }
        if (this.context) {
            await this.context.close();
        }
        return await this.login(account.username, account.password);
    }
    async sendDM(username, message) {
        try {
            // Navigate to user's profile
            await this.page.goto(`https://www.instagram.com/${username}/`);
            // Click message button
            await this.page.waitForSelector('button:has-text("Message")');
            await this.page.click('button:has-text("Message")');
            // Wait for message input
            await this.page.waitForSelector('textarea[placeholder="Message..."]');
            await this.page.fill('textarea[placeholder="Message..."]', message);
            // Send message
            await this.page.keyboard.press('Enter');
            // Record the message
            this.messageManager.addMessage({
                from: this.currentUsername,
                to: username,
                content: message
            });
            // Increment DM count for rate limiting
            this.cookieManager.incrementDMCount(this.currentUsername);
            return true;
        }
        catch (error) {
            console.error(`Failed to send DM to ${username}:`, error);
            if (error.message && error.message.includes('rate limit')) {
                this.cookieManager.markAsRateLimited(this.currentUsername);
            }
            return false;
        }
    }
    async processProfile(username) {
        // Skip if already messaged
        if (this.messageManager.hasMessagedUser(username)) {
            console.log(`Already messaged ${username}, skipping`);
            return false;
        }
        try {
            // Evaluate profile
            await this.page.goto(`https://www.instagram.com/${username}/`);
            // Extract profile data using the existing analyzer code
            const profileData = await this.extractProfileData(this.page, username);
            const evaluation = await (0, gpt4Evaluator_1.evaluateProfile)(profileData);
            if (!evaluation.isValid) {
                console.log(`Profile ${username} evaluated as invalid: ${evaluation.explanation}`);
                return false;
            }
            // Prepare personalized message
            const message = this.config.messageTemplate
                .replace('{username}', username)
                .replace('{followers}', profileData.followers.toString());
            // Send DM
            const success = await this.sendDM(username, message);
            if (!success && this.cookieManager.getAvailableAccount()) {
                // Try with another account if available
                const switched = await this.switchAccount();
                if (switched) {
                    return await this.sendDM(username, message);
                }
            }
            return success;
        }
        catch (error) {
            console.error(`Error processing profile ${username}:`, error);
            return false;
        }
    }
    async start() {
        if (!await this.switchAccount()) {
            throw new Error('No available accounts to start with');
        }
    }
    async stop() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.context = null;
            this.page = null;
            this.currentUsername = null;
        }
    }
    getMessageManager() {
        return this.messageManager;
    }
}
exports.DMAgent = DMAgent;
