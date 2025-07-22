export interface ScrapedData {
  username: string;
  platform: string;
  content: string;
  metadata: Record<string, any>;
  timestamp: Date;
  url?: string;
  reels?: Array<{ url: string; views: string }>;
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
  scrapedAccounts?: Record<string, any>;
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

export enum AgentStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  STOPPED = 'stopped',
  ERROR = 'error'
}

export interface Agent {
  execute(): Promise<AgentResult>;
  stop(): Promise<void>;
  getMetrics(): AgentMetrics;
  getStatus(): AgentStatus;
} 