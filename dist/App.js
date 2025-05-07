"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.App = App;
const react_router_dom_1 = require("react-router-dom");
const Dashboard_1 = require("./pages/Dashboard");
const Settings_1 = require("./pages/Settings");
const tabler_icons_react_1 = require("tabler-icons-react");
const react_1 = require("react");
const utils_1 = require("@/lib/utils");
const button_1 = require("@/components/ui/button");
const sheet_1 = require("@/components/ui/sheet");
const lucide_react_1 = require("lucide-react");
function NavbarLink({ icon: Icon, label, to }) {
    const navigate = (0, react_router_dom_1.useNavigate)();
    const location = (0, react_router_dom_1.useLocation)();
    const isActive = location.pathname === to;
    return (<button_1.Button variant={isActive ? "secondary" : "ghost"} className="w-full justify-start" onClick={() => navigate(to)}>
      <Icon className="mr-2 h-4 w-4"/>
      {label}
    </button_1.Button>);
}
function Layout({ children }) {
    const [mobileOpen, setMobileOpen] = (0, react_1.useState)(false);
    const Sidebar = () => (<div className="space-y-2 py-4">
      <NavbarLink icon={tabler_icons_react_1.Dashboard} label="Dashboard" to="/"/>
      <NavbarLink icon={tabler_icons_react_1.Settings} label="Settings" to="/settings"/>
    </div>);
    return (<div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <sheet_1.Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <sheet_1.SheetTrigger asChild className="lg:hidden">
              <button_1.Button variant="ghost" size="icon" className="mr-2">
                <lucide_react_1.Menu className="h-5 w-5"/>
              </button_1.Button>
            </sheet_1.SheetTrigger>
            <sheet_1.SheetContent side="left" className="w-[300px] sm:w-[400px]">
              <nav className="flex flex-col gap-4">
                <Sidebar />
              </nav>
            </sheet_1.SheetContent>
          </sheet_1.Sheet>
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
        <main className={(0, utils_1.cn)("flex-1 h-[calc(100vh-3.5rem)]", "lg:pl-[300px]" // Offset for sidebar
        )}>
          <div className="container py-6">
            {children}
          </div>
        </main>
      </div>
    </div>);
}
function App() {
    return (<react_router_dom_1.BrowserRouter>
      <Layout>
        <react_router_dom_1.Routes>
          <react_router_dom_1.Route path="/" element={<Dashboard_1.Dashboard />}/>
          <react_router_dom_1.Route path="/settings" element={<Settings_1.Settings />}/>
        </react_router_dom_1.Routes>
      </Layout>
    </react_router_dom_1.BrowserRouter>);
}
//# sourceMappingURL=App.js.map