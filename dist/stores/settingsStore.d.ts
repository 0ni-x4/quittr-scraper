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
export declare const useSettingsStore: import("zustand").UseBoundStore<Omit<import("zustand").StoreApi<SettingsStore>, "persist"> & {
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<SettingsStore, {
            settings: {
                openaiKey: string;
                instagramPassword: string;
                maxCpuUsage: number;
                parallelAgents: number;
                instagramUsername: string;
            };
        }>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: SettingsStore) => void) => () => void;
        onFinishHydration: (fn: (state: SettingsStore) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<SettingsStore, {
            settings: {
                openaiKey: string;
                instagramPassword: string;
                maxCpuUsage: number;
                parallelAgents: number;
                instagramUsername: string;
            };
        }>>;
    };
}>;
export {};
