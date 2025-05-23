import { AgentResult, ScraperTarget, ScrapedData } from '../types/agent';
import { BaseAgent } from './baseAgent';
export declare class ScraperAgent extends BaseAgent<ScraperTarget> {
    private browser;
    private context;
    private mainPage;
    private targets;
    private processedUsernames;
    private readonly maxSuggestedAccounts;
    private readonly maxDepth;
    private readonly timeoutMs;
    private isLoggedIn;
    constructor(options: {
        threadCount: number;
        timeoutMs: number;
    });
    getItems(): Promise<ScraperTarget[]>;
    initBrowser(): Promise<void>;
    verifyLogin(): Promise<boolean>;
    private scrapeInstagramProfile;
    setReferenceAccount(username: string): Promise<void>;
    private getSuggestedAccounts;
    private expandTargetsWithSuggestions;
    processItem(target: ScraperTarget): Promise<ScrapedData>;
    execute(): Promise<AgentResult>;
    stop(): Promise<void>;
}
//# sourceMappingURL=scraperAgent.d.ts.map