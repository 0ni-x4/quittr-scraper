import { create } from 'zustand';
import { useSettingsStore } from './settingsStore';
import { ScraperAgent } from '../subagents/scraperAgent';
import { EvaluatorAgent } from '../subagents/evaluatorAgent';
import { OutreachAgent } from '../subagents/outreachAgent';

interface LogEntry {
  timestamp: Date;
  agent: string;
  message: string;
  level: 'info' | 'warning' | 'error';
}

interface AgentMetrics {
  tasksCompleted: number;
  successRate: number;
  progress: number;
  lastUpdated: Date;
}

interface AgentState {
  status: 'idle' | 'running' | 'error' | 'paused';
  logs: LogEntry[];
  metrics: AgentMetrics;
  error?: Error;
}

interface Agents {
  scraper: AgentState;
  evaluator: AgentState;
  outreach: AgentState;
}

interface AgentStore {
  agents: Agents;
  isRunning: boolean;
  addLog: (agent: string, message: string, level?: LogEntry['level']) => void;
  setAgentStatus: (agent: keyof Agents, status: AgentState['status']) => void;
  updateMetrics: (agent: keyof Agents, metrics: Partial<AgentMetrics>) => void;
  startAgents: () => Promise<void>;
  stopAgents: () => void;
  restartAgent: (agent: keyof Agents) => Promise<void>;
}

interface ScrapedData {
  username: string;
  platform: string;
  content: string;
  metadata: Record<string, any>;
  timestamp: Date;
  url?: string;
}

interface ScraperTarget {
  username: string;
  platform: string;
  keywords: string[];
  isReferenceAccount?: boolean;
  url?: string;
}

const defaultMetrics: AgentMetrics = {
  tasksCompleted: 0,
  successRate: 0,
  progress: 0,
  lastUpdated: new Date()
};

const defaultAgentState: AgentState = {
  status: 'idle',
  logs: [],
  metrics: { ...defaultMetrics }
};

const initialState: Agents = {
  scraper: { ...defaultAgentState },
  evaluator: { ...defaultAgentState },
  outreach: { ...defaultAgentState }
};

