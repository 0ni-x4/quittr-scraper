import { Agent, AgentConfig, AgentResult, AgentMetrics, AgentStatus } from '../types/agent';

export abstract class BaseAgent<T> implements Agent {
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

  abstract getItems(): Promise<T[]>;
  abstract processItem(item: T): Promise<any>;

  public getMetrics(): AgentMetrics {
    return this.metrics;
  }

  public getStatus(): AgentStatus {
    return this.status;
  }

  protected async processItems(items: T[]): Promise<void> {
    for (const item of items) {
      try {
        await this.processItem(item);
      } catch (error) {
        console.error(`Error processing item ${item}:`, error);
        // Don't throw here, continue processing other items
      }
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
      const items = await this.getItems();
      await this.processItems(items);
      return {
        success: true,
        data: {
          processedItems: items.length,
          errors: []
        }
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return {
        success: false,
        error: err,
        data: {
          processedItems: 0,
          errors: [err]
        }
      };
    }
  }

  public async stop(): Promise<void> {
    this.status = AgentStatus.STOPPED;
  }
} 