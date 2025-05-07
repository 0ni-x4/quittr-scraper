interface LogEntry {
    timestamp: Date;
    agent: string;
    message: string;
    level: 'info' | 'warning' | 'error';
}
interface AgentMetrics {
    tasksCompleted: number;
    successRate: number;
    progress: number;
    lastUpdated: Date;
}
interface AgentState {
    status: 'idle' | 'running' | 'error' | 'paused';
    logs: LogEntry[];
    metrics: AgentMetrics;
    error?: Error;
}
interface Agents {
    scraper: AgentState;
    evaluator: AgentState;
    outreach: AgentState;
}
interface AgentStore {
    agents: Agents;
    isRunning: boolean;
    addLog: (agent: string, message: string, level?: LogEntry['level']) => void;
    setAgentStatus: (agent: keyof Agents, status: AgentState['status']) => void;
    updateMetrics: (agent: keyof Agents, metrics: Partial<AgentMetrics>) => void;
    startAgents: () => Promise<void>;
    stopAgents: () => void;
    restartAgent: (agent: keyof Agents) => Promise<void>;
}
export declare const useAgentStore: import("zustand").UseBoundStore<import("zustand").StoreApi<AgentStore>>;
export {};
