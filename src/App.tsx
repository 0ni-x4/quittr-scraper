import { MantineProvider, AppShell, Navbar, Header, Text, UnstyledButton, Group } from '@mantine/core';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { Settings } from './pages/Settings';
import { Dashboard as DashboardIcon, Settings as SettingsIcon } from 'tabler-icons-react';

function NavbarLink({ icon: Icon, label, to }: { icon: any; label: string; to: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <UnstyledButton
      onClick={() => navigate(to)}
      sx={(theme) => ({
        display: 'block',
        width: '100%',
        padding: theme.spacing.xs,
        borderRadius: theme.radius.sm,
        color: isActive ? theme.colors.blue[6] : theme.colors.gray[7],
        backgroundColor: isActive ? theme.colors.blue[0] : 'transparent',
        '&:hover': {
          backgroundColor: theme.colors.gray[0],
        },
      })}
    >
      <Group>
        <Icon size={20} />
        <Text size="sm">{label}</Text>
      </Group>
    </UnstyledButton>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      padding="md"
      navbar={
        <Navbar width={{ base: 250 }} p="xs">
          <Navbar.Section grow mt="xs">
            <NavbarLink icon={DashboardIcon} label="Dashboard" to="/" />
            <NavbarLink icon={SettingsIcon} label="Settings" to="/settings" />
          </Navbar.Section>
        </Navbar>
      }
      header={
        <Header height={60} p="xs">
          <Group>
            <Text size="xl" weight={700}>AI Influencer Agent</Text>
          </Group>
        </Header>
      }
    >
      {children}
    </AppShell>
  );
}

export function App() {
  return (
    <MantineProvider withGlobalStyles withNormalizeCSS>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </MantineProvider>
  );
} 