import { chromium, Page } from 'playwright';
import { CookieManager } from '../utils/cookieManager';
import { MessageManager } from '../utils/messageManager';
import { evaluateProfile } from '../evaluator/gpt4Evaluator';
import * as dotenv from 'dotenv';

dotenv.config();

interface ProfileData {
  username: string;
  followers: number;
  bio: string;
  captions: string[];
  link: string;
  linkContentsDescription: string;
}

interface DMAgentConfig {
  accounts: {
    username: string;
    password: string;
  }[];
  messageTemplate: string;
}

export class DMAgent {
  private cookieManager: CookieManager;
  private messageManager: MessageManager;
  private config: DMAgentConfig;
  private currentUsername: string | null = null;
  private browser: any = null;
  private context: any = null;
  private page: any = null;

  constructor(config: DMAgentConfig) {
    this.cookieManager = new CookieManager();
    this.messageManager = new MessageManager();
    this.config = config;

    // Initialize accounts in cookie manager
    config.accounts.forEach(account => {
      this.cookieManager.addAccount(account.username);
    });
  }

  private async login(username: string, password: string): Promise<boolean> {
    try {
      if (!this.browser) {
        this.browser = await chromium.launch({ headless: false });
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
      } catch {
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
        } catch {
          // Popup didn't appear
        }

        // Save cookies for next time
        await this.cookieManager.saveCookies(this.context, username);
      }

      this.currentUsername = username;
      return true;
    } catch (error) {
      console.error(`Login failed for ${username}:`, error);
      return false;
    }
  }

  private async extractProfileData(page: Page, username: string): Promise<ProfileData> {
    // Wait for key elements to load
    await page.waitForSelector('header section');
    
    // Extract bio and link
    const bio = await page.evaluate(() => 
      document.querySelector('header > div:nth-child(3)')?.textContent || '');
    
    const link = await page.evaluate(() => 
      document.querySelector('header a[href^="http"]')?.getAttribute('href') || '');

    // Extract follower count
    const followers = await page.evaluate(() => {
      const items = document.querySelectorAll('header section ul li');
      const followerItem = Array.from(items)[1]; // Second item is followers
      const text = followerItem?.textContent || '0';
      const count = parseInt(text.replace(/[^0-9]/g, ''));
      return count || 0;
    });

    // Extract latest post captions
    const captions: string[] = await page.evaluate(() => {
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

  private async switchAccount(): Promise<boolean> {
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

  private async sendDM(username: string, message: string): Promise<boolean> {
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
        from: this.currentUsername!,
        to: username,
        content: message
      });

      // Increment DM count for rate limiting
      this.cookieManager.incrementDMCount(this.currentUsername!);
      
      return true;
    } catch (error) {
      console.error(`Failed to send DM to ${username}:`, error);
      if (error.message.includes('rate limit')) {
        this.cookieManager.markAsRateLimited(this.currentUsername!);
      }
      return false;
    }
  }

  async processProfile(username: string): Promise<boolean> {
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
      const evaluation = await evaluateProfile(profileData);

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
    } catch (error) {
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

  getMessageManager(): MessageManager {
    return this.messageManager;
  }
} 