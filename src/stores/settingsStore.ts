import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Settings {
  openaiKey: string;
  maxCpuUsage: number;
  parallelAgents: number;
  showDebugLogs: boolean;
  instagramUsername: string;
  instagramPassword: string;
}

interface SettingsStore {
  settings: Settings;
  updateSettings: (settings: Settings) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: {
        openaiKey: '',
        maxCpuUsage: 50,
        parallelAgents: 1,
        showDebugLogs: false,
        instagramUsername: '',
        instagramPassword: '',
      },
      updateSettings: (newSettings) => set({ settings: newSettings }),
    }),
    {
      name: 'settings-storage',
    }
  )
); 