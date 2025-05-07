import { Agent, AgentConfig, AgentResult, AgentMetrics, AgentStatus } from '../types/agent';

export abstract class BaseAgent implements Agent {
  protected metrics: AgentMetrics;
  protected status: AgentStatus;
  protected readonly threadCount: number;

  constructor(config: AgentConfig) {
    this.threadCount = config.threadCount;
    this.metrics = {
      processedItems: 0,
      errors: []
    };
    this.status = AgentStatus.IDLE;
  }

  abstract getItems(): Promise<any[]>;
  abstract processItem(item: any): Promise<any>;

  public getMetrics(): AgentMetrics {
    return this.metrics;
  }

  public getStatus(): AgentStatus {
    return this.status;
  }

  protected async processItems(items: any[]): Promise<void> {
    const chunks = this.chunkArray(items, this.threadCount);
    
    for (const chunk of chunks) {
      await Promise.all(chunk.map(item => this.processItem(item)));
    }
  }

  protected chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  public async execute(): Promise<AgentResult> {
    try {
      this.status = AgentStatus.RUNNING;
      const items = await this.getItems();
      await this.processItems(items);
      
      this.status = AgentStatus.STOPPED;
      return {
        success: true,
        data: this.metrics
      };
    } catch (error) {
      this.status = AgentStatus.ERROR;
      const err = error instanceof Error ? error : new Error(String(error));
      this.metrics.errors.push(err);
      
      return {
        success: false,
        error: err,
        data: this.metrics
      };
    }
  }

  public async stop(): Promise<void> {
    this.status = AgentStatus.STOPPED;
  }
} 