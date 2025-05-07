import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { Settings } from './pages/Settings';
import { Dashboard as DashboardIcon, Settings as SettingsIcon } from 'tabler-icons-react';
import { useState } from 'react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";

function NavbarLink({ icon: Icon, label, to }: { icon: any; label: string; to: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Button
      variant={isActive ? "secondary" : "ghost"}
      className="w-full justify-start"
      onClick={() => navigate(to)}
    >
      <Icon className="mr-2 h-4 w-4" />
      {label}
    </Button>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const Sidebar = () => (
    <div className="space-y-2 py-4">
      <NavbarLink icon={DashboardIcon} label="Dashboard" to="/" />
      <NavbarLink icon={SettingsIcon} label="Settings" to="/settings" />
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="ghost" size="icon" className="mr-2">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[400px]">
              <nav className="flex flex-col gap-4">
                <Sidebar />
              </nav>
            </SheetContent>
          </Sheet>
          <div className="mr-4 hidden md:flex">
            <span className="font-bold">AI Influencer Agent</span>
          </div>
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            {/* Add any header actions here */}
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden lg:block fixed z-30 w-[300px] border-r bg-background h-[calc(100vh-3.5rem)] top-14">
          <div className="h-full py-6 pl-8 pr-6">
            <Sidebar />
          </div>
        </aside>

        {/* Main content */}
        <main className={cn(
          "flex-1 h-[calc(100vh-3.5rem)]",
          "lg:pl-[300px]" // Offset for sidebar
        )}>
          <div className="container py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
} 