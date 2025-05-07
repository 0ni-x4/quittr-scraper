import { AgentResult, ScraperTarget, ScrapedData } from '../types/agent';
import { BaseAgent } from './baseAgent';
import { useSettingsStore } from '../stores/settingsStore';
import { chromium, Page, Browser, BrowserContext } from 'playwright';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export class ScraperAgent extends BaseAgent {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private mainPage: Page | null = null;
  private targets: ScraperTarget[] = [];
  private processedUsernames: Set<string> = new Set();
  private readonly maxSuggestedAccounts: number = 50;
  private readonly maxDepth: number = 3;
  private readonly maxRetries: number;
  private readonly timeoutMs: number;
  private isLoggedIn: boolean = false;

  constructor(options: { threadCount: number; maxRetries: number; timeoutMs: number }) {
    super({ 
      threadCount: options.threadCount,
      maxRetries: options.maxRetries,
      timeoutMs: options.timeoutMs
    });
    this.maxRetries = options.maxRetries;
    this.timeoutMs = options.timeoutMs;
  }

  public async getItems(): Promise<ScraperTarget[]> {
    return this.targets;
  }

  public async initBrowser(): Promise<void> {
    if (this.browser) return; // Already initialized
    
    console.log('Initializing browser...');
    console.log('CSRF Token:', process.env.INSTAGRAM_CSRF_TOKEN);
    
    this.browser = await chromium.launch({
      headless: false,  // Set to false to see what's happening
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
        sameSite: 'Lax' as const
      },
      {
        name: 'sessionid',
        value: process.env.INSTAGRAM_SESSION_ID || '',
        domain: '.instagram.com',
        path: '/',
        expires: Math.floor(Date.now() / 1000) + 31536000, // 1 year
        httpOnly: true,
        secure: true,
        sameSite: 'Lax' as const
      }
    ];

    console.log('Setting cookies:', JSON.stringify(cookies, null, 2));
    await this.context.addCookies(cookies);

    // Create main page
    this.mainPage = await this.context.newPage();
    
    // Add stealth measures
    await this.context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
      // @ts-ignore - Adding chrome runtime to window
      window.chrome = { runtime: {} };
    });

    // Verify login once during initialization
    this.isLoggedIn = await this.verifyLogin();
    if (!this.isLoggedIn) {
      throw new Error('Failed to log in with cookies');
    }
  }

  public async verifyLogin(): Promise<boolean> {
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
        } catch (error) {
          retryCount++;
          if (retryCount === maxRetries) throw error;
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
    } catch (error) {
      console.error('Error verifying login:', error);
      return false;
    }
  }

  private async scrapeInstagramProfile(username: string): Promise<Partial<ScrapedData>> {
    if (!this.mainPage || !this.isLoggedIn) throw new Error('Browser not initialized or not logged in');

    try {
      const profileUrl = `https://www.instagram.com/${username}/`;
      console.log(`Navigating to ${profileUrl}`);
      
      await this.mainPage.goto(profileUrl, { 
        waitUntil: 'networkidle',
        timeout: 60000 
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
        const metricItems = document.querySelectorAll('header section ul li');
        const metrics: Record<string, string> = {};
        
        metricItems.forEach((item, index) => {
          const text = item.textContent || '';
          if (index === 0) metrics.posts = text.match(/[\d,]+/)?.[0] || '0';
          if (index === 1) metrics.followers = text.match(/[\d,]+/)?.[0] || '0';
          if (index === 2) metrics.following = text.match(/[\d,]+/)?.[0] || '0';
        });

        return metrics;
      });

      // Get bio and other profile information
      console.log('Extracting bio and profile info...');
      const profileInfo = await this.mainPage.evaluate(() => {
        const bioSection = document.querySelector('header section');
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
      const cleanNumber = (str: string) => parseInt(str.replace(/,/g, '')) || 0;
      const followers = cleanNumber(metadata.followers);
      const posts = cleanNumber(metadata.posts);
      const totalLikes = recentPosts.reduce((sum, post) => sum + cleanNumber(post.likes), 0);
      const avgLikes = recentPosts.length > 0 ? totalLikes / recentPosts.length : 0;
      const engagementRate = followers > 0 ? (avgLikes / followers) * 100 : 0;

      // Extract hashtags from bio and recent posts
      const hashtagRegex = /#[\w-]+/g;
      const bioHashtags = (profileInfo.bio.match(hashtagRegex) || []).map(tag => tag.slice(1));
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
    } catch (error) {
      console.error(`Error scraping Instagram profile ${username}:`, error);
      throw error;
    }
  }

  public async setReferenceAccount(username: string): Promise<void> {
    this.targets = [{
      username,
      platform: 'instagram',
      keywords: [],
      isReferenceAccount: true
    }];
    this.processedUsernames.clear();
  }

  private async getSuggestedAccounts(username: string): Promise<string[]> {
    if (!this.mainPage || !this.isLoggedIn) throw new Error('Browser not initialized or not logged in');

    try {
      console.log(`Getting suggested accounts for ${username}...`);
      const profileUrl = `https://www.instagram.com/${username}/`;
      await this.mainPage.goto(profileUrl, { waitUntil: 'networkidle', timeout: 60000 });

      // Wait for the suggested accounts section to load
      await this.mainPage.waitForSelector('div[role="dialog"]', { timeout: 30000 }).catch(() => null);
      
      // Click on the followers/following button to open the modal
      const followersButton = await this.mainPage.$('a[href*="/followers/"]');
      if (followersButton) {
        await followersButton.click();
        await this.mainPage.waitForTimeout(2000); // Wait for modal to load
      }

      // Extract suggested accounts
      const suggestedAccounts = await this.mainPage.evaluate(() => {
        const accounts: string[] = [];
        const accountElements = document.querySelectorAll('div[role="dialog"] a[role="link"]');
        
        accountElements.forEach(element => {
          const href = element.getAttribute('href');
          if (href && href.startsWith('/') && !href.includes('/p/')) {
            const username = href.split('/')[1];
            if (username && !accounts.includes(username)) {
              accounts.push(username);
            }
          }
        });

        return accounts;
      });

      // Close the modal
      const closeButton = await this.mainPage.$('button[aria-label="Close"]');
      if (closeButton) {
        await closeButton.click();
        await this.mainPage.waitForTimeout(1000);
      }

      return suggestedAccounts.slice(0, this.maxSuggestedAccounts);
    } catch (error) {
      console.error(`Error getting suggested accounts for ${username}:`, error);
      return [];
    }
  }

  private async expandTargetsWithSuggestions(target: ScraperTarget, depth: number = 0): Promise<void> {
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

  async processItem(target: ScraperTarget): Promise<ScrapedData> {
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
    } catch (error) {
      console.error(`Error processing item ${target.username}:`, error);
      throw error;
    }
  }

  public async execute(): Promise<AgentResult> {
    try {
      // Initialize browser first
      if (!this.browser || !this.isLoggedIn) {
        await this.initBrowser();
      }
      
      // Execute the base agent's execute method
      return await super.execute();
    } catch (error) {
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

  public async stop(): Promise<void> {
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