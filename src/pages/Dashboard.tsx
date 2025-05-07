import React from 'react';
import { useAgentStore } from '@/stores/agentStore';
import { PlayerPlay, PlayerPause, Refresh, AlertCircle } from 'tabler-icons-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface LogEntry {
  timestamp: Date;
  agent: string;
  message: string;
  level: 'info' | 'warning' | 'error';
}

function LogViewer({ logs }: { logs: LogEntry[] }) {
  return (
    <ScrollArea className="h-[200px] rounded-md border">
      <div className="space-y-1 p-4">
        {logs.map((log, index) => (
          <p
            key={index}
            className={`font-mono text-sm ${
              log.level === 'error' 
                ? 'text-destructive' 
                : log.level === 'warning' 
                ? 'text-yellow-500' 
                : 'text-muted-foreground'
            }`}
          >
            [{new Date(log.timestamp).toLocaleTimeString()}] [{log.agent}] {log.message}
          </p>
        ))}
      </div>
    </ScrollArea>
  );
}

function AgentMetrics({ name, metrics }: { name: string; metrics: any }) {
  return (
    <div className="space-y-4">
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
          <Progress value={metrics?.progress || 0} />
        </div>
      </div>
    </div>
  );
}

function AgentCard({ name, status, logs, metrics }: { name: string; status: string; logs: LogEntry[]; metrics?: any }) {
  const { restartAgent } = useAgentStore();
  const agentKey = name.toLowerCase() as 'scraper' | 'evaluator' | 'outreach';
  
  const statusColors = {
    idle: 'text-gray-500 bg-gray-100',
    running: 'text-green-500 bg-green-100',
    error: 'text-red-500 bg-red-100',
    paused: 'text-yellow-500 bg-yellow-100'
  };

  const handleRestart = () => {
    restartAgent(agentKey);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CardTitle>{name}</CardTitle>
            <Badge variant="secondary" className={statusColors[status as keyof typeof statusColors]}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
          </div>
          <div className="flex space-x-2">
            {status === 'error' && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive">
                      <AlertCircle className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>View error details</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={handleRestart}>
                    <Refresh className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Restart agent</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <AgentMetrics name={name} metrics={metrics} />
        <LogViewer logs={logs.filter(log => log.agent === name)} />
      </CardContent>
    </Card>
  );
}

export function Dashboard() {
  const { agents, isRunning, startAgents, stopAgents } = useAgentStore();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI Influencer Dashboard</CardTitle>
          <CardDescription>Control and monitor your AI agents</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant={isRunning ? "destructive" : "default"}
            onClick={isRunning ? stopAgents : startAgents}
            className="w-full sm:w-auto"
          >
            {isRunning ? (
              <>
                <PlayerPause className="mr-2 h-4 w-4" />
                Stop Agents
              </>
            ) : (
              <>
                <PlayerPlay className="mr-2 h-4 w-4" />
                Start Agents
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <AgentCard
          name="Scraper"
          status={agents.scraper.status}
          logs={agents.scraper.logs}
          metrics={agents.scraper.metrics}
        />
        <AgentCard
          name="Evaluator"
          status={agents.evaluator.status}
          logs={agents.evaluator.logs}
          metrics={agents.evaluator.metrics}
        />
        <AgentCard
          name="Outreach"
          status={agents.outreach.status}
          logs={agents.outreach.logs}
          metrics={agents.outreach.metrics}
        />
      </div>
    </div>
  );
} 