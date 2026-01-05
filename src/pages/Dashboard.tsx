import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, Package, DollarSign, TrendingUp, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/use-user-role";
import { useDashboardAutoRefresh } from "@/hooks/use-auto-refresh";

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { data: userRole } = useUserRole();
  
  const refetchAllDashboardData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-pending-quotes"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-pending-orders"] });
  }, [queryClient]);

  const autoRefreshInterval = useDashboardAutoRefresh(refetchAllDashboardData);

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [clients, quotes, orders, transactions] = await Promise.all([
        supabase.from("clients").select("*", { count: "exact", head: true }),
        supabase.from("quotes").select("*", { count: "exact", head: true }),
        supabase.from("active_orders").select("*", { count: "exact", head: true }),
        supabase.from("financial_transactions").select("amount, type, paid"),
      ]);

      const ordersReady = orders.data?.filter((o: any) => o.status === "pedido_pronto").length || 0;
      const ordersDeliveredPending = orders.data?.filter((o: any) => o.status === "entregue_pendente").length || 0;

      const revenue = transactions.data
        ?.filter((t) => t.type === "receita" && t.paid)
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      const expenses = transactions.data
        ?.filter((t) => t.type === "despesa" && t.paid)
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      const pending = transactions.data
        ?.filter((t) => !t.paid)
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      return {
        clientsCount: clients.count || 0,
        quotesCount: quotes.count || 0,
        ordersCount: orders.count || 0,
        ordersReady,
        ordersDeliveredPending,
        revenue,
        expenses,
        profit: revenue - expenses,
        pending,
      };
    },
  });

  const { data: pendingQuotes } = useQuery({
    queryKey: ["dashboard-pending-quotes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("quotes")
        .select("id, code, description, delivery_date, approved")
        .eq("approved", false)
        .order("delivery_date", { ascending: true });

      return (data || []).map((q) => ({
        ...q,
        statusLabel: "Aguardando Aprovação",
      }));
    },
  });

  const { data: pendingOrders } = useQuery({
    queryKey: ["dashboard-pending-orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("active_orders")
        .select("id, code, description, delivery_date, status")
        .in("status", ["em_andamento", "in_progress", "pedido_pronto", "entregue_pendente"])
        .order("delivery_date", { ascending: true });

      return (data || []).map((o) => ({
        ...o,
        statusLabel:
          o.status === "em_andamento" || o.status === "in_progress"
            ? "Em Andamento"
            : o.status === "pedido_pronto"
            ? "Pronto"
            : "Entregue (Pendente)",
      }));
    },
  });

  const allCards = [
    {
      title: "Total de Clientes",
      value: stats?.clientsCount || 0,
      icon: Users,
      color: "text-primary",
      adminOnly: false,
    },
    {
      title: "Orçamentos Ativos",
      value: stats?.quotesCount || 0,
      icon: FileText,
      color: "text-primary",
      adminOnly: false,
    },
    {
      title: "Pedidos em Andamento",
      value: stats?.ordersCount || 0,
      icon: Package,
      color: "text-primary",
      adminOnly: false,
    },
    {
      title: "Pedidos Prontos",
      value: stats?.ordersReady || 0,
      icon: Package,
      color: "text-blue-500",
      adminOnly: false,
    },
    {
      title: "Entregues (Pendente)",
      value: stats?.ordersDeliveredPending || 0,
      icon: Package,
      color: "text-warning",
      adminOnly: false,
    },
    {
      title: "Receitas",
      value: `R$ ${stats?.revenue.toFixed(2) || "0.00"}`,
      icon: DollarSign,
      color: "text-accent",
      adminOnly: true,
    },
    {
      title: "Despesas",
      value: `R$ ${stats?.expenses.toFixed(2) || "0.00"}`,
      icon: DollarSign,
      color: "text-destructive",
      adminOnly: true,
    },
    {
      title: "Lucro",
      value: `R$ ${stats?.profit.toFixed(2) || "0.00"}`,
      icon: TrendingUp,
      color: "text-accent",
      adminOnly: true,
    },
  ];

  // Filter cards based on user role - hide financial cards from collaborators
  const cards = allCards.filter(card => !card.adminOnly || userRole !== "user");

  const isUrgent = (deliveryDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const delivery = new Date(deliveryDate);
    delivery.setHours(0, 0, 0, 0);
    
    return delivery.getTime() <= tomorrow.getTime();
  };

  const getRefreshIntervalLabel = () => {
    const labels: Record<number, string> = {
      1: "1 min",
      5: "5 min",
      10: "10 min",
      30: "30 min",
      60: "1h",
    };
    return labels[autoRefreshInterval] || null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do sistema</p>
        </div>
        {autoRefreshInterval > 0 && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <RefreshCw className="h-3 w-3 animate-spin" style={{ animationDuration: "3s" }} />
            Auto refresh: {getRefreshIntervalLabel()}
          </Badge>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title} className="shadow-sm transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className={cn("h-5 w-5", card.color)} />
            </CardHeader>
            <CardContent>
              <div className={cn("text-2xl font-bold", card.color)}>{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Orçamentos Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            {!pendingQuotes || pendingQuotes.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Nenhum orçamento pendente</p>
            ) : (
              <div className="space-y-2">
                {pendingQuotes.map((quote) => (
                  <div
                    key={quote.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border",
                      isUrgent(quote.delivery_date) && "border-red-500 bg-red-50 dark:bg-red-950"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{quote.code}</span>
                        {isUrgent(quote.delivery_date) && (
                          <Badge variant="destructive" className="text-xs">
                            URGENTE
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {quote.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 ml-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {new Date(quote.delivery_date).toLocaleDateString("pt-BR")}
                        </p>
                        <p className="text-xs text-muted-foreground">{quote.statusLabel}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pedidos Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            {!pendingOrders || pendingOrders.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Nenhum pedido pendente</p>
            ) : (
              <div className="space-y-2">
                {pendingOrders.map((order) => (
                  <div
                    key={order.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border",
                      isUrgent(order.delivery_date) && "border-red-500 bg-red-50 dark:bg-red-950"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{order.code}</span>
                        {isUrgent(order.delivery_date) && (
                          <Badge variant="destructive" className="text-xs">
                            URGENTE
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {order.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 ml-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {new Date(order.delivery_date).toLocaleDateString("pt-BR")}
                        </p>
                        <p className="text-xs text-muted-foreground">{order.statusLabel}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
