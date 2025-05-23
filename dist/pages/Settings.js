"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Settings = Settings;
const react_1 = __importDefault(require("react"));
const settingsStore_1 = require("../stores/settingsStore");
const tabler_icons_react_1 = require("tabler-icons-react");
const card_1 = require("@/components/ui/card");
const input_1 = require("@/components/ui/input");
const button_1 = require("@/components/ui/button");
const alert_1 = require("@/components/ui/alert");
const switch_1 = require("@/components/ui/switch");
const tooltip_1 = require("@/components/ui/tooltip");
const label_1 = require("@/components/ui/label");
function Settings() {
    const { settings, updateSettings } = (0, settingsStore_1.useSettingsStore)();
    const [showApiKey, setShowApiKey] = react_1.default.useState(false);
    const handleSave = async () => {
        if (!settings.openaiKey) {
            alert('OpenAI API Key is required');
            return;
        }
        updateSettings(settings);
    };
    return (<div className="container mx-auto p-6 space-y-6">
      <card_1.Card>
        <card_1.CardHeader>
          <card_1.CardTitle>Settings</card_1.CardTitle>
          <card_1.CardDescription>Configure your AI agent system</card_1.CardDescription>
        </card_1.CardHeader>
      </card_1.Card>

      <card_1.Card>
        <card_1.CardHeader>
          <div className="flex items-center justify-between">
            <card_1.CardTitle>API Configuration</card_1.CardTitle>
            <tooltip_1.TooltipProvider>
              <tooltip_1.Tooltip>
                <tooltip_1.TooltipTrigger asChild>
                  <div className="flex items-center space-x-2">
                    <label_1.Label htmlFor="show-api">Show API Key</label_1.Label>
                    <switch_1.Switch id="show-api" checked={showApiKey} onCheckedChange={setShowApiKey}/>
                  </div>
                </tooltip_1.TooltipTrigger>
                <tooltip_1.TooltipContent>Toggle API key visibility</tooltip_1.TooltipContent>
              </tooltip_1.Tooltip>
            </tooltip_1.TooltipProvider>
          </div>
        </card_1.CardHeader>
        <card_1.CardContent className="space-y-4">
          <alert_1.Alert>
            <tabler_icons_react_1.AlertCircle className="h-4 w-4"/>
            <alert_1.AlertTitle>API Key Required</alert_1.AlertTitle>
            <alert_1.AlertDescription>
              You need an OpenAI API key to use the AI agents. Get your API key from the OpenAI dashboard.
            </alert_1.AlertDescription>
          </alert_1.Alert>

          <div className="space-y-2">
            <label_1.Label htmlFor="api-key">OpenAI API Key</label_1.Label>
            <input_1.Input id="api-key" type={showApiKey ? 'text' : 'password'} value={settings.openaiKey} onChange={(e) => updateSettings({ ...settings, openaiKey: e.target.value })} placeholder="sk-..." required/>
            <p className="text-sm text-muted-foreground">
              Your OpenAI API key will be stored locally
            </p>
          </div>
        </card_1.CardContent>
      </card_1.Card>

      <card_1.Card>
        <card_1.CardHeader>
          <div className="flex items-center justify-between">
            <card_1.CardTitle>Agent Settings</card_1.CardTitle>
            <tooltip_1.TooltipProvider>
              <tooltip_1.Tooltip>
                <tooltip_1.TooltipTrigger asChild>
                  <tabler_icons_react_1.InfoCircle className="h-5 w-5 cursor-help"/>
                </tooltip_1.TooltipTrigger>
                <tooltip_1.TooltipContent>These settings affect how the agents operate</tooltip_1.TooltipContent>
              </tooltip_1.Tooltip>
            </tooltip_1.TooltipProvider>
          </div>
        </card_1.CardHeader>
        <card_1.CardContent className="space-y-4">
          <div className="space-y-2">
            <label_1.Label htmlFor="cpu-usage">Maximum CPU Usage</label_1.Label>
            <input_1.Input id="cpu-usage" type="number" value={settings.maxCpuUsage} onChange={(e) => updateSettings({ ...settings, maxCpuUsage: Number(e.target.value) || 50 })} min={10} max={90} required/>
            <p className="text-sm text-muted-foreground">
              Limit the CPU usage of the agents (%)
            </p>
          </div>

          <div className="space-y-2">
            <label_1.Label htmlFor="parallel-agents">Parallel Agent Instances</label_1.Label>
            <input_1.Input id="parallel-agents" type="number" value={settings.parallelAgents} onChange={(e) => updateSettings({ ...settings, parallelAgents: Number(e.target.value) || 1 })} min={1} max={10} required/>
            <p className="text-sm text-muted-foreground">
              Number of agent instances that can run simultaneously
            </p>
          </div>
        </card_1.CardContent>
      </card_1.Card>

      <div className="flex justify-end">
        <button_1.Button size="lg" onClick={handleSave}>
          Save Settings
        </button_1.Button>
      </div>
    </div>);
}
