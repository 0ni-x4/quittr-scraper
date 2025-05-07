import React, { ChangeEvent } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { AlertCircle, InfoCircle } from 'tabler-icons-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";

export function Settings() {
  const { settings, updateSettings } = useSettingsStore();
  const [showApiKey, setShowApiKey] = React.useState(false);

  const handleSave = async () => {
    if (!settings.openaiKey) {
      alert('OpenAI API Key is required');
      return;
    }
    updateSettings(settings);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>Configure your AI agent system</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>API Configuration</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="show-api">Show API Key</Label>
                    <Switch
                      id="show-api"
                      checked={showApiKey}
                      onCheckedChange={setShowApiKey}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>Toggle API key visibility</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>API Key Required</AlertTitle>
            <AlertDescription>
              You need an OpenAI API key to use the AI agents. Get your API key from the OpenAI dashboard.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="api-key">OpenAI API Key</Label>
            <Input
              id="api-key"
              type={showApiKey ? 'text' : 'password'}
              value={settings.openaiKey}
              onChange={(e: ChangeEvent<HTMLInputElement>) => updateSettings({ ...settings, openaiKey: e.target.value })}
              placeholder="sk-..."
              required
            />
            <p className="text-sm text-muted-foreground">
              Your OpenAI API key will be stored locally
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Agent Settings</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoCircle className="h-5 w-5 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>These settings affect how the agents operate</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cpu-usage">Maximum CPU Usage</Label>
            <Input
              id="cpu-usage"
              type="number"
              value={settings.maxCpuUsage}
              onChange={(e: ChangeEvent<HTMLInputElement>) => updateSettings({ ...settings, maxCpuUsage: Number(e.target.value) || 50 })}
              min={10}
              max={90}
              required
            />
            <p className="text-sm text-muted-foreground">
              Limit the CPU usage of the agents (%)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="parallel-agents">Parallel Agent Instances</Label>
            <Input
              id="parallel-agents"
              type="number"
              value={settings.parallelAgents}
              onChange={(e: ChangeEvent<HTMLInputElement>) => updateSettings({ ...settings, parallelAgents: Number(e.target.value) || 1 })}
              min={1}
              max={10}
              required
            />
            <p className="text-sm text-muted-foreground">
              Number of agent instances that can run simultaneously
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          size="lg"
          onClick={handleSave}
        >
          Save Settings
        </Button>
      </div>
    </div>
  );
} 