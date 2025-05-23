export interface ScrapedData {
    username: string;
    platform: string;
    content: string;
    metadata: Record<string, any>;
    timestamp: Date;
    url?: string;
}
export interface ScraperTarget {
    username: string;
    platform: string;
    keywords: string[];
    isReferenceAccount?: boolean;
    url?: string;
}
export interface AgentMetrics {
    processedItems: number;
    errors: Error[];
}
export interface AgentResult {
    success: boolean;
    error?: Error;
    data: AgentMetrics;
}
export interface AgentConfig {
    threadCount: number;
    maxRetries: number;
    timeoutMs: number;
}
export declare enum AgentStatus {
    IDLE = "idle",
    RUNNING = "running",
    STOPPED = "stopped",
    ERROR = "error"
}
export interface Agent {
    execute(): Promise<AgentResult>;
    stop(): Promise<void>;
    getMetrics(): AgentMetrics;
    getStatus(): AgentStatus;
}
//# sourceMappingURL=agent.d.ts.map