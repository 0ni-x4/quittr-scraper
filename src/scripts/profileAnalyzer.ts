import { chromium, Page } from 'playwright';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { evaluateProfile } from '../evaluator/gpt4Evaluator';

dotenv.config();

interface ProfileData {
  username: string;
  followers: number;
  bio: string;
  captions: string[];
  link: string;
  linkContentsDescription: string;
}

async function extractProfileData(page: Page, username: string): Promise<ProfileData> {
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

async function analyzeProfile(username: string) {
  const browser = await chromium.launch({ headless: false });
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
    const evaluation = await evaluateProfile(profileData);
    
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

  } catch (error) {
    console.error('Analysis failed:', error);
  } finally {
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