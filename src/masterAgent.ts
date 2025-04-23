import { Agent, AgentConfig, AgentResult } from './types/agent';
import { ScraperAgent } from './subagents/scraperAgent';
import { EvaluatorAgent } from './subagents/evaluatorAgent';
import { OutreachAgent } from './subagents/outreachAgent';

export class MasterAgent {
  private scraperAgent: Agent;
  private evaluatorAgent: Agent;
  private outreachAgent: Agent;
  private running: boolean = false;

  constructor() {
    const defaultConfig: AgentConfig = {
      threadCount: 3,
      maxRetries: 3,
      timeoutMs: 30000
    };

    this.scraperAgent = new ScraperAgent(defaultConfig);
    this.evaluatorAgent = new EvaluatorAgent(defaultConfig);
    this.outreachAgent = new OutreachAgent(defaultConfig);
  }

  public async execute(): Promise<AgentResult> {
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
    } catch (error) {
      console.error('AI Influencer Agent workflow failed:', error);
      return {
        success: false,
        error: error as Error,
        data: null
      };
    } finally {
      this.running = false;
    }
  }

  public stop(): void {
    if (this.running) {
      console.log('Stopping all agents...');
      this.scraperAgent.stop();
      this.evaluatorAgent.stop();
      this.outreachAgent.stop();
      this.running = false;
    }
  }

  public isRunning(): boolean {
    return this.running;
  }
}

// Example usage:
// const master = new MasterAgent();
// master.execute().then(result => console.log('Execution complete:', result));
