import { BrowserContext } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

interface AccountState {
  username: string;
  dmCount: number;
  lastUsed: Date;
  isRateLimited: boolean;
}

export class CookieManager {
  private cookiesDir: string;
  private accountStatesFile: string;
  private accountStates: Map<string, AccountState>;
  private readonly MAX_DMS_PER_DAY = 50;

  constructor() {
    this.cookiesDir = path.join(process.cwd(), 'cookies');
    this.accountStatesFile = path.join(process.cwd(), 'accountStates.json');
    this.accountStates = new Map();
    this.initializeDirectories();
    this.loadAccountStates();
  }

  private initializeDirectories() {
    if (!fs.existsSync(this.cookiesDir)) {
      fs.mkdirSync(this.cookiesDir, { recursive: true });
    }
  }

  private loadAccountStates() {
    try {
      if (fs.existsSync(this.accountStatesFile)) {
        const states = JSON.parse(fs.readFileSync(this.accountStatesFile, 'utf-8'));
        Object.entries(states).forEach(([username, state]) => {
          this.accountStates.set(username, {
            ...state as AccountState,
            lastUsed: new Date((state as AccountState).lastUsed)
          });
        });
      }
    } catch (error) {
      console.error('Error loading account states:', error);
    }
  }

  private saveAccountStates() {
    const states = Object.fromEntries(this.accountStates.entries());
    fs.writeFileSync(this.accountStatesFile, JSON.stringify(states, null, 2));
  }

  async saveCookies(context: BrowserContext, username: string) {
    const cookies = await context.cookies();
    const cookiePath = path.join(this.cookiesDir, `${username}.json`);
    fs.writeFileSync(cookiePath, JSON.stringify(cookies));
  }

  async loadCookies(context: BrowserContext, username: string): Promise<boolean> {
    const cookiePath = path.join(this.cookiesDir, `${username}.json`);
    try {
      if (fs.existsSync(cookiePath)) {
        const cookies = JSON.parse(fs.readFileSync(cookiePath, 'utf-8'));
        await context.addCookies(cookies);
        return true;
      }
    } catch (error) {
      console.error(`Error loading cookies for ${username}:`, error);
    }
    return false;
  }

  getAvailableAccount(): string | null {
    const now = new Date();
    for (const [username, state] of this.accountStates.entries()) {
      // Reset DM count if it's a new day
      if (now.getDate() !== new Date(state.lastUsed).getDate()) {
        state.dmCount = 0;
        state.isRateLimited = false;
      }

      if (!state.isRateLimited && state.dmCount < this.MAX_DMS_PER_DAY) {
        return username;
      }
    }
    return null;
  }

  incrementDMCount(username: string) {
    const state = this.accountStates.get(username);
    if (state) {
      state.dmCount++;
      state.lastUsed = new Date();
      if (state.dmCount >= this.MAX_DMS_PER_DAY) {
        state.isRateLimited = true;
      }
      this.saveAccountStates();
    }
  }

  markAsRateLimited(username: string) {
    const state = this.accountStates.get(username);
    if (state) {
      state.isRateLimited = true;
      state.lastUsed = new Date();
      this.saveAccountStates();
    }
  }

  addAccount(username: string) {
    if (!this.accountStates.has(username)) {
      this.accountStates.set(username, {
        username,
        dmCount: 0,
        lastUsed: new Date(),
        isRateLimited: false
      });
      this.saveAccountStates();
    }
  }
} 