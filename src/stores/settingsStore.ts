import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Settings {
  licenseKey: string;
  openaiKey: string;
  maxCpuUsage: number;
  parallelAgents: number;
}

interface SettingsStore {
  settings: Settings;
  updateSettings: (settings: Settings) => void;
  validateLicense: (key: string) => Promise<boolean>;
}

const defaultSettings: Settings = {
  licenseKey: '',
  openaiKey: '',
  maxCpuUsage: 50,
  parallelAgents: 3
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      updateSettings: (newSettings) => set({ settings: newSettings }),
      validateLicense: async (key: string) => {
        // TODO: Implement actual license validation
        // For now, just check if key is not empty
        return key.length > 0;
      }
    }),
    {
      name: 'settings-storage'
    }
  )
); 