import { create } from 'zustand';
import { ScraperAgent } from '../subagents/scraperAgent';
import { EvaluatorAgent } from '../subagents/evaluatorAgent';
import { AgentStatus, AgentMetrics, ScrapedData } from '../types/agent';

interface AgentStore {
  status: AgentStatus;
  metrics: AgentMetrics | null;
  isRunning: boolean;
  error: Error | null;
  startAgent: () => Promise<void>;
  stopAgent: () => Promise<void>;
  resetState: () => void;
}

export const useAgentStore = create<AgentStore>((set) => {
  // Initialize agents
  const scraperAgent = new ScraperAgent({ 
    threadCount: 2,
    timeoutMs: 30000 
  });
  
  const evaluatorAgent = new EvaluatorAgent({ 
    threadCount: 2,
    timeoutMs: 30000 
  });

  return {
    status: AgentStatus.IDLE,
    metrics: null,
    isRunning: false,
    error: null,

    startAgent: async () => {
      try {
        set({ isRunning: true, status: AgentStatus.RUNNING, error: null });
        
        // Run scraper
        const scraperResult = await scraperAgent.execute();
        if (!scraperResult.success) {
          throw scraperResult.error || new Error('Scraper failed');
        }

        // Run evaluator with scraper results
        if (scraperResult.data) {
          const evaluationTargets = (scraperResult.data.scrapedProfiles as ScrapedData[] || []).map(profile => ({
            url: profile.url || '',
            platform: profile.platform,
            content: profile.content,
            metadata: profile.metadata
          }));

          for (const target of evaluationTargets) {
            evaluatorAgent.addToQueue(target);
          }
          
          const evaluatorResult = await evaluatorAgent.execute();
          
          if (!evaluatorResult.success) {
            throw evaluatorResult.error || new Error('Evaluator failed');
          }
        }

        set({ 
          status: AgentStatus.IDLE,
          isRunning: false,
          metrics: {
            processedItems: scraperResult.data?.processedItems || 0,
            errors: scraperResult.data?.errors || [],
            scraperMetrics: scraperResult.data,
            evaluatorMetrics: evaluatorAgent.getMetrics()
          }
        });
      } catch (error: any) {
        set({ 
          status: AgentStatus.ERROR,
          isRunning: false,
          error: error instanceof Error ? error : new Error(error.message)
        });
      }
    },

    stopAgent: async () => {
      await scraperAgent.stop();
      await evaluatorAgent.stop();
      set({ isRunning: false, status: AgentStatus.STOPPED });
    },

    resetState: () => {
      set({
        status: AgentStatus.IDLE,
        metrics: null,
        isRunning: false,
        error: null
      });
    }
  };
}); 