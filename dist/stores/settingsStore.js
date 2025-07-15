"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useSettingsStore = void 0;
const zustand_1 = require("zustand");
const middleware_1 = require("zustand/middleware");
exports.useSettingsStore = (0, zustand_1.create)()((0, middleware_1.persist)((set) => ({
    settings: {
        openaiKey: '',
        maxCpuUsage: 50,
        parallelAgents: 1,
        showDebugLogs: false,
        instagramUsername: '',
        instagramPassword: '',
    },
    updateSettings: (newSettings) => set({ settings: newSettings }),
}), {
    name: 'settings-storage',
}));
//# sourceMappingURL=settingsStore.js.map