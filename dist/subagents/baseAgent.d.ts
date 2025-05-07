import { Agent, AgentConfig, AgentResult, AgentMetrics } from '../types/agent';
export declare abstract class BaseAgent implements Agent {
    protected config: AgentConfig;
    protected running: boolean;
    protected metrics: AgentMetrics;
    protected workers: Promise<void>[];
    constructor(config: AgentConfig);
    abstract processItem(item: any): Promise<any>;
    abstract getItems(): Promise<any[]>;
    protected worker(items: any[]): Promise<void>;
    execute(): Promise<AgentResult>;
    stop(): void;
    isRunning(): boolean;
}
