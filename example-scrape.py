import asyncio
import json
import random
import time
import os
import csv
from playwright.async_api import async_playwright, TimeoutError, Playwright
import re
import aiohttp
from urllib.parse import urlparse
from bs4 import BeautifulSoup
import concurrent.futures

# Configuration
ORANGE = '\033[38;5;208m'
RESET = '\033[0m'
WHOP_LOGO = ORANGE + '''
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
▓▓▓▓▓▓▓▓▓▓▒▒▒▓▓▓▓▓▓▓▓▓▓▓▒▒▒▓▓▓▓▓▓▓▓▓▓▒▒▒▒▓▓▓▓▓▓▓▓▓
▓▓▓▓▓▓▒░░░░░░░░░▓▓▓▓▒░░░░░░░░▒▓▓▓▓▒░░░░░░░░▒▓▓▓▓▓▓
▓▓▓▓▓▓▒░░░░░░░░░▓▓▒░░░░░░░░░░▒▓▓▒░░░░░░░░░░▒▓▓▓▓▓▓
▓▓▓▓▓▓▓▓▒░░░░░▓▓▒░░░░░░░░░░▒▓▓▒░░░░░░░░░░▒▓▓▓▓▓▓▓▓
▓▓▓▓▓▓▓▓▓▓▒▒▓▓▒░░░░░░░░░░▒▓▓▒░░░░░░░░░░▒▓▓▓▓▓▓▓▓▓▓
▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░▒▓▓▒░░░░░░░░░░▒▓▓▓▓▓▓▓▓▓▓▓▓
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒░░░░░░▒▓▓▒░░░░░░░░░░▒▓▓▓▓▓▓▓▓▓▓▓▓▓▓
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒░░▒▓▓▒░░░░░░░░░░▒▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒░░░░░░░░░░▒▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒░░░░░░░░▒▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒▒▒▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
''' + RESET
# Credentials not needed!
USERNAME = "w1h2o3p"
PASSWORD = "WHOP#252025"

# Scraping Configuration
START_ACCOUNT = "pierreekhoury"
# Parallel mode config
MAX_BRANCHES = 2
MAX_ACCOUNTS_PER_BRANCH = 5
MIN_FOLLOWERS = 15000

# Mode Configuration
SEQUENTIAL_MODE = True  # When True, processes one account at a time
MAX_ACCOUNTS_TO_SCAN = 15 # Only used in sequential mode, set to None for unlimited
VALIDATION_MODE = "end"  # Options: "yes" (immediate), "none" (disabled), "end" (batch)

# File Configuration
OUTPUT_FILE = "scraped_accounts.json"
STORAGE_STATE = "instagram_session.json"
VALID_ACCOUNTS_FILE = "valid_accounts.csv"
INVALID_ACCOUNTS_FILE = "invalid_accounts.csv"

# API Configuration
GPT_API_URL = "https://api.openai.com/v1/chat/completions"
GPT_API_KEY = "sk-proj-0123456789abcdef0123456789abcdef"


def convert_followers_to_number(followers_text):
    if not followers_text:
        return 0
    
    followers_text = followers_text.replace(',', '')
    multiplier = 1
    
    if 'K' in followers_text:
        multiplier = 1000
        followers_text = followers_text.replace('K', '')
    elif 'M' in followers_text:
        multiplier = 1000000
        followers_text = followers_text.replace('M', '')
    elif 'B' in followers_text:
        multiplier = 1000000000
        followers_text = followers_text.replace('B', '')
    
    try:
        return int(float(followers_text) * multiplier)
    except:
        return 0

async def fetch_webpage_text(url):
    if not url.startswith(('http://', 'https://')):
        url = 'https://' + url
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=10) as response:
                if response.status == 200:
                    html = await response.text()
                    soup = BeautifulSoup(html, 'html.parser')
                    # Remove script and style elements
                    for script in soup(["script", "style"]):
                        script.decompose()
                    # Get text and clean it up
                    text = soup.get_text(separator=' ', strip=True)
                    # Remove extra whitespace
                    text = ' '.join(text.split())
                    return text[:2000]  # Limit text length
    except:
        return ""
    return ""

