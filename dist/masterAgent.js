"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MasterAgent = void 0;
const scraperAgent_1 = require("./subagents/scraperAgent");
const evaluatorAgent_1 = require("./subagents/evaluatorAgent");
const outreachAgent_1 = require("./subagents/outreachAgent");
class MasterAgent {
    constructor() {
        this.running = false;
        const defaultConfig = {
            threadCount: 3,
            maxRetries: 3,
            timeoutMs: 30000
        };
        this.scraperAgent = new scraperAgent_1.ScraperAgent(defaultConfig);
        this.evaluatorAgent = new evaluatorAgent_1.EvaluatorAgent(defaultConfig);
        this.outreachAgent = new outreachAgent_1.OutreachAgent(defaultConfig);
    }
    async execute() {
        try {
            this.running = true;
            console.log('Starting AI Influencer Agent workflow...');
            // Step 1: Run the scraper
            console.log('Running scraper agent...');
            const scraperResult = await this.scraperAgent.execute();
            if (!scraperResult.success) {
                throw new Error(`Scraper agent failed: ${scraperResult.error?.message}`);
            }
            // Step 2: Run the evaluator on scraped data
            console.log('Running evaluator agent...');
            const evaluatorResult = await this.evaluatorAgent.execute();
            if (!evaluatorResult.success) {
                throw new Error(`Evaluator agent failed: ${evaluatorResult.error?.message}`);
            }
            // Step 3: Run the outreach agent on evaluated data
            console.log('Running outreach agent...');
            const outreachResult = await this.outreachAgent.execute();
            if (!outreachResult.success) {
                throw new Error(`Outreach agent failed: ${outreachResult.error?.message}`);
            }
            console.log('AI Influencer Agent workflow completed successfully!');
            return {
                success: true,
                data: {
                    scraperMetrics: scraperResult.data,
                    evaluatorMetrics: evaluatorResult.data,
                    outreachMetrics: outreachResult.data
                }
            };
        }
        catch (error) {
            console.error('AI Influencer Agent workflow failed:', error);
            return {
                success: false,
                error: error,
                data: null
            };
        }
        finally {
            this.running = false;
        }
    }
    stop() {
        if (this.running) {
            console.log('Stopping all agents...');
            this.scraperAgent.stop();
            this.evaluatorAgent.stop();
            this.outreachAgent.stop();
            this.running = false;
        }
    }
    isRunning() {
        return this.running;
    }
}
exports.MasterAgent = MasterAgent;
// Example usage:
// const master = new MasterAgent();
// master.execute().then(result => console.log('Execution complete:', result));
//# sourceMappingURL=masterAgent.js.map