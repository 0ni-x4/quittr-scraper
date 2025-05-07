import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Settings {
  openaiKey: string;
  maxCpuUsage: number;
  parallelAgents: number;
  instagramUsername: string;
  instagramPassword: string;
}

interface SettingsStore {
  settings: Settings;
  updateSettings: (settings: Settings) => void;
}

const defaultSettings: Settings = {
  openaiKey: '',
  maxCpuUsage: 50,
  parallelAgents: 2,
  instagramUsername: '',
  instagramPassword: ''
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      updateSettings: (newSettings) => set({ settings: newSettings }),
    }),
    {
      name: 'ai-influencer-settings',
      partialize: (state) => ({
        settings: {
          ...state.settings,
          // Don't persist sensitive data to local storage
          openaiKey: '',
          instagramPassword: ''
        }
      })
    }
  )
); 