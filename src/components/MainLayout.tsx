import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Clock,
  LayoutDashboard,
  History,
  Users,
  FileText,
  Settings,
  Calendar,
  LogOut,
  Menu,
  ChevronDown,
  Wallet,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: ReactNode;
}

const menuItems = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
    roles: ["funcionario", "gestor", "rh", "admin"],
  },
  {
    label: "Registrar Ponto",
    icon: Clock,
    href: "/registrar-ponto",
    roles: ["funcionario", "gestor", "rh", "admin"],
  },
  {
    label: "Meu Histórico",
    icon: History,
    href: "/meu-historico",
    roles: ["funcionario", "gestor", "rh", "admin"],
  },
  {
    label: "Banco de Horas",
    icon: Wallet,
    href: "/banco-horas",
    roles: ["funcionario", "gestor", "rh", "admin"],
  },
  {
    label: "Solicitações",
    icon: ClipboardList,
    href: "/solicitacoes",
    roles: ["funcionario", "gestor", "rh", "admin"],
  },
  {
    label: "Gestão de Equipe",
    icon: Users,
    href: "/gestao-equipe",
    roles: ["gestor", "rh", "admin"],
  },
  {
    label: "Relatórios",
    icon: FileText,
    href: "/relatorios",
    roles: ["rh", "admin"],
  },
  {
    label: "Configurações",
    icon: Settings,
    href: "/configuracoes",
    roles: ["admin"],
  },
];

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const location = useLocation();
  const { role } = useAuth();

  const roleHierarchy: Record<string, number> = {
    funcionario: 1,
    gestor: 2,
    rh: 3,
    admin: 4,
  };

  const filteredItems = menuItems.filter((item) =>
    item.roles.some((r) => roleHierarchy[role] >= roleHierarchy[r])
  );

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <Link to="/dashboard" className="flex items-center gap-3" onClick={onClose}>
          <div className="w-10 h-10 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Clock className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-sidebar-foreground">PontoCloud</h1>
            <p className="text-xs text-sidebar-foreground/60">Controle de Ponto</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin">
        {filteredItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={onClose}
              className={cn(
                "sidebar-item",
                isActive && "sidebar-item-active"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="text-xs text-sidebar-foreground/60 text-center">
          © 2024 PontoCloud
        </div>
      </div>
    </div>
  );
}

function UserMenu() {
  const { profile, role, signOut } = useAuth();

  const roleLabels: Record<string, string> = {
    funcionario: "Funcionário",
    gestor: "Gestor",
    rh: "RH",
    admin: "Administrador",
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 px-2">
          <Avatar className="w-8 h-8">
            <AvatarImage src={profile?.avatar_url} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {profile?.nome?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:flex flex-col items-start">
            <span className="text-sm font-medium">{profile?.nome || "Usuário"}</span>
            <span className="text-xs text-muted-foreground">{roleLabels[role]}</span>
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/meu-historico" className="cursor-pointer">
            <History className="w-4 h-4 mr-2" />
            Meu Histórico
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/banco-horas" className="cursor-pointer">
            <Wallet className="w-4 h-4 mr-2" />
            Banco de Horas
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive">
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function MainLayout({ children }: MainLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-sidebar flex-col border-r border-sidebar-border">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="h-16 border-b bg-card flex items-center justify-between px-4 lg:px-6 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            {/* Mobile Menu */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64 bg-sidebar">
                <SidebarContent onClose={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>

            <div className="lg:hidden flex items-center gap-2">
              <Clock className="w-6 h-6 text-primary" />
              <span className="font-bold">PontoCloud</span>
            </div>
          </div>

          <UserMenu />
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
