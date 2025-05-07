import { AgentResult } from './types/agent';
export declare class MasterAgent {
    private scraperAgent;
    private evaluatorAgent;
    private outreachAgent;
    private running;
    constructor();
    execute(): Promise<AgentResult>;
    stop(): void;
    isRunning(): boolean;
}
