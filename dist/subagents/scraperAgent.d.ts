import { AgentResult, ScraperTarget, ScrapedData } from '../types/agent';
import { BaseAgent } from './baseAgent';
export declare class ScraperAgent extends BaseAgent<ScraperTarget> {
    private browser;
    private context;
    private mainPage;
    private targets;
    private processedUsernames;
    private readonly timeoutMs;
    private isLoggedIn;
    private accountsToProcess;
    private scrapedAccounts;
    private processedCount;
    private readonly maxAccountsToScan;
    private readonly minFollowers;
    constructor(options: {
        threadCount: number;
        timeoutMs: number;
    });
    getItems(): Promise<ScraperTarget[]>;
    getScrapedData(): ScrapedData[];
    initBrowser(): Promise<void>;
    verifyLogin(): Promise<boolean>;
    private waitForManualLogin;
    private convertFollowersToNumber;
    private getAccountInfo;
    private getSuggestedAccounts;
    private scrapeInstagramProfile;
    setReferenceAccount(username: string): Promise<void>;
    processItem(target: ScraperTarget): Promise<ScrapedData>;
    private processAccounts;
    execute(): Promise<AgentResult>;
    stop(): Promise<void>;
}
//# sourceMappingURL=scraperAgent.d.ts.map