import { Worker } from 'worker_threads';
import * as os from 'os';

export interface WorkerConfig {
  maxWorkers?: number;
  maxMemoryPercent?: number; // Maximum memory usage per worker as percentage of total system memory
  idleTimeout?: number; // Time in ms to keep idle workers alive
}

export class WorkerManager {
  private workers: Worker[] = [];
  private workerScriptPath: string;
  private config: Required<WorkerConfig>;
  private totalSystemMemory: number;
  
  constructor(workerScriptPath: string, config: WorkerConfig = {}) {
    this.workerScriptPath = workerScriptPath;
    this.totalSystemMemory = os.totalmem();
    
    // Default configuration
    this.config = {
      maxWorkers: os.cpus().length - 1, // Leave one core for main thread
      maxMemoryPercent: 80, // 80% of system memory
      idleTimeout: 60000, // 1 minute
      ...config
    };
  }

  private async createWorker(): Promise<Worker> {
    const worker = new Worker(this.workerScriptPath);
    
    // Monitor worker memory usage
    const interval = setInterval(() => {
      const usage = process.memoryUsage();
      const workerMemory = usage.heapTotal + usage.external;
      const maxAllowedMemory = (this.totalSystemMemory * this.config.maxMemoryPercent) / 100;
      
      if (workerMemory > maxAllowedMemory) {
        console.warn(`Worker memory usage exceeded limit. Terminating worker.`);
        worker.terminate();
        clearInterval(interval);
      }
    }, 1000);

    // Clean up interval when worker exits
    worker.on('exit', () => {
      clearInterval(interval);
      this.workers = this.workers.filter(w => w !== worker);
    });

    this.workers.push(worker);
    return worker;
  }

  public async executeTask<T>(data: any): Promise<T> {
    // Find available worker or create new one if under limit
    let worker: Worker | undefined;
    
    if (this.workers.length < this.config.maxWorkers) {
      worker = await this.createWorker();
    } else {
      // Wait for an available worker
      worker = this.workers[0]; // Simple round-robin for now
    }

    return new Promise((resolve, reject) => {
      worker.on('message', resolve);
      worker.on('error', reject);
      worker.postMessage(data);
    });
  }

  public async shutdown(): Promise<void> {
    await Promise.all(this.workers.map(worker => worker.terminate()));
    this.workers = [];
  }

  public getActiveWorkers(): number {
    return this.workers.length;
  }

  public getMemoryUsage(): { total: number, perWorker: number[] } {
    return {
      total: process.memoryUsage().heapTotal,
      perWorker: this.workers.map(() => process.memoryUsage().heapTotal / this.workers.length) // Approximate
    };
  }
} 