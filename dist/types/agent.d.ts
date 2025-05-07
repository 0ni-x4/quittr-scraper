export interface AgentConfig {
    threadCount: number;
    maxRetries: number;
    timeoutMs: number;
}
export interface AgentResult {
    success: boolean;
    data: any;
    error?: Error;
}
export interface Agent {
    execute(): Promise<AgentResult>;
    stop(): void;
    isRunning(): boolean;
}
export type AgentStatus = 'idle' | 'running' | 'completed' | 'failed';
export interface AgentMetrics {
    startTime: Date;
    endTime?: Date;
    processedItems: number;
    errors: Error[];
    status: AgentStatus;
}
