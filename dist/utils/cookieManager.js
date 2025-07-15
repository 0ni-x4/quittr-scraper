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
exports.CookieManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const settingsStore_1 = require("@/stores/settingsStore");
class CookieManager {
    constructor() {
        this.MAX_DMS_PER_DAY = 50;
        this.cookies = [];
        this.cookiesDir = path.join(process.cwd(), 'cookies');
        this.accountStatesFile = path.join(process.cwd(), 'accountStates.json');
        this.accountStates = new Map();
        this.initializeDirectories();
        this.loadAccountStates();
    }
    static getInstance() {
        if (!CookieManager.instance) {
            CookieManager.instance = new CookieManager();
        }
        return CookieManager.instance;
    }
    initializeDirectories() {
        if (!fs.existsSync(this.cookiesDir)) {
            fs.mkdirSync(this.cookiesDir, { recursive: true });
        }
    }
    loadAccountStates() {
        try {
            if (fs.existsSync(this.accountStatesFile)) {
                const states = JSON.parse(fs.readFileSync(this.accountStatesFile, 'utf-8'));
                Object.entries(states).forEach(([username, state]) => {
                    this.accountStates.set(username, {
                        ...state,
                        lastUsed: new Date(state.lastUsed)
                    });
                });
            }
        }
        catch (error) {
            console.error('Error loading account states:', error);
        }
    }
    saveAccountStates() {
        const states = Object.fromEntries(this.accountStates.entries());
        fs.writeFileSync(this.accountStatesFile, JSON.stringify(states, null, 2));
    }
    async saveCookies(context, username) {
        const cookies = await context.cookies();
        const cookiePath = path.join(this.cookiesDir, `${username}.json`);
        fs.writeFileSync(cookiePath, JSON.stringify(cookies));
    }
    async loadCookies(context, username) {
        const cookiePath = path.join(this.cookiesDir, `${username}.json`);
        try {
            if (fs.existsSync(cookiePath)) {
                const cookies = JSON.parse(fs.readFileSync(cookiePath, 'utf-8'));
                await context.addCookies(cookies);
                return true;
            }
        }
        catch (error) {
            console.error(`Error loading cookies for ${username}:`, error);
        }
        return false;
    }
    async initializeCookies() {
        const settings = settingsStore_1.useSettingsStore.getState().settings;
        // Set up default cookies
        this.cookies = [
            {
                name: 'csrftoken',
                value: settings.instagramCsrfToken || '',
                domain: '.instagram.com',
                path: '/',
                expires: Math.floor(Date.now() / 1000) + (2 * 365 * 24 * 60 * 60), // 2 years
                httpOnly: false,
                secure: true,
                sameSite: 'Lax'
            },
            {
                name: 'sessionid',
                value: settings.instagramSessionId || '',
                domain: '.instagram.com',
                path: '/',
                expires: Math.floor(Date.now() / 1000) + (2 * 365 * 24 * 60 * 60), // 2 years
                httpOnly: true,
                secure: true,
                sameSite: 'Lax'
            }
        ];
        this.csrfToken = settings.instagramCsrfToken;
    }
    getCookies() {
        return this.cookies;
    }
    getCsrfToken() {
        return this.csrfToken;
    }
    async verifyLoginStatus() {
        try {
            // Check if we have valid cookies
            if (!this.cookies.some(cookie => cookie.name === 'sessionid' && cookie.value)) {
                console.log('Login status: No valid session cookie found');
                return false;
            }
            // You could add additional verification here, like making a test request
            // to Instagram's API to verify the session is still valid
            return true;
        }
        catch (error) {
            console.error('Error verifying login status:', error);
            return false;
        }
    }
    async updateCookies(newCookies) {
        this.cookies = newCookies;
        // Update CSRF token if present in new cookies
        const csrfCookie = newCookies.find(cookie => cookie.name === 'csrftoken');
        if (csrfCookie) {
            this.csrfToken = csrfCookie.value;
        }
        // Update settings store with new values
        const settings = settingsStore_1.useSettingsStore.getState();
        settings.updateSettings({
            instagramCsrfToken: this.csrfToken || '',
            instagramSessionId: newCookies.find(cookie => cookie.name === 'sessionid')?.value || ''
        });
    }
    getAvailableAccount() {
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
    incrementDMCount(username) {
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
    markAsRateLimited(username) {
        const state = this.accountStates.get(username);
        if (state) {
            state.isRateLimited = true;
            state.lastUsed = new Date();
            this.saveAccountStates();
        }
    }
    addAccount(username) {
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
exports.CookieManager = CookieManager;
//# sourceMappingURL=cookieManager.js.map