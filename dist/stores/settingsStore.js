"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useSettingsStore = void 0;
const zustand_1 = require("zustand");
const middleware_1 = require("zustand/middleware");
const defaultSettings = {
    openaiKey: '',
    maxCpuUsage: 50,
    parallelAgents: 2,
    instagramUsername: '',
    instagramPassword: ''
};
exports.useSettingsStore = (0, zustand_1.create)()((0, middleware_1.persist)((set) => ({
    settings: defaultSettings,
    updateSettings: (newSettings) => set({ settings: newSettings }),
}), {
    name: 'ai-influencer-settings',
    partialize: (state) => ({
        settings: {
            ...state.settings,
            // Don't persist sensitive data to local storage
            openaiKey: '',
            instagramPassword: ''
        }
    })
}));
//# sourceMappingURL=settingsStore.js.map