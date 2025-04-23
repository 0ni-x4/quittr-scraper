import { Agent, AgentConfig, AgentResult, AgentMetrics, AgentStatus } from '../types/agent';

export abstract class BaseAgent implements Agent {
  protected config: AgentConfig;
  protected running: boolean = false;
  protected metrics: AgentMetrics;
  protected workers: Promise<void>[] = [];

  constructor(config: AgentConfig) {
    this.config = config;
    this.metrics = {
      startTime: new Date(),
      processedItems: 0,
      errors: [],
      status: 'idle'
    };
  }

  abstract processItem(item: any): Promise<any>;
  abstract getItems(): Promise<any[]>;

  protected async worker(items: any[]): Promise<void> {
    for (const item of items) {
      if (!this.running) break;
      
      try {
        await this.processItem(item);
        this.metrics.processedItems++;
      } catch (error) {
        this.metrics.errors.push(error as Error);
        if (this.metrics.errors.length >= this.config.maxRetries) {
          throw error;
        }
      }
    }
  }

  public async execute(): Promise<AgentResult> {
    try {
      this.running = true;
      this.metrics.status = 'running';
      this.metrics.startTime = new Date();

      const items = await this.getItems();
      const itemsPerThread = Math.ceil(items.length / this.config.threadCount);
      
      for (let i = 0; i < this.config.threadCount; i++) {
        const start = i * itemsPerThread;
        const end = Math.min(start + itemsPerThread, items.length);
        const threadItems = items.slice(start, end);
        
        if (threadItems.length > 0) {
          this.workers.push(this.worker(threadItems));
        }
      }

      await Promise.all(this.workers);
      
      this.metrics.status = 'completed';
      this.metrics.endTime = new Date();
      
      return {
        success: true,
        data: {
          processedItems: this.metrics.processedItems,
          errors: this.metrics.errors
        }
      };
    } catch (error) {
      this.metrics.status = 'failed';
      this.metrics.endTime = new Date();
      
      return {
        success: false,
        error: error as Error,
        data: {
          processedItems: this.metrics.processedItems,
          errors: this.metrics.errors
        }
      };
    } finally {
      this.running = false;
    }
  }

  public stop(): void {
    this.running = false;
  }

  public isRunning(): boolean {
    return this.running;
  }
} 