async def validate_with_gpt(name, username, bio, followers_count, website_text):
    if not GPT_API_KEY:
        raise ValueError("OpenAI API key not found in environment variables")

    # Clean and truncate inputs
    name = name.replace('\n', ' ').replace('\r', ' ').strip()
    username = username.replace('\n', ' ').replace('\r', ' ').strip()
    bio = bio.replace('\n', ' ').replace('\r', ' ').strip()
    website_text = website_text.replace('\n', ' ').replace('\r', ' ').strip()

    # Create a clean prompt
    prompt = {
        "name": name,
        "username": username,
        "bio": bio,
        "followers": followers_count,
        "website_content": website_text
    }
    print(prompt)

    try:
        headers = {
            "Authorization": f"Bearer {GPT_API_KEY}",
            "Content-Type": "application/json"
        }
        
        system_prompt = """You are an AI that analyzes Instagram accounts to identify potential WHOP community creators.
        
Ideal candidates:
- An actual human/person is the face of the account and it's not just clips
- Not monetized through courses/info products
- Could benefit from starting a WHOP community

INVALID candidates:
- Mega-celebrities/actors/athletes (too famous to engage)
- Already selling courses/coaching/info products
- Pure entertainment/meme accounts/theme-pages/faceless accounts
- Company accounts
- No clear community engagement

Return a JSON object with:
- 'valid': boolean
- 'reason': detailed explanation of decision"""
        
        data = {
            "model": "gpt-4",  # Using GPT-4 for better analysis
            "messages": [
                {
                    "role": "system", 
                    "content": system_prompt
                },
                {
                    "role": "user", 
                    "content": json.dumps(prompt)
                }
            ],
            "max_tokens": 300,
            "temperature": 0.3
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(GPT_API_URL, headers=headers, json=data, timeout=30) as response:
                if response.status == 200:
                    result = await response.json()
                    try:
                        gpt_response = json.loads(result['choices'][0]['message']['content'])
                        return {
                            "valid": gpt_response.get("valid", False),
                            "reason": gpt_response.get("reason", "No reason provided"),
                            "community_focus": gpt_response.get("community_focus", "")
                        }
                    except json.JSONDecodeError:
                        print(f"Error parsing GPT response for {username}")
                        return None
                else:
                    print(f"GPT API error: {response.status}")
                    return None

    except Exception as e:
        print(f"Error in GPT validation: {str(e)}")
        return None

def calculate_total_accounts():
    """Calculate exact number of accounts that will be scraped based on branching"""
    total = 1  # Start account
    current_level_accounts = MAX_ACCOUNTS_PER_BRANCH  # First level
    
    for level in range(MAX_BRANCHES):
        total += current_level_accounts
        current_level_accounts *= MAX_ACCOUNTS_PER_BRANCH
    
    return total  # This will be exact based on the branching structure

class InstagramScraper:
    def __init__(self):
        self.scraped_accounts = {}
        self.browser = None
        self.context = None
        self._playwright = None
        self.processed_count = 0
        self.valid_count = 0
        self.invalid_count = 0
        self.accounts_to_process = []  # Queue of accounts to process
        self.pending_validations = []  # For end validation mode
        
        if VALIDATION_MODE != "none":
            self.init_csv_files()

    def init_csv_files(self):
        with open(VALID_ACCOUNTS_FILE, 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(['Username', 'Name', 'Followers', 'Reason', 'Community Focus'])
        with open(INVALID_ACCOUNTS_FILE, 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(['Username', 'Name', 'Followers', 'Reason'])

    async def __aenter__(self):
        await self.init_browser()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()

    async def init_browser(self):
        try:
            self._playwright = await async_playwright().start()
            print("Playwright started")
            
            self.browser = await self._playwright.chromium.launch(
                headless=False,
                args=['--disable-blink-features=AutomationControlled']
            )
            print("Browser launched")
            
            # Try to load saved session if it exists
            context_options = {
                'viewport': {'width': 1280, 'height': 800},
                'user_agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
            }
            
            if os.path.exists(STORAGE_STATE):
                print("Loading saved session...")
                context_options['storage_state'] = STORAGE_STATE
            
            self.context = await self.browser.new_context(**context_options)
            
            self.page = await self.context.new_page()
            print("New page created")
            
            # Add random delays between actions
            self.page.set_default_timeout(5000)
            self.page.set_default_navigation_timeout(5000)

            # Add stealth scripts
            await self.page.add_init_script("""
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined
                });
            """)
            print("Browser initialized successfully")
        except Exception as e:
            print(f"Failed to initialize browser: {str(e)}")
            await self.close()
            raise

    async def wait_for_manual_login(self):
        print("Please log in manually to Instagram...")
        print("Waiting for login to complete...")
        
        # Wait until we detect that we're logged in
        while True:
            try:
                # Check for elements that indicate we're logged in
                await self.page.wait_for_selector('svg[aria-label="Home"]', timeout=2000)
                print("Login detected! Saving session...")
                # Save the session after successful login
                await self.context.storage_state(path=STORAGE_STATE)
                print("Session saved!")
                return True
            except:
                await asyncio.sleep(1)
                continue

    async def login(self):
        if not self.page:
            print("Browser not initialized")
            return False

        try:
            print("Navigating to Instagram login page...")
            await self.page.goto("https://www.instagram.com/")
            
            # Check if we're already logged in
            try:
                await self.page.wait_for_selector('svg[aria-label="Home"]', timeout=5000)
                print("Already logged in!")
                return True
            except:
                print("Need to log in manually...")
                # Wait for manual login to complete
                return await self.wait_for_manual_login()

        except Exception as e:
            print(f"Error during login process: {str(e)}")
            return False

    async def get_followers_count(self, page):
        try:
            # Wait for the followers link to be visible
            followers_element = await page.wait_for_selector('a[href$="/followers/"]', timeout=5000)
            if followers_element:
                # Get the text content of the span with title attribute
                followers_text = await followers_element.evaluate('''(element) => {
                    const span = element.querySelector('span[title]');
                    return span ? span.getAttribute('title') : null;
                }''')
                if followers_text:
                    return convert_followers_to_number(followers_text)
        except Exception as e:
            print(f"Error getting followers count: {str(e)}")
        return 0

    async def get_account_info(self, page):
        try:
            # Wait for page load with shorter timeout
            await page.wait_for_load_state('networkidle', timeout=5000)
            
            # Get name first
            name_element = await page.query_selector('span.x1lliihq.x1plvlek.xryxfnj.x1n2onr6.x1ji0vk5.x18bv5gf.x193iq5w.xeuugli.x1fj9vlw.x13faqbe.x1vvkbs.x1s928wv.xhkezso.x1gmr53x.x1cpjm7i.x1fgarty.x1943h6x.x1i0vuye.xvs91rp.x1s688f.x5n08af.x10wh9bi.x1wdrske.x8viiok.x18hxmgj')
            name = await name_element.text_content() if name_element else ""
            
            # Check for bio (required)
            bio_element = await page.query_selector('span._ap3a._aaco._aacu._aacx._aad7._aade')
            if not bio_element:
                return {
                    'name': name,
                    'bio': "",
                    'website': None,
                    'website_text': "",
                    'followers_count': await self.get_followers_count(page),
                    'has_required_info': False,
                    'reason': "No bio found"
                }
            
            bio = await bio_element.text_content()
            
            # Check for link (optional) - look for both types of links
            website = None
            website_text = ""
            
            # Try to find clickable link first
            link_element = await page.query_selector('div.x3nfvp2.x193iq5w a')
            if link_element:
                website = await link_element.get_attribute('href')
            else:
                # Try to find text-based link
                text_link_element = await page.query_selector('div._ap3a._aaco._aacw._aacz._aada._aade')
                if text_link_element:
                    text_content = await text_link_element.text_content()
                    # Extract first word as URL if it looks like a URL
                    first_word = text_content.split()[0] if text_content else None
                    if first_word and ('.' in first_word or first_word.startswith('http')):
                        website = first_word
            
            # Get website content if we found a URL
            if website:
                website_page = await self.context.new_page()
                try:
                    # Add http if missing
                    if not website.startswith(('http://', 'https://')):
                        website = 'https://' + website
                        
                    await website_page.goto(website, timeout=10000, wait_until='domcontentloaded')
                    website_text = await website_page.evaluate('''() => {
                        const text = document.body.innerText;
                        return text ? text.substring(0, 2000) : "";
                    }''')
                    website_text = ' '.join(website_text.split())
                except Exception as e:
                    print(f"Error fetching website content: {str(e)}")
                finally:
                    await website_page.close()

            followers_count = await self.get_followers_count(page)

            return {
                'name': name,
                'bio': bio,
                'website': website,
                'website_text': website_text,
                'followers_count': followers_count,
                'has_required_info': True  # Bio exists, link is optional
            }
        except Exception as e:
            print(f"Error getting account info: {str(e)}")
            return None

    async def validate_account(self, username, account_info):
        if not account_info:
            self.invalid_count += 1
            self.save_to_csv(INVALID_ACCOUNTS_FILE, [username, "", 0, "Failed to get account info"])
            return False, "Failed to get account info"
            
        if not account_info.get('has_required_info', False):
            self.invalid_count += 1
            self.save_to_csv(INVALID_ACCOUNTS_FILE, [
                username, 
                account_info.get('name', ''), 
                account_info.get('followers_count', 0),
                account_info.get('reason', 'No bio found')
            ])
            return False, account_info.get('reason', 'No bio found')
            
        # Check if account is in following list
        try:
            if os.path.exists('account_following.json'):
                with open('account_following.json', 'r') as f:
                    following_data = json.load(f)
                    if username in following_data.get('following', []):
                        self.invalid_count += 1
                        self.save_to_csv(INVALID_ACCOUNTS_FILE, [
                            username,
                            account_info['name'],
                            account_info['followers_count'],
                            "Followed by hunter"
                        ])
                        return False, "Followed by hunter"
        except Exception as e:
            print(f"Error checking following list: {e}")
            
        if account_info['followers_count'] < MIN_FOLLOWERS:
            self.invalid_count += 1
            self.save_to_csv(INVALID_ACCOUNTS_FILE, [
                username,
                account_info['name'],
                account_info['followers_count'],
                "Insufficient followers"
            ])
            return False, "Insufficient followers"

        if VALIDATION_MODE == "none":
            self.valid_count += 1
            self.save_to_csv(VALID_ACCOUNTS_FILE, [
                username,
                account_info['name'],
                account_info['followers_count'],
                "Validation disabled",
                ""
            ])
            return True, "Validation disabled"
        elif VALIDATION_MODE == "end":
            self.pending_validations.append((username, account_info))
            return True, "Pending validation"
        else:  # immediate validation
            validation_result = await validate_with_gpt(
                account_info['name'],
                username,
                account_info['bio'],
                account_info['followers_count'],
                account_info['website_text']
            )
            
            if validation_result and validation_result['valid']:
                self.valid_count += 1
                self.save_to_csv(VALID_ACCOUNTS_FILE, [
                    username,
                    account_info['name'],
                    account_info['followers_count'],
                    validation_result['reason'],
                    validation_result.get('community_focus', '')
                ])
                return True, validation_result.get('community_focus', '')
            else:
                self.invalid_count += 1
                self.save_to_csv(INVALID_ACCOUNTS_FILE, [
                    username,
                    account_info['name'],
                    account_info['followers_count'],
                    validation_result['reason'] if validation_result else "Validation failed"
                ])
                return False, validation_result['reason'] if validation_result else "Validation failed"

    def save_to_csv(self, filename, row):
        try:
            with open(filename, 'a', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(row)
        except Exception as e:
            print(f"Error saving to CSV: {str(e)}")

    async def scrape_account(self, username, depth=0):
        if SEQUENTIAL_MODE and MAX_ACCOUNTS_TO_SCAN and self.processed_count >= MAX_ACCOUNTS_TO_SCAN:
            return

        try:
            page = await self.context.new_page()
            print(f"\n{'  ' * depth}📱 Navigating to profile: {username}")
            await page.goto(f"https://www.instagram.com/{username}/")
            
            account_info = await self.get_account_info(page)
            if not account_info:
                return

            is_valid, reason = await self.validate_account(username, account_info)
            self.processed_count += 1
            
            if is_valid and VALIDATION_MODE != "end":  # Only count as valid immediately if not in end mode
                print(f"{'  ' * depth}✅ Account {username} is valid - {reason}")
            else:
                print(f"{'  ' * depth}❌ Account {username} is invalid - {reason}")

            print(f"\nProgress: {self.processed_count} accounts processed")
            print(f"Valid: {self.valid_count} | Invalid: {self.invalid_count}")

            if username not in self.scraped_accounts:
                self.scraped_accounts[username] = {
                    "depth": depth,
                    "followers_count": account_info['followers_count'],
                    "suggested_accounts": []
                }

            # Get suggested accounts
            if depth < MAX_BRANCHES:
                print(f"{'  ' * depth}🔍 Looking for similar accounts...")
                await page.evaluate('() => { const svg = document.querySelector(\'svg[aria-label="Similar accounts"]\'); if (svg) svg.parentElement.click(); }')
                await asyncio.sleep(1)

                suggested_usernames = await page.evaluate('''() => {
                    return Array.from(document.querySelectorAll('div.x9f619.xjbqb8w.x78zum5.x168nmei.x13lgxp2.x5pf9jr.xo71vjh.x1uhb9sk.x1plvlek.xryxfnj.x1c4vz4f.x2lah0s.x1q0g3np.xqjyukv.x1qjc9v5.x1oa3qoh.xl56j7k'))
                        .slice(0, 5)
                        .map(container => {
                            const span = container.querySelector('a[role="link"] span.x1lliihq.x193iq5w.x6ikm8r.x10wlt62.xlyipyv.xuxw1ft');
                            return span ? span.textContent : null;
                        })
                        .filter(Boolean);
                }''')

                await page.keyboard.press('Escape')

                for suggested_username in suggested_usernames:
                    if suggested_username and suggested_username not in self.scraped_accounts:
                        print(f"{'  ' * depth}👤 Found suggested account: {suggested_username}")
                        self.scraped_accounts[username]["suggested_accounts"].append(suggested_username)
                        self.save_progress()
                        self.accounts_to_process.append((suggested_username, depth + 1))

        except Exception as e:
            print(f"{'  ' * depth}⚠️ Error scraping account {username}: {str(e)}")
        finally:
            await page.close()

    async def batch_validate_with_gpt(self, accounts_batch):
        """Validate multiple accounts at once using GPT batch API"""
        if not GPT_API_KEY:
            raise ValueError("OpenAI API key not found in environment variables")

        try:
            # Create a single prompt with all accounts
            accounts_data = []
            for username, account_info in accounts_batch:
                accounts_data.append({
                    "username": username,
                    "name": account_info['name'],
                    "bio": account_info['bio'],
                    "followers": account_info['followers_count'],
                    "website_content": account_info['website_text']
                })

            prompt = {
                "accounts": accounts_data,
                "task": "Analyze each account and determine if they are potential WHOP community creators"
            }

            system_prompt = """You are an AI that analyzes Instagram accounts to identify potential WHOP community creators.

Ideal candidates:
- An actual human/person is the face of the account and it's not just clips
- Not monetized through courses/info products
- Could benefit from starting a WHOP community

INVALID candidates:
- Mega-celebrities/actors/athletes (too famous to engage)
- Already selling courses/coaching/info products
- Pure entertainment/meme accounts/theme-pages/faceless accounts
- Company accounts
- No clear community engagement

Return a JSON array of results in this exact format:
{
    "results": [
        {
            "username": "username1",
            "valid": boolean,
            "reason": "detailed explanation",
            "community_focus": "optional field for valid accounts"
        },
        // ... more results
    ]
}"""

            headers = {
                "Authorization": f"Bearer {GPT_API_KEY}",
                "Content-Type": "application/json"
            }

            data = {
                "model": "gpt-4",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": json.dumps(prompt)}
                ],
                "max_tokens": 500 * len(accounts_batch),
                "temperature": 0.3
            }

            async with aiohttp.ClientSession() as session:
                async with session.post(GPT_API_URL, headers=headers, json=data, timeout=60) as response:
                    if response.status == 200:
                        result = await response.json()
                        try:
                            gpt_response = json.loads(result['choices'][0]['message']['content'])
                            
                            # Process each result
                            for validation in gpt_response['results']:
                                username = validation['username']
                                account_info = next((info for u, info in accounts_batch if u == username), None)
                                
                                if not account_info:
                                    continue
                                    
                                if validation['valid']:
                                    self.valid_count += 1
                                    self.save_to_csv(VALID_ACCOUNTS_FILE, [
                                        username,
                                        account_info['name'],
                                        account_info['followers_count'],
                                        validation['reason'],
                                        validation.get('community_focus', '')
                                    ])
                                else:
                                    self.invalid_count += 1
                                    self.save_to_csv(INVALID_ACCOUNTS_FILE, [
                                        username,
                                        account_info['name'],
                                        account_info['followers_count'],
                                        validation['reason']
                                    ])
                                    
                        except (json.JSONDecodeError, KeyError, IndexError) as e:
                            print(f"Error processing GPT batch response: {str(e)}")
                            # Handle failed batch by marking all as invalid
                            for username, account_info in accounts_batch:
                                self.invalid_count += 1
                                self.save_to_csv(INVALID_ACCOUNTS_FILE, [
                                    username,
                                    account_info['name'],
                                    account_info['followers_count'],
                                    "Error processing GPT response"
                                ])
                    else:
                        print(f"GPT API error: {response.status}")
                        # Mark all as invalid on API error
                        for username, account_info in accounts_batch:
                            self.invalid_count += 1
                            self.save_to_csv(INVALID_ACCOUNTS_FILE, [
                                username,
                                account_info['name'],
                                account_info['followers_count'],
                                f"GPT API error: {response.status}"
                            ])

        except Exception as e:
            print(f"Error in batch GPT validation: {str(e)}")
            # Mark all as invalid on any error
            for username, account_info in accounts_batch:
                self.invalid_count += 1
                self.save_to_csv(INVALID_ACCOUNTS_FILE, [
                    username,
                    account_info['name'],
                    account_info['followers_count'],
                    f"Error in batch validation: {str(e)}"
                ])

    async def process_accounts(self):
        """Process accounts based on mode configuration"""
        await self.scrape_account(START_ACCOUNT, 0)
        
        if SEQUENTIAL_MODE:
            while self.accounts_to_process:
                if MAX_ACCOUNTS_TO_SCAN and self.processed_count >= MAX_ACCOUNTS_TO_SCAN:
                    break
                username, depth = self.accounts_to_process.pop(0)
                if username not in self.scraped_accounts:
                    await self.scrape_account(username, depth)

        if VALIDATION_MODE == "end" and self.pending_validations:
            print("\n🤖 Processing batch validations...")
            # Process validations in batches of 10
            batch_size = 10
            for i in range(0, len(self.pending_validations), batch_size):
                batch = self.pending_validations[i:i + batch_size]
                print(f"\nValidating batch {i//batch_size + 1} of {(len(self.pending_validations) + batch_size - 1)//batch_size}")
                await self.batch_validate_with_gpt(batch)

    def save_progress(self):
        with open(OUTPUT_FILE, 'w') as f:
            json.dump(self.scraped_accounts, f, indent=2)

    async def close(self):
        if self.context:
            await self.context.close()
        if self.browser:
            await self.browser.close()
        if self._playwright:
            await self._playwright.stop()
        print("\nAll resources closed properly")

async def main():
    try:
        print(WHOP_LOGO)
        print("\n🚀 WHOP Instagram Scraper v1.0")
        print("=" * 50)
        
        print(f"\n📊 Scraping Configuration:")
        print(f"Starting Account: {START_ACCOUNT}")
        print(f"Mode: {'Sequential' if SEQUENTIAL_MODE else 'Parallel'}")
        print(f"Max Accounts: {MAX_ACCOUNTS_TO_SCAN if MAX_ACCOUNTS_TO_SCAN else 'Unlimited'}")
        print(f"Validation: {VALIDATION_MODE}")
        print(f"Minimum Followers: {MIN_FOLLOWERS:,}")
        print("=" * 50)

        async with InstagramScraper() as scraper:
            print("\n🔑 Logging in to Instagram...")
            if await scraper.login():
                await scraper.process_accounts()
                
                print("\n✨ Scraping completed!")
                print("=" * 50)
                print(f"Total Processed: {scraper.processed_count}")
                print(f"Valid Accounts: {scraper.valid_count}")
                print(f"Invalid Accounts: {scraper.invalid_count}")
                print("=" * 50)
    except Exception as e:
        print(f"\n❌ An error occurred: {str(e)}")

if __name__ == "__main__":
    asyncio.run(main()) 