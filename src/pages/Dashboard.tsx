import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, Package, DollarSign, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [clients, quotes, orders, transactions] = await Promise.all([
        supabase.from("clients").select("*", { count: "exact", head: true }),
        supabase.from("quotes").select("*", { count: "exact", head: true }),
        supabase.from("active_orders").select("*", { count: "exact", head: true }),
        supabase.from("financial_transactions").select("amount, type, paid"),
      ]);

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
        revenue,
        expenses,
        profit: revenue - expenses,
        pending,
      };
    },
  });

  const cards = [
    {
      title: "Total de Clientes",
      value: stats?.clientsCount || 0,
      icon: Users,
      color: "text-primary",
    },
    {
      title: "Orçamentos Ativos",
      value: stats?.quotesCount || 0,
      icon: FileText,
      color: "text-primary",
    },
    {
      title: "Pedidos em Andamento",
      value: stats?.ordersCount || 0,
      icon: Package,
      color: "text-primary",
    },
    {
      title: "Receitas",
      value: `R$ ${stats?.revenue.toFixed(2) || "0.00"}`,
      icon: DollarSign,
      color: "text-accent",
    },
    {
      title: "Despesas",
      value: `R$ ${stats?.expenses.toFixed(2) || "0.00"}`,
      icon: DollarSign,
      color: "text-destructive",
    },
    {
      title: "Lucro",
      value: `R$ ${stats?.profit.toFixed(2) || "0.00"}`,
      icon: TrendingUp,
      color: "text-accent",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do sistema</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
    </div>
  );
}
