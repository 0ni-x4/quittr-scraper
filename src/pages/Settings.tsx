import React from 'react';
import { Card, TextInput, NumberInput, Stack, Title, Button, Group, Text } from '@mantine/core';
import { useSettingsStore } from '../stores/settingsStore';

export function Settings() {
  const { settings, updateSettings, validateLicense } = useSettingsStore();

  const handleSave = async () => {
    const isValid = await validateLicense(settings.licenseKey);
    if (!isValid) {
      alert('Invalid license key');
      return;
    }
    updateSettings(settings);
  };

  return (
    <Stack gap="lg">
      <Title order={2}>Settings</Title>

      <Card shadow="sm" p="lg">
        <Stack gap="md">
          <Title order={3}>License</Title>
          <TextInput
            label="License Key"
            value={settings.licenseKey}
            onChange={(e) => updateSettings({ ...settings, licenseKey: e.target.value })}
            required
          />
        </Stack>
      </Card>

      <Card shadow="sm" p="lg">
        <Stack gap="md">
          <Title order={3}>API Configuration</Title>
          <TextInput
            label="OpenAI API Key"
            value={settings.openaiKey}
            onChange={(e) => updateSettings({ ...settings, openaiKey: e.target.value })}
            required
          />
        </Stack>
      </Card>

      <Card shadow="sm" p="lg">
        <Stack gap="md">
          <Title order={3}>Performance Settings</Title>
          <NumberInput
            label="Maximum CPU Usage (%)"
            value={settings.maxCpuUsage}
            onChange={(value) => updateSettings({ ...settings, maxCpuUsage: Number(value) || 50 })}
            min={10}
            max={90}
            required
          />
          <NumberInput
            label="Number of Parallel Agents"
            value={settings.parallelAgents}
            onChange={(value) => updateSettings({ ...settings, parallelAgents: Number(value) || 1 })}
            min={1}
            max={10}
            required
          />
        </Stack>
      </Card>

      <Group justify="flex-end">
        <Button onClick={handleSave}>Save Settings</Button>
      </Group>
    </Stack>
  );
} 