import { chromium, Page } from 'playwright';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import lowdb from 'lowdb';
import FileSync from 'lowdb/adapters/FileSync';

dotenv.config();

interface InstagramProfile {
  username: string;
  fullName: string;
  bio: string;
  followers: number;
  following: number;
  posts: number;
  category?: string;
  email?: string;
  website?: string;
  keywords: string[];
  scrapedAt: Date;
}

interface DB {
  profiles: InstagramProfile[];
}

const adapter = new FileSync<DB>(path.join(process.cwd(), 'db.json'));
const db = lowdb(adapter);

// Initialize db.json with empty profiles array if it doesn't exist
db.defaults({ profiles: [] }).write();

const INSTAGRAM_LOGIN = process.env.INSTAGRAM_USERNAME || '';
const INSTAGRAM_PASSWORD = process.env.INSTAGRAM_PASSWORD || '';
const KEYWORDS = ['fitness', 'real estate', 'entrepreneur'];
const PROFILES_PER_KEYWORD = 10;

async function extractProfileData(page: Page, keyword: string): Promise<InstagramProfile | null> {
  try {
    // Wait for key elements to load
    await page.waitForSelector('header section');
    
    // Extract basic profile information
    const username = await page.evaluate(() => document.querySelector('header h2')?.textContent || '');
    const fullName = await page.evaluate(() => document.querySelector('header h1')?.textContent || '');
    const bio = await page.evaluate(() => document.querySelector('header > div:nth-child(3)')?.textContent || '');
    
    // Extract follower/following counts
    const counts = await page.evaluate(() => {
      const items = document.querySelectorAll('header section ul li');
      return Array.from(items, item => {
        const text = item.textContent || '';
        return parseInt(text.replace(/[^0-9]/g, '')) || 0;
      });
    });

    // Extract additional info
    const category = await page.evaluate(() => 
      document.querySelector('[class*="category"]')?.textContent || undefined);
    const email = await page.evaluate(() => {
      const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/;
      const bio = document.querySelector('header > div:nth-child(3)')?.textContent || '';
      const match = bio.match(emailRegex);
      return match ? match[0] : undefined;
    });
    const website = await page.evaluate(() => 
      document.querySelector('header a[href^="http"]')?.getAttribute('href') || undefined);

    return {
      username,
      fullName,
      bio,
      followers: counts[1] || 0,
      following: counts[2] || 0,
      posts: counts[0] || 0,
      category,
      email,
      website,
      keywords: [keyword],
      scrapedAt: new Date()
    };
  } catch (error) {
    console.error('Error extracting profile data:', error);
    return null;
  }
}

async function searchAndScrapeProfiles() {
  if (!INSTAGRAM_LOGIN || !INSTAGRAM_PASSWORD) {
    throw new Error('Instagram credentials not found in .env file');
  }

  const browser = await chromium.launch({ headless: false }); // Set to true in production
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Login to Instagram
    console.log('Logging in to Instagram...');
    await page.goto('https://www.instagram.com/accounts/login/');
    await page.waitForSelector('input[name="username"]');
    await page.fill('input[name="username"]', INSTAGRAM_LOGIN);
    await page.fill('input[name="password"]', INSTAGRAM_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForNavigation();

    // Handle "Save Login Info" popup if it appears
    try {
      await page.waitForSelector('button:has-text("Not Now")', { timeout: 5000 });
      await page.click('button:has-text("Not Now")');
    } catch (e) {
      // Popup didn't appear, continue
    }

    // Search and scrape profiles for each keyword
    for (const keyword of KEYWORDS) {
      console.log(`Searching for ${keyword} profiles...`);
      await page.goto(`https://www.instagram.com/explore/tags/${keyword}/`);
      await page.waitForSelector('article a');

      // Get top posts
      const profileLinks = await page.evaluate(() => {
        const links = document.querySelectorAll('article a');
        return Array.from(links, (link: Element) => (link as HTMLAnchorElement).href)
          .slice(0, PROFILES_PER_KEYWORD);
      });

      // Visit each profile and extract data
      for (const link of profileLinks) {
        try {
          await page.goto(link);
          const profileData = await extractProfileData(page, keyword);
          
          if (profileData) {
            // Check if profile already exists
            const existing = db.get('profiles')
              .find({ username: profileData.username })
              .value();

            if (existing) {
              // Update existing profile
              db.get('profiles')
                .find({ username: profileData.username })
                .assign({
                  ...profileData,
                  keywords: [...new Set([...existing.keywords, keyword])]
                })
                .write();
            } else {
              // Add new profile
              db.get('profiles')
                .push(profileData)
                .write();
            }

            console.log(`Scraped profile: ${profileData.username}`);
          }

          // Random delay to avoid rate limiting
          await page.waitForTimeout(Math.random() * 2000 + 1000);
        } catch (error) {
          console.error(`Error processing profile ${link}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Scraping failed:', error);
  } finally {
    await browser.close();
  }
}

// Run the scraper
searchAndScrapeProfiles()
  .then(() => console.log('Scraping completed'))
  .catch(error => console.error('Scraping failed:', error)); 