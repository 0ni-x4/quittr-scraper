"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const scraperAgent_1 = require("../subagents/scraperAgent");
const evaluatorAgent_1 = require("../subagents/evaluatorAgent");
let mainWindow;
let scraperAgent = null;
let evaluatorAgent = null;
let outreachAgent = null;
// Store for application configuration
let appConfig = {
    openaiApiKey: '',
    licenseKey: '',
    maxCpuUsage: 80,
    parallelAgents: 3
};
// Store for scraped data and logs
let scrapedProfiles = [];
let evaluatedProfiles = [];
let agentLogs = {
    scraper: [],
    evaluator: [],
    outreach: []
};
// Helper function to save scraped data to file
async function saveScrapedDataToFile(data) {
    try {
        const resultsDir = path.join(process.cwd(), 'results');
        if (!fs.existsSync(resultsDir)) {
            fs.mkdirSync(resultsDir, { recursive: true });
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `scraped-profiles-${timestamp}.json`;
        const filepath = path.join(resultsDir, filename);
        fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
        console.log(`Scraped data saved to: ${filepath}`);
    }
    catch (error) {
        console.error('Error saving scraped data:', error);
    }
}
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        height: 800,
        width: 1200,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        icon: path.join(__dirname, '../../assets/icon.png'),
        title: 'AI Influencer Agent Dashboard'
    });
    // Load the HTML file
    mainWindow.loadFile(path.join(__dirname, '../../src/electron/index.html'));
    // Open DevTools in development
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
electron_1.app.whenReady().then(() => {
    createWindow();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0)
            createWindow();
    });
    // Load saved configuration
    loadConfig();
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
        electron_1.app.quit();
});
// Configuration management
function loadConfig() {
    try {
        const configPath = path.join(__dirname, '../../config.json');
        if (fs.existsSync(configPath)) {
            const configData = fs.readFileSync(configPath, 'utf-8');
            appConfig = { ...appConfig, ...JSON.parse(configData) };
        }
    }
    catch (error) {
        console.error('Error loading config:', error);
    }
}
function saveConfig() {
    try {
        const configPath = path.join(__dirname, '../../config.json');
        fs.writeFileSync(configPath, JSON.stringify(appConfig, null, 2));
    }
    catch (error) {
        console.error('Error saving config:', error);
    }
}
// IPC Handlers
electron_1.ipcMain.handle('get-config', () => {
    return appConfig;
});
electron_1.ipcMain.handle('save-config', (_event, newConfig) => {
    appConfig = { ...appConfig, ...newConfig };
    saveConfig();
    return appConfig;
});
electron_1.ipcMain.handle('get-scraped-profiles', () => {
    return scrapedProfiles;
});
electron_1.ipcMain.handle('get-evaluated-profiles', () => {
    return evaluatedProfiles;
});
electron_1.ipcMain.handle('get-agent-logs', () => {
    return agentLogs;
});
electron_1.ipcMain.handle('export-csv', async (_event, data, filename) => {
    try {
        const { filePath } = await electron_1.dialog.showSaveDialog(mainWindow, {
            defaultPath: filename,
            filters: [{ name: 'CSV Files', extensions: ['csv'] }]
        });
        if (filePath) {
            // Convert data to CSV format
            const csvContent = convertToCSV(data);
            fs.writeFileSync(filePath, csvContent);
            return { success: true, path: filePath };
        }
        return { success: false, error: 'No file path selected' };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: errorMessage };
    }
});
electron_1.ipcMain.handle('start-scraper', async (_event, referenceAccount) => {
    try {
        if (scraperAgent) {
            await scraperAgent.stop();
        }
        scraperAgent = new scraperAgent_1.ScraperAgent({
            threadCount: appConfig.parallelAgents,
            timeoutMs: 60000
        });
        // Set up logging
        const originalLog = console.log;
        console.log = (...args) => {
            const message = args.join(' ');
            agentLogs.scraper.push(`[${new Date().toLocaleTimeString()}] ${message}`);
            mainWindow?.webContents.send('log-update', agentLogs);
            originalLog(...args);
        };
        await scraperAgent.initBrowser();
        await scraperAgent.setReferenceAccount(referenceAccount);
        const result = await scraperAgent.execute();
        // Get the actual scraped data
        const scrapedData = scraperAgent.getScrapedData();
        scrapedProfiles = scrapedData;
        // Save to file
        await saveScrapedDataToFile(scrapedData);
        mainWindow?.webContents.send('scraped-profiles-update', scrapedProfiles);
        return { success: true, data: result };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        agentLogs.scraper.push(`[${new Date().toLocaleTimeString()}] Error: ${errorMessage}`);
        mainWindow?.webContents.send('log-update', agentLogs);
        return { success: false, error: errorMessage };
    }
});
electron_1.ipcMain.handle('start-evaluator', async (_event, profiles) => {
    try {
        if (evaluatorAgent) {
            await evaluatorAgent.stop();
        }
        evaluatorAgent = new evaluatorAgent_1.EvaluatorAgent({
            threadCount: appConfig.parallelAgents,
            timeoutMs: 60000,
            maxRetries: 3
        });
        // Set up logging
        const originalLog = console.log;
        console.log = (...args) => {
            const message = args.join(' ');
            agentLogs.evaluator.push(`[${new Date().toLocaleTimeString()}] ${message}`);
            mainWindow?.webContents.send('log-update', agentLogs);
            originalLog(...args);
        };
        // Process profiles for evaluation
        for (const _ of profiles) {
            // Process profiles without using the variable if we don't need it
            // Add processing logic here when needed
        }
        const result = await evaluatorAgent.execute();
        // Get evaluated results and update
        evaluatedProfiles = []; // This would be populated by the evaluator
        mainWindow?.webContents.send('evaluated-profiles-update', evaluatedProfiles);
        return { success: true, data: result };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        agentLogs.evaluator.push(`[${new Date().toLocaleTimeString()}] Error: ${errorMessage}`);
        mainWindow?.webContents.send('log-update', agentLogs);
        return { success: false, error: errorMessage };
    }
});
electron_1.ipcMain.handle('stop-agents', async () => {
    try {
        if (scraperAgent) {
            // Get scraped data before stopping
            const scrapedData = scraperAgent.getScrapedData();
            if (scrapedData.length > 0) {
                scrapedProfiles = scrapedData;
                await saveScrapedDataToFile(scrapedData);
                mainWindow?.webContents.send('scraped-profiles-update', scrapedProfiles);
            }
            await scraperAgent.stop();
            scraperAgent = null;
        }
        if (evaluatorAgent) {
            await evaluatorAgent.stop();
            evaluatorAgent = null;
        }
        if (outreachAgent) {
            await outreachAgent.stop();
            outreachAgent = null;
        }
        return { success: true };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: errorMessage };
    }
});
function convertToCSV(data) {
    if (!data || data.length === 0)
        return '';
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    for (const row of data) {
        const values = headers.map(header => {
            const value = row[header];
            // Escape commas and quotes in CSV
            return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
        });
        csvRows.push(values.join(','));
    }
    return csvRows.join('\n');
}
//# sourceMappingURL=main.js.map