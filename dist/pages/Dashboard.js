"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Dashboard = Dashboard;
const react_1 = __importDefault(require("react"));
const agentStore_1 = require("@/stores/agentStore");
const tabler_icons_react_1 = require("tabler-icons-react");
const button_1 = require("@/components/ui/button");
const card_1 = require("@/components/ui/card");
const scroll_area_1 = require("@/components/ui/scroll-area");
const badge_1 = require("@/components/ui/badge");
const progress_1 = require("@/components/ui/progress");
const tooltip_1 = require("@/components/ui/tooltip");
function LogViewer({ logs }) {
    return (<scroll_area_1.ScrollArea className="h-[200px] rounded-md border">
      <div className="space-y-1 p-4">
        {logs.map((log, index) => (<p key={index} className={`font-mono text-sm ${log.level === 'error'
                ? 'text-destructive'
                : log.level === 'warning'
                    ? 'text-yellow-500'
                    : 'text-muted-foreground'}`}>
            [{new Date(log.timestamp).toLocaleTimeString()}] [{log.agent}] {log.message}
          </p>))}
      </div>
    </scroll_area_1.ScrollArea>);
}
function AgentMetrics({ name, metrics }) {
    return (<div className="space-y-4">
      <h4 className="text-sm font-medium">Performance Metrics</h4>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Tasks Completed</p>
          <p className="text-sm font-medium">{metrics?.tasksCompleted || 0}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Success Rate</p>
          <p className="text-sm font-medium">{metrics?.successRate?.toFixed(1) || '0'}%</p>
        </div>
        <div className="col-span-2">
          <p className="text-xs text-muted-foreground mb-2">Progress</p>
          <progress_1.Progress value={metrics?.progress || 0}/>
        </div>
      </div>
    </div>);
}
function AgentCard({ name, status, logs, metrics }) {
    const { restartAgent } = (0, agentStore_1.useAgentStore)();
    const agentKey = name.toLowerCase();
    const statusColors = {
        idle: 'text-gray-500 bg-gray-100',
        running: 'text-green-500 bg-green-100',
        error: 'text-red-500 bg-red-100',
        paused: 'text-yellow-500 bg-yellow-100'
    };
    const handleRestart = () => {
        restartAgent(agentKey);
    };
    return (<card_1.Card>
      <card_1.CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <card_1.CardTitle>{name}</card_1.CardTitle>
            <badge_1.Badge variant="secondary" className={statusColors[status]}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </badge_1.Badge>
          </div>
          <div className="flex space-x-2">
            {status === 'error' && (<tooltip_1.TooltipProvider>
                <tooltip_1.Tooltip>
                  <tooltip_1.TooltipTrigger asChild>
                    <button_1.Button variant="ghost" size="icon" className="text-destructive">
                      <tabler_icons_react_1.AlertCircle className="h-4 w-4"/>
                    </button_1.Button>
                  </tooltip_1.TooltipTrigger>
                  <tooltip_1.TooltipContent>View error details</tooltip_1.TooltipContent>
                </tooltip_1.Tooltip>
              </tooltip_1.TooltipProvider>)}
            <tooltip_1.TooltipProvider>
              <tooltip_1.Tooltip>
                <tooltip_1.TooltipTrigger asChild>
                  <button_1.Button variant="ghost" size="icon" onClick={handleRestart}>
                    <tabler_icons_react_1.Refresh className="h-4 w-4"/>
                  </button_1.Button>
                </tooltip_1.TooltipTrigger>
                <tooltip_1.TooltipContent>Restart agent</tooltip_1.TooltipContent>
              </tooltip_1.Tooltip>
            </tooltip_1.TooltipProvider>
          </div>
        </div>
      </card_1.CardHeader>
      <card_1.CardContent className="space-y-4">
        <AgentMetrics name={name} metrics={metrics}/>
        <LogViewer logs={logs.filter(log => log.agent === name)}/>
      </card_1.CardContent>
    </card_1.Card>);
}
function Dashboard() {
    const { agents, isRunning, startAgents, stopAgents } = (0, agentStore_1.useAgentStore)();
    return (<div className="container mx-auto p-6 space-y-6">
      <card_1.Card>
        <card_1.CardHeader>
          <card_1.CardTitle>AI Influencer Dashboard</card_1.CardTitle>
          <card_1.CardDescription>Control and monitor your AI agents</card_1.CardDescription>
        </card_1.CardHeader>
        <card_1.CardContent>
          <button_1.Button variant={isRunning ? "destructive" : "default"} onClick={isRunning ? stopAgents : startAgents} className="w-full sm:w-auto">
            {isRunning ? (<>
                <tabler_icons_react_1.PlayerPause className="mr-2 h-4 w-4"/>
                Stop Agents
              </>) : (<>
                <tabler_icons_react_1.PlayerPlay className="mr-2 h-4 w-4"/>
                Start Agents
              </>)}
          </button_1.Button>
        </card_1.CardContent>
      </card_1.Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <AgentCard name="Scraper" status={agents.scraper.status} logs={agents.scraper.logs} metrics={agents.scraper.metrics}/>
        <AgentCard name="Evaluator" status={agents.evaluator.status} logs={agents.evaluator.logs} metrics={agents.evaluator.metrics}/>
        <AgentCard name="Outreach" status={agents.outreach.status} logs={agents.outreach.logs} metrics={agents.outreach.metrics}/>
      </div>
    </div>);
}
