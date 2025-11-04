import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, FileText, Package, DollarSign, LogOut, UserCog, Building2, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/use-user-role";
import { useSubscription } from "@/hooks/use-subscription";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Clientes", href: "/clients", icon: Users },
  { name: "Orçamentos", href: "/quotes", icon: FileText },
  { name: "Pedidos", href: "/orders", icon: Package },
  { name: "Financeiro", href: "/financial", icon: DollarSign },
  { name: "Assinaturas", href: "/subscriptions", icon: CreditCard },
  { name: "Empresas", href: "/companies", icon: Building2 },
  { name: "Usuários", href: "/users", icon: UserCog },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: userRole } = useUserRole();
  const { data: subscriptionData } = useSubscription();

  // Filter navigation based on user role
  const filteredNavigation = navigation.filter((item) => {
    // Hide "Empresas" for non-superadmins
    if (item.href === "/companies" && userRole !== "superadmin") {
      return false;
    }
    // Hide "Financeiro" for regular users
    if (item.href === "/financial" && userRole === "user") {
      return false;
    }
    // Hide "Assinaturas" for regular users
    if (item.href === "/subscriptions" && userRole === "user") {
      return false;
    }
    return true;
  });

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Erro ao sair",
        description: error.message,
        variant: "destructive",
      });
    } else {
      navigate("/auth");
    }
  };

  const getDaysRemaining = () => {
    if (!subscriptionData?.trialEndDate) return 0;
    const now = new Date();
    const diff = subscriptionData.trialEndDate.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="flex h-screen bg-background flex-col">
      {/* Subscription banner */}
      {subscriptionData && !subscriptionData.isActive && subscriptionData.status !== "unlimited" && (
        <div className="bg-yellow-500 text-white px-4 py-2 text-center text-sm font-medium">
          {subscriptionData.status === "trial" 
            ? `Período de degustação - ${getDaysRemaining()} dias restantes`
            : "Sua assinatura expirou. Renove para continuar usando o sistema."}
        </div>
      )}
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
          <Package className="h-6 w-6 text-sidebar-primary" />
          <h1 className="text-lg font-bold text-sidebar-foreground">Gráfica Pro</h1>
        </div>
        <nav className="space-y-1 p-4 flex-1">
          {filteredNavigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-sidebar-border">
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full justify-start gap-3"
          >
            <LogOut className="h-5 w-5" />
            Sair
          </Button>
        </div>
      </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
