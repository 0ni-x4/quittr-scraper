"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseAgent = void 0;
const agent_1 = require("../types/agent");
class BaseAgent {
    constructor(config) {
        this.threadCount = config.threadCount;
        this.metrics = {
            processedItems: 0,
            errors: []
        };
        this.status = agent_1.AgentStatus.IDLE;
    }
    getMetrics() {
        return this.metrics;
    }
    getStatus() {
        return this.status;
    }
    async processItems(items) {
        for (const item of items) {
            try {
                await this.processItem(item);
            }
            catch (error) {
                console.error(`Error processing item ${item}:`, error);
                // Don't throw here, continue processing other items
            }
        }
    }
    chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }
    async execute() {
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
        }
        catch (error) {
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
    async stop() {
        this.status = agent_1.AgentStatus.STOPPED;
    }
}
exports.BaseAgent = BaseAgent;
//# sourceMappingURL=baseAgent.js.map