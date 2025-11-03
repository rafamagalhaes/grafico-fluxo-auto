import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/use-subscription";
import { useUserCompany } from "@/hooks/use-user-company";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, Clock } from "lucide-react";

export default function Subscriptions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: subscriptionData } = useSubscription();
  const { data: userCompany } = useUserCompany();

  const { data: plans = [] } = useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .order("duration_months");

      if (error) throw error;
      return data;
    },
  });

  const subscribeMutation = useMutation({
    mutationFn: async (planId: string) => {
      if (!userCompany?.company_id) throw new Error("Company not found");

      const plan = plans.find(p => p.id === planId);
      if (!plan) throw new Error("Plan not found");

      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + plan.duration_months);

      const { error } = await supabase
        .from("subscriptions")
        .insert({
          company_id: userCompany.company_id,
          plan_id: planId,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          status: "active",
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Assinatura ativada",
        description: "Sua assinatura foi ativada com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível ativar a assinatura.",
        variant: "destructive",
      });
    },
  });

  const getDaysRemaining = () => {
    if (!subscriptionData?.trialEndDate) return 0;
    const now = new Date();
    const diff = subscriptionData.trialEndDate.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Assinaturas</h1>
          <p className="text-muted-foreground">Gerencie sua assinatura e planos disponíveis</p>
        </div>

        {subscriptionData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {subscriptionData.status === "trial" ? (
                  <Clock className="h-5 w-5 text-yellow-500" />
                ) : subscriptionData.status === "active" ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <Clock className="h-5 w-5 text-red-500" />
                )}
                Status da Assinatura
              </CardTitle>
            </CardHeader>
            <CardContent>
              {subscriptionData.status === "trial" && (
                <div className="space-y-2">
                  <p className="text-lg font-semibold">Período de Degustação</p>
                  <p className="text-muted-foreground">
                    Você tem {getDaysRemaining()} dias restantes no seu período de degustação.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Termina em: {format(subscriptionData.trialEndDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
              )}

              {subscriptionData.status === "active" && subscriptionData.subscription && (
                <div className="space-y-2">
                  <p className="text-lg font-semibold">Assinatura Ativa</p>
                  <p className="text-muted-foreground">
                    Plano: {subscriptionData.subscription.plans.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Válido até: {format(new Date(subscriptionData.subscription.end_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
              )}

              {subscriptionData.status === "expired" && (
                <div className="space-y-2">
                  <p className="text-lg font-semibold text-red-500">Assinatura Expirada</p>
                  <p className="text-muted-foreground">
                    Seu período de degustação terminou. Escolha um plano abaixo para continuar usando o sistema.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div>
          <h2 className="text-2xl font-bold mb-4">Planos Disponíveis</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => (
              <Card key={plan.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>
                    {plan.duration_months} {plan.duration_months === 1 ? "mês" : "meses"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between">
                  <div className="mb-4">
                    <p className="text-3xl font-bold">
                      R$ {plan.price.toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      R$ {(plan.price / plan.duration_months).toFixed(2)}/mês
                    </p>
                  </div>
                  <Button
                    onClick={() => subscribeMutation.mutate(plan.id)}
                    disabled={subscribeMutation.isPending || subscriptionData?.status === "active"}
                    className="w-full"
                  >
                    {subscriptionData?.status === "active" ? "Plano Ativo" : "Assinar"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
