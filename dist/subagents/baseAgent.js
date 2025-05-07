"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseAgent = void 0;
class BaseAgent {
    constructor(config) {
        this.running = false;
        this.workers = [];
        this.config = config;
        this.metrics = {
            startTime: new Date(),
            processedItems: 0,
            errors: [],
            status: 'idle'
        };
    }
    async worker(items) {
        for (const item of items) {
            if (!this.running)
                break;
            try {
                await this.processItem(item);
                this.metrics.processedItems++;
            }
            catch (error) {
                this.metrics.errors.push(error);
                if (this.metrics.errors.length >= this.config.maxRetries) {
                    throw error;
                }
            }
        }
    }
    async execute() {
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
        }
        catch (error) {
            this.metrics.status = 'failed';
            this.metrics.endTime = new Date();
            return {
                success: false,
                error: error,
                data: {
                    processedItems: this.metrics.processedItems,
                    errors: this.metrics.errors
                }
            };
        }
        finally {
            this.running = false;
        }
    }
    stop() {
        this.running = false;
    }
    isRunning() {
        return this.running;
    }
}
exports.BaseAgent = BaseAgent;
//# sourceMappingURL=baseAgent.js.map