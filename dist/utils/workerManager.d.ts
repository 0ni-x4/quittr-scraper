export interface WorkerConfig {
    maxWorkers?: number;
    maxMemoryPercent?: number;
    idleTimeout?: number;
}
export declare class WorkerManager {
    private workers;
    private workerScriptPath;
    private config;
    private totalSystemMemory;
    constructor(workerScriptPath: string, config?: WorkerConfig);
    private createWorker;
    executeTask<T>(data: any): Promise<T>;
    shutdown(): Promise<void>;
    getActiveWorkers(): number;
    getMemoryUsage(): {
        total: number;
        perWorker: number[];
    };
}