export const useAgentStore = create<AgentStore>((set, get) => {
  // Initialize agent instances
  const scraperAgent = new ScraperAgent({ threadCount: 2, maxRetries: 3, timeoutMs: 30000 });
  const evaluatorAgent = new EvaluatorAgent({ threadCount: 2, maxRetries: 3, timeoutMs: 30000 });
  const outreachAgent = new OutreachAgent({ threadCount: 2, maxRetries: 3, timeoutMs: 30000 });

  return {
    agents: initialState,
    isRunning: false,

    addLog: (agent, message, level = 'info') => {
      set((state) => {
        const agentKey = agent.toLowerCase() as keyof Agents;
        return {
          agents: {
            ...state.agents,
            [agentKey]: {
              ...state.agents[agentKey],
              logs: [
                ...state.agents[agentKey].logs,
                {
                  timestamp: new Date(),
                  agent,
                  message,
                  level
                }
              ]
            }
          }
        };
      });
    },

    setAgentStatus: (agent, status) => {
      set((state) => ({
        agents: {
          ...state.agents,
          [agent]: {
            ...state.agents[agent],
            status,
            error: status === 'error' ? state.agents[agent].error : undefined
          }
        }
      }));
    },

    updateMetrics: (agent, metrics) => {
      set((state) => ({
        agents: {
          ...state.agents,
          [agent]: {
            ...state.agents[agent],
            metrics: {
              ...state.agents[agent].metrics,
              ...metrics,
              lastUpdated: new Date()
            }
          }
        }
      }));
    },

    startAgents: async () => {
      const settings = useSettingsStore.getState().settings;
      if (!settings.openaiKey) {
        get().addLog('System', 'Missing OpenAI API key in settings', 'error');
        return;
      }

      set({ isRunning: true });

      try {
        // Start scraper
        get().setAgentStatus('scraper', 'running');
        get().addLog('Scraper', 'Starting scraper agent...');
        
        // Process scraper targets
        const scraperTargets = await scraperAgent.getItems();
        let scrapedCount = 0;
        
        for (const target of scraperTargets) {
          try {
            const scrapedData = await scraperAgent.processItem(target);
            scrapedCount++;
            
            // Update metrics
            get().updateMetrics('scraper', {
              progress: (scrapedCount / scraperTargets.length) * 100,
              tasksCompleted: scrapedCount,
              successRate: (scrapedCount / (scrapedCount + 1)) * 100
            });

            // Add scraped data to evaluator queue
            evaluatorAgent.addToQueue({
              url: scrapedData.url,
              platform: scrapedData.platform,
              content: scrapedData.content,
              metadata: scrapedData.metadata
            });

            get().addLog('Scraper', `Successfully scraped ${target.platform} profile: ${target.url}`);
          } catch (error) {
            get().addLog('Scraper', `Failed to scrape ${target.url}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
          }
        }

        // Start evaluator
        get().setAgentStatus('evaluator', 'running');
        get().addLog('Evaluator', 'Starting evaluator agent...');
        
        // Process evaluation queue
        const evaluationTargets = await evaluatorAgent.getItems();
        let evaluatedCount = 0;
        
        for (const target of evaluationTargets) {
          try {
            const evaluationResult = await evaluatorAgent.processItem(target);
            evaluatedCount++;
            
            // Update metrics
            get().updateMetrics('evaluator', {
              progress: (evaluatedCount / evaluationTargets.length) * 100,
              tasksCompleted: evaluatedCount,
              successRate: (evaluatedCount / (evaluatedCount + 1)) * 100
            });

            get().addLog('Evaluator', `Evaluated ${target.platform} profile: ${target.url} (Score: ${evaluationResult.score})`);

            // If score is high enough, add to outreach queue
            if (evaluationResult.recommendedAction === 'reach_out') {
              // TODO: Add to outreach queue when implemented
              get().addLog('Evaluator', `Added ${target.url} to outreach queue (Score: ${evaluationResult.score})`);
            }
          } catch (error) {
            get().addLog('Evaluator', `Failed to evaluate ${target.url}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
          }
        }

      } catch (error) {
        get().addLog('System', `Failed to start agents: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        get().stopAgents();
      }
    },

    stopAgents: () => {
      set({ isRunning: false });
      
      ['scraper', 'evaluator', 'outreach'].forEach((agent) => {
        const agentKey = agent as keyof Agents;
        get().setAgentStatus(agentKey, 'idle');
        get().addLog(agent, 'Agent stopped');
      });
    },

    restartAgent: async (agent) => {
      get().setAgentStatus(agent, 'idle');
      get().addLog(agent, 'Restarting agent...');
      
      // Reset metrics
      get().updateMetrics(agent, {
        progress: 0,
        tasksCompleted: 0,
        successRate: 0
      });

      // Restart the specific agent
      if (get().isRunning) {
        try {
          // Start processing new items
          switch (agent) {
            case 'scraper':
              const scraperTargets = await scraperAgent.getItems();
              for (const target of scraperTargets) {
                const data = await scraperAgent.processItem(target);
                evaluatorAgent.addToQueue({
                  url: data.url,
                  platform: data.platform,
                  content: data.content,
                  metadata: data.metadata
                });
              }
              break;
            case 'evaluator':
              const evaluationTargets = await evaluatorAgent.getItems();
              for (const target of evaluationTargets) {
                await evaluatorAgent.processItem(target);
              }
              break;
            case 'outreach':
              // TODO: Implement outreach agent restart
              break;
          }
          get().setAgentStatus(agent, 'running');
          get().addLog(agent, 'Agent restarted successfully');
        } catch (error) {
          get().setAgentStatus(agent, 'error');
          get().addLog(agent, `Failed to restart: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
      }
    }
  };
}); 