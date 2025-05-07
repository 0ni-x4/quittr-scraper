import { AgentResult } from '../types/agent';
import { BaseAgent } from './baseAgent';
interface ScraperTarget {
    username: string;
    platform: string;
    keywords: string[];
    isReferenceAccount?: boolean;
}
interface ScrapedData {
    username: string;
    platform: string;
    content: string;
    metadata: Record<string, any>;
    timestamp: Date;
}
export declare class ScraperAgent extends BaseAgent {
    private browser;
    private context;
    private mainPage;
    private targets;
    private processedUsernames;
    private readonly maxSuggestedAccounts;
    private readonly maxDepth;
    private readonly maxRetries;
    private readonly timeoutMs;
    private isLoggedIn;
    constructor(options: {
        threadCount: number;
        maxRetries: number;
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
export {};
