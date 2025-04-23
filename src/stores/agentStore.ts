import { create } from 'zustand';
import { useSettingsStore } from './settingsStore';

interface LogEntry {
  timestamp: Date;
  agent: string;
  message: string;
  level: 'info' | 'warning' | 'error';
}

interface AgentState {
  status: 'idle' | 'running' | 'error';
  logs: LogEntry[];
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
  startAgents: () => Promise<void>;
  stopAgents: () => void;
}

const defaultAgentState: AgentState = {
  status: 'idle',
  logs: []
};

const initialState: Agents = {
  scraper: { ...defaultAgentState },
  evaluator: { ...defaultAgentState },
  outreach: { ...defaultAgentState }
};

export const useAgentStore = create<AgentStore>((set, get) => ({
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
          status
        }
      }
    }));
  },

  startAgents: async () => {
    const settings = useSettingsStore.getState().settings;
    if (!settings.licenseKey || !settings.openaiKey) {
      get().addLog('System', 'Missing license key or OpenAI API key', 'error');
      return;
    }

    set({ isRunning: true });

    // Start scraper
    get().setAgentStatus('scraper', 'running');
    get().addLog('Scraper', 'Starting scraper agent...');

    // Start evaluator
    get().setAgentStatus('evaluator', 'running');
    get().addLog('Evaluator', 'Starting evaluator agent...');

    // Start outreach
    get().setAgentStatus('outreach', 'running');
    get().addLog('Outreach', 'Starting outreach agent...');
  },

  stopAgents: () => {
    set({ isRunning: false });
    
    ['scraper', 'evaluator', 'outreach'].forEach((agent) => {
      get().setAgentStatus(agent as keyof Agents, 'idle');
      get().addLog(agent, 'Agent stopped');
    });
  }
})); 