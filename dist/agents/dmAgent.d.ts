import { MessageManager } from '../utils/messageManager';
interface DMAgentConfig {
    accounts: {
        username: string;
        password: string;
    }[];
    messageTemplate: string;
}
export declare class DMAgent {
    private cookieManager;
    private messageManager;
    private config;
    private currentUsername;
    private browser;
    private context;
    private page;
    constructor(config: DMAgentConfig);
    private login;
    private extractProfileData;
    private switchAccount;
    private sendDM;
    processProfile(username: string): Promise<boolean>;
    start(): Promise<void>;
    stop(): Promise<void>;
    getMessageManager(): MessageManager;
}
export {};
