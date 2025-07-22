import { AgentResult, ScraperTarget, ScrapedData } from '../types/agent';
import { BaseAgent } from './baseAgent';
import { chromium, Page, Browser, BrowserContext } from 'playwright';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export class ScraperAgent extends BaseAgent<ScraperTarget> {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private mainPage: Page | null = null;
  private targets: ScraperTarget[] = [];
  private processedUsernames: Set<string> = new Set();

  private readonly timeoutMs: number;
  private isLoggedIn: boolean = false;
  private accountsToProcess: Array<{ username: string; depth: number }> = [];
  private scrapedAccounts: Record<string, any> = {};
  private processedCount: number = 0;
  private readonly maxAccountsToScan: number = 100;
  private readonly minFollowers: number = 15000;

  constructor(options: { threadCount: number; timeoutMs: number }) {
    super({ 
      threadCount: options.threadCount,
      maxRetries: 3,
      timeoutMs: options.timeoutMs
    });
    this.timeoutMs = options.timeoutMs;
  }

  public async getItems(): Promise<ScraperTarget[]> {
    return this.targets;
  }

  public getScrapedData(): ScrapedData[] {
    const scrapedData: ScrapedData[] = [];
    
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
        timestamp: new Date(),
        reels: accountData.reels || []  // This will now contain the actual reels data
      });
    }
    
    return scrapedData;
  }

  public async initBrowser(): Promise<void> {
    if (this.browser) return;
    
    console.log('Initializing browser...');
    
    this.browser = await chromium.launch({
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
          sameSite: 'Lax' as const
        },
        {
          name: 'sessionid',
          value: process.env.INSTAGRAM_SESSION_ID,
          domain: '.instagram.com',
          path: '/',
          expires: Math.floor(Date.now() / 1000) + 31536000,
          httpOnly: true,
          secure: true,
          sameSite: 'Lax' as const
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

  public async verifyLogin(): Promise<boolean> {
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
      } catch {
        console.log('Need to log in manually...');
        return await this.waitForManualLogin();
      }
    } catch (error) {
      console.error('Error verifying login:', error);
      return false;
    }
  }

  private async waitForManualLogin(): Promise<boolean> {
    console.log('Please log in manually to Instagram...');
    console.log('Waiting for login to complete...');
    
    if (!this.mainPage) return false;

    // Wait until we detect that we're logged in
    while (true) {
      try {
        await this.mainPage.waitForSelector('svg[aria-label="Home"]', { timeout: 2000 });
        console.log('Login detected!');
        return true;
      } catch {
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
    }
  }

  private convertFollowersToNumber(followersText: string): number {
    if (!followersText) return 0;
    
    const cleanText = followersText.replace(/,/g, '');
    let multiplier = 1;
    
    if (cleanText.includes('K')) {
      multiplier = 1000;
    } else if (cleanText.includes('M')) {
      multiplier = 1000000;
    } else if (cleanText.includes('B')) {
      multiplier = 1000000000;
    }
    
    const numberMatch = cleanText.match(/[\d.]+/);
    if (numberMatch) {
      return Math.floor(parseFloat(numberMatch[0]) * multiplier);
    }
    
    return 0;
  }

  private async getAccountInfo(page: Page): Promise<any> {
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
         } else {
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
       } catch (e) {
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
           if (bioFound) break;
         }
       } catch (e) {
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
                 } else if (suffix.toUpperCase() === 'M') {
                   followersCount = Math.floor(baseNumber * 1000000);
                 } else if (suffix.toUpperCase() === 'B') {
                   followersCount = Math.floor(baseNumber * 1000000000);
                 }
               } else {
                 followersCount = Math.floor(baseNumber);
               }
               console.log(`Found followers: ${followersCount.toLocaleString()}`);
               break;
             } else {
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
       } catch (e) {
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
       } catch (e) {
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
    } catch (error) {
      console.log(`Error getting account info: ${error}`);
      try {
        const url = page.url();
        console.log(`Current page URL: ${url}`);
      } catch {}
      return null;
    }
  }

  private async getSuggestedAccounts(username: string, depth: number = 0): Promise<string[]> {
    if (!this.mainPage || !this.isLoggedIn) {
      throw new Error('Browser not initialized or not logged in');
    }

    try {
      console.log(`Getting suggested accounts for ${username}...`);
      const page = await this.context!.newPage();
      
      await page.goto(`https://www.instagram.com/${username}/reels`, { 
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

      // Use this page for scraping reels instead of creating a new one
      try {
        await this.scrapeInstagramProfile(username, page);
      } catch (error) {
        console.error(`Error scraping reels for ${username}:`, error);
      }

      console.log('Looking for similar accounts...');
      const suggestedUsernames: string[] = [];

      try {
        // First, try to click "Similar accounts" button
        let suggestedButtonClicked = false;
        
                 try {
           // Look for the "Similar accounts" button with SVG
           const similarAccountsButton = await page.$('div[role="button"] svg[aria-label="Similar accounts"]');
           if (similarAccountsButton) {
             const buttonDiv = await similarAccountsButton.evaluateHandle((el: any) => el.parentElement);
             if (buttonDiv) {
               console.log('Clicking Similar accounts button');
               await (buttonDiv as any).click();
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
         } catch (e) {
           console.log(`Could not click Similar accounts button: ${e}`);
         }

        if (suggestedButtonClicked) {
          console.log('Similar accounts section should now be expanded');
        } else {
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
            } catch (e) {
              console.log(`Error processing username link: ${e}`);
            }
          }
          
          if (suggestedUsernames.length === 0) {
            console.log('No valid usernames found in container links');
          }
        } else {
          console.log('Suggested accounts container not found');
        }

        // Add found accounts to the scraped accounts and queue
        for (const suggestedUsername of suggestedUsernames) {
          console.log(`Added to queue: ${suggestedUsername}`);
          this.scrapedAccounts[username].suggested_accounts.push(suggestedUsername);
          this.accountsToProcess.push({ username: suggestedUsername, depth: depth + 1 });
        }

      } catch (error) {
        console.log(`Error scraping suggested accounts: ${error}`);
      }

      // Only close the page after we're completely done with it
      await page.close();
      return suggestedUsernames;
    } catch (error) {
      console.error(`Error getting suggested accounts for ${username}:`, error);
      return [];
    }
  }

  private async scrapeInstagramProfile(username: string, page: Page): Promise<Partial<ScrapedData>> {
    console.log('[REELS SCRAPER] scrapeInstagramProfile called for', username);
    if (!this.mainPage || !this.isLoggedIn) {
      throw new Error('Browser not initialized or not logged in');
    }

    try {
      const profileUrl = `https://www.instagram.com/${username}/reels`;
      console.log(`Navigating to ${profileUrl}`);
      
      await page.goto(profileUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: this.timeoutMs 
      });

      // Check if profile exists
      const errorMessage = await page.$('text="Sorry, this page isn\'t available."');
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
      const accountInfo = await this.getAccountInfo(page);
      if (!accountInfo) {
        throw new Error('Failed to get account info');
      }

      // Get follower count, following count, and post count
      const metadata = await page.evaluate(() => {
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

      // Extract reels data
      console.log('[REELS SCRAPER] Starting reels extraction');
      let reels: { results: any[], logs?: any[] } = { results: [], logs: [] };

      try {
        // Add debug logging to browser context
        await page.evaluate(() => {
          // @ts-ignore
          window._scraperLogs = [];
          const log = (...args: unknown[]): void => {
            // @ts-ignore
            window._scraperLogs.push(args);
          };
          log('Starting reels extraction');
        });

        // Scroll to load more reels
        await page.evaluate(async () => {
          for (let i = 0; i < 5; i++) {
            window.scrollTo(0, document.body.scrollHeight);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        });

        // Extract reels
        reels = await page.evaluate(() => {
          const log = (...args: unknown[]): void => {
            // @ts-ignore
            window._scraperLogs.push(args);
          };

          log('Starting reels extraction in evaluate');

          // Find all <a> tags that might be reels
          const anchors = Array.from(document.querySelectorAll('a'));
          log('Found anchors:', anchors.length);

          // Filter for reel URLs
          const reelUrls = anchors
            .map(a => a.href)
            .filter(href => href && href.includes('/reel/'));

          log('Found reel URLs:', reelUrls);

          // Remove duplicates and take only the latest 30
          const uniqueReels = [...new Set(reelUrls)].slice(0, 30);
          log('Latest 30 unique reels:', uniqueReels.length);

          const results = uniqueReels.map(url => {
            const anchor = anchors.find(a => a.href === url);
            let views = '';
            let foundSpan = null;
            if (anchor) {
              foundSpan = anchor.querySelector('span.xdj266r.x14z9mp.xat24cr.x1lziwak.xexx8yu.xyri2b.x18d9i69.x1c1uobl.x1hl2dhg.x16tdsg8.x1vvkbs');
              if (!foundSpan) {
                foundSpan = anchor.querySelector('span');
              }
              if (foundSpan) {
                views = foundSpan.textContent || '';
              }
            }
            log('Reel:', url, 'Views:', views, 'Found span:', !!foundSpan);
            return { url, views };
          });

          // @ts-ignore
          return { results, logs: window._scraperLogs };
        });

        console.log('[REELS SCRAPER] page.evaluate completed');
      } catch (err) {
        console.error('[REELS SCRAPER] page.evaluate threw error:', err);
        reels = { results: [], logs: [['EVALUATE ERROR', String(err)]] };
      }

      // Log the debug info to the Node console
      if (reels && reels.logs) {
        for (const entry of reels.logs) {
          console.log('[REELS SCRAPER]', ...entry);
        }
      } else {
        console.warn('[REELS SCRAPER] No logs returned from page.evaluate');
      }

      // Store reels data in scrapedAccounts
      if (username in this.scrapedAccounts) {
        this.scrapedAccounts[username].reels = reels.results;
      } else {
        this.scrapedAccounts[username] = {
          depth: 0,
          followers_count: accountInfo.followers_count,
          suggested_accounts: [],
          reels: reels.results
        };
      }

      // Calculate engagement metrics
      const cleanNumber = (str: string) => parseInt(str.replace(/,/g, '')) || 0;
      const followers = accountInfo.followers_count;
      const posts = cleanNumber(metadata.posts || '0');
      const totalLikes = 0;
      const avgLikes = 0;
      const engagementRate = followers > 0 ? (avgLikes / followers) * 100 : 0;

      return {
        content: accountInfo.bio || '',
        metadata: {
          platform: 'instagram',
          followers: metadata.followers || '0',
          following: metadata.following || '0',
          posts: metadata.posts || '0',
          engagement: engagementRate
        }
      };

    } catch (error) {
      console.error(`Error scraping profile ${username}:`, error);
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
    this.accountsToProcess = [{ username, depth: 0 }];
  }

  async processItem(target: ScraperTarget): Promise<ScrapedData> {
    console.log('[REELS SCRAPER] processItem called for', target.username);
    try {
      // Initialize browser if not already initialized
      if (!this.browser || !this.isLoggedIn) {
        await this.initBrowser();
      }

      if (!this.mainPage || !this.context) {
        throw new Error('Browser context not properly initialized');
      }

      // Process accounts sequentially
      await this.processAccounts();

      // Create a new page for scraping
      const page = await this.context.newPage();
      try {
        // Scrape the profile
        console.log(`Scraping profile: ${target.username}`);
        const scrapedData = await this.scrapeInstagramProfile(target.username, page);
        const timestamp = new Date();

        return {
          username: target.username,
          platform: target.platform,
          content: scrapedData.content || '',
          metadata: scrapedData.metadata || {},
          timestamp
        };
      } finally {
        // Always close the page when done
        await page.close();
      }
    } catch (error) {
      console.error(`Error processing item ${target.username}:`, error);
      throw error;
    }
  }

  private async processAccounts(): Promise<void> {
    console.log('Processing accounts sequentially...');
    
    while (this.accountsToProcess.length > 0 && this.processedCount < this.maxAccountsToScan) {
      const { username, depth } = this.accountsToProcess.shift()!;
      
      if (!(username in this.scrapedAccounts)) {
        try {
          await this.getSuggestedAccounts(username, depth);
        } catch (error) {
          console.error(`Error processing account ${username}:`, error);
        }
      }
    }
  }

  public async execute(): Promise<AgentResult> {
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
    } catch (error) {
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