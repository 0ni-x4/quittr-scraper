import React from 'react';
import { Stack, Title, Card, Group, Badge, Text, ScrollArea, Button } from '@mantine/core';
import { useAgentStore } from '../stores/agentStore';
import { PlayerPlay, PlayerPause } from 'tabler-icons-react';

interface LogEntry {
  timestamp: Date;
  agent: string;
  message: string;
  level: 'info' | 'warning' | 'error';
}

function LogViewer({ logs }: { logs: LogEntry[] }) {
  return (
    <ScrollArea h={300}>
      <Stack gap="xs">
        {logs.map((log, index) => (
          <Text
            key={index}
            size="sm"
            c={log.level === 'error' ? 'red' : log.level === 'warning' ? 'yellow' : 'gray'}
          >
            [{new Date(log.timestamp).toLocaleTimeString()}] [{log.agent}] {log.message}
          </Text>
        ))}
      </Stack>
    </ScrollArea>
  );
}

function AgentCard({ name, status, logs }: { name: string; status: string; logs: LogEntry[] }) {
  return (
    <Card shadow="sm" p="lg">
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={3}>{name}</Title>
          <Badge
            color={status === 'running' ? 'green' : status === 'error' ? 'red' : 'gray'}
          >
            {status}
          </Badge>
        </Group>
        <LogViewer logs={logs.filter(log => log.agent === name)} />
      </Stack>
    </Card>
  );
}

export function Dashboard() {
  const { agents, isRunning, startAgents, stopAgents } = useAgentStore();

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Dashboard</Title>
        <Button
          variant="filled"
          leftSection={isRunning ? <PlayerPause size={20} /> : <PlayerPlay size={20} />}
          onClick={isRunning ? stopAgents : startAgents}
          color={isRunning ? 'red' : 'green'}
        >
          {isRunning ? 'Stop Agents' : 'Start Agents'}
        </Button>
      </Group>

      <AgentCard
        name="Scraper"
        status={agents.scraper.status}
        logs={agents.scraper.logs}
      />

      <AgentCard
        name="Evaluator"
        status={agents.evaluator.status}
        logs={agents.evaluator.logs}
      />

      <AgentCard
        name="Outreach"
        status={agents.outreach.status}
        logs={agents.outreach.logs}
      />
    </Stack>
  );
} 