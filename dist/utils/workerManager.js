"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerManager = void 0;
const worker_threads_1 = require("worker_threads");
const os = __importStar(require("os"));
class WorkerManager {
    constructor(workerScriptPath, config = {}) {
        this.workers = [];
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
    async createWorker() {
        const worker = new worker_threads_1.Worker(this.workerScriptPath);
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
    async executeTask(data) {
        // Find available worker or create new one if under limit
        let worker;
        if (this.workers.length < this.config.maxWorkers) {
            worker = await this.createWorker();
        }
        else {
            // Wait for an available worker
            worker = this.workers[0]; // Simple round-robin for now
        }
        return new Promise((resolve, reject) => {
            worker.on('message', resolve);
            worker.on('error', reject);
            worker.postMessage(data);
        });
    }
    async shutdown() {
        await Promise.all(this.workers.map(worker => worker.terminate()));
        this.workers = [];
    }
    getActiveWorkers() {
        return this.workers.length;
    }
    getMemoryUsage() {
        return {
            total: process.memoryUsage().heapTotal,
            perWorker: this.workers.map(() => process.memoryUsage().heapTotal / this.workers.length) // Approximate
        };
    }
}
exports.WorkerManager = WorkerManager;
