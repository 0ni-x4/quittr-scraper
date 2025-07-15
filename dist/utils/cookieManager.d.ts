import { BrowserContext } from 'playwright';
export interface InstagramCookie {
    name: string;
    value: string;
    domain: string;
    path: string;
    expires: number;
    httpOnly: boolean;
    secure: boolean;
    sameSite: string;
}
export declare class CookieManager {
    private cookiesDir;
    private accountStatesFile;
    private accountStates;
    private readonly MAX_DMS_PER_DAY;
    private static instance;
    private cookies;
    private csrfToken;
    private constructor();
    static getInstance(): CookieManager;
    private initializeDirectories;
    private loadAccountStates;
    private saveAccountStates;
    saveCookies(context: BrowserContext, username: string): Promise<void>;
    loadCookies(context: BrowserContext, username: string): Promise<boolean>;
    initializeCookies(): Promise<void>;
    getCookies(): InstagramCookie[];
    getCsrfToken(): string | undefined;
    verifyLoginStatus(): Promise<boolean>;
    updateCookies(newCookies: InstagramCookie[]): Promise<void>;
    getAvailableAccount(): string | null;
    incrementDMCount(username: string): void;
    markAsRateLimited(username: string): void;
    addAccount(username: string): void;
}
//# sourceMappingURL=cookieManager.d.ts.map