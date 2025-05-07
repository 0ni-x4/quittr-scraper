import { BrowserContext } from 'playwright';
export declare class CookieManager {
    private cookiesDir;
    private accountStatesFile;
    private accountStates;
    private readonly MAX_DMS_PER_DAY;
    constructor();
    private initializeDirectories;
    private loadAccountStates;
    private saveAccountStates;
    saveCookies(context: BrowserContext, username: string): Promise<void>;
    loadCookies(context: BrowserContext, username: string): Promise<boolean>;
    getAvailableAccount(): string | null;
    incrementDMCount(username: string): void;
    markAsRateLimited(username: string): void;
    addAccount(username: string): void;
}
