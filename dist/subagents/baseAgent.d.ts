import { Agent, AgentConfig, AgentResult, AgentMetrics, AgentStatus } from '../types/agent';
export declare abstract class BaseAgent<T> implements Agent {
    protected metrics: AgentMetrics;
    protected status: AgentStatus;
    protected readonly threadCount: number;
    constructor(config: AgentConfig);
    abstract getItems(): Promise<T[]>;
    abstract processItem(item: T): Promise<any>;
    getMetrics(): AgentMetrics;
    getStatus(): AgentStatus;
    protected processItems(items: T[]): Promise<void>;
    protected chunkArray<T>(array: T[], size: number): T[][];
    execute(): Promise<AgentResult>;
    stop(): Promise<void>;
}
//# sourceMappingURL=baseAgent.d.ts.map