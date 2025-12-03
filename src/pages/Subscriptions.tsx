import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/use-subscription";
import { useUserCompany } from "@/hooks/use-user-company";
import { useUserRole } from "@/hooks/use-user-role";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, Clock, Infinity, CreditCard, QrCode, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface Plan {
  id: string;
  name: string;
  duration_months: number;
  price: number;
}

interface PixPaymentInfo {
  qr_code: string;
  copy_paste: string;
  expiration_date: string;
}

export default function Subscriptions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: subscriptionData } = useSubscription();
  const { data: userCompany } = useUserCompany();
  const { data: userRole } = useUserRole();
  
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'CREDIT_CARD' | 'PIX' | null>(null);
  const [showCreditCardModal, setShowCreditCardModal] = useState(false);
  const [showPixModal, setShowPixModal] = useState(false);
  const [pixInfo, setPixInfo] = useState<PixPaymentInfo | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Credit card form state
  const [cardForm, setCardForm] = useState({
    holderName: '',
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    ccv: '',
    cpfCnpj: '',
    postalCode: '',
    addressNumber: '',
    phone: '',
    email: '',
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("name");

      if (error) throw error;
      return data;
    },
    enabled: userRole === "superadmin",
  });

  const { data: plans = [] } = useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .order("duration_months");

      if (error) throw error;
      return data as Plan[];
    },
  });

  const toggleUnlimitedAccessMutation = useMutation({
    mutationFn: async ({ companyId, unlimited }: { companyId: string; unlimited: boolean }) => {
      const { error } = await supabase
        .from("companies")
        .update({ unlimited_access: unlimited })
        .eq("id", companyId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Acesso atualizado",
        description: "Acesso ilimitado foi atualizado com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o acesso.",
        variant: "destructive",
      });
    },
  });

  const handleSelectPlan = (plan: Plan, method: 'CREDIT_CARD' | 'PIX') => {
    setSelectedPlan(plan);
    setPaymentMethod(method);
    
    if (method === 'CREDIT_CARD') {
      setShowCreditCardModal(true);
    } else {
      processPixPayment(plan);
    }
  };

  const processPixPayment = async (plan: Plan) => {
    setIsProcessing(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const response = await supabase.functions.invoke('asaas-create-subscription', {
        body: {
          plan_id: plan.id,
          payment_method: 'PIX',
          customer_name: userCompany?.companies?.name || '',
          customer_email: session.user.email || '',
          customer_cpf_cnpj: userCompany?.companies?.document || '',
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      if (response.data.pix) {
        setPixInfo(response.data.pix);
        setShowPixModal(true);
      }

      toast({
        title: "Assinatura criada",
        description: "Efetue o pagamento via PIX para ativar sua assinatura.",
      });

      queryClient.invalidateQueries({ queryKey: ["subscription"] });
    } catch (error) {
      console.error("Error processing PIX payment:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível processar o pagamento.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const processCreditCardPayment = async () => {
    if (!selectedPlan) return;
    
    setIsProcessing(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const response = await supabase.functions.invoke('asaas-create-subscription', {
        body: {
          plan_id: selectedPlan.id,
          payment_method: 'CREDIT_CARD',
          customer_name: cardForm.holderName,
          customer_email: cardForm.email || session.user.email,
          customer_cpf_cnpj: cardForm.cpfCnpj,
          credit_card: {
            holder_name: cardForm.holderName,
            number: cardForm.cardNumber.replace(/\s/g, ''),
            expiry_month: cardForm.expiryMonth,
            expiry_year: cardForm.expiryYear,
            ccv: cardForm.ccv,
          },
          credit_card_holder_info: {
            name: cardForm.holderName,
            email: cardForm.email || session.user.email,
            cpf_cnpj: cardForm.cpfCnpj,
            postal_code: cardForm.postalCode.replace(/\D/g, ''),
            address_number: cardForm.addressNumber,
            phone: cardForm.phone.replace(/\D/g, ''),
          },
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      toast({
        title: "Assinatura ativada",
        description: "Sua assinatura foi ativada com sucesso!",
      });

      setShowCreditCardModal(false);
      setCardForm({
        holderName: '',
        cardNumber: '',
        expiryMonth: '',
        expiryYear: '',
        ccv: '',
        cpfCnpj: '',
        postalCode: '',
        addressNumber: '',
        phone: '',
        email: '',
      });

      queryClient.invalidateQueries({ queryKey: ["subscription"] });
    } catch (error) {
      console.error("Error processing credit card payment:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível processar o pagamento.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const copyPixCode = () => {
    if (pixInfo?.copy_paste) {
      navigator.clipboard.writeText(pixInfo.copy_paste);
      toast({
        title: "Código copiado",
        description: "O código PIX foi copiado para a área de transferência.",
      });
    }
  };

  const getDaysRemaining = () => {
    if (!subscriptionData?.trialEndDate) return 0;
    const now = new Date();
    const diff = subscriptionData.trialEndDate.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  // Group plans by type (monthly vs annual)
  const monthlyPlans = plans.filter(p => p.duration_months === 1);
  const annualPlans = plans.filter(p => p.duration_months === 12);

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
                ) : subscriptionData.status === "unlimited" ? (
                  <Infinity className="h-5 w-5 text-blue-500" />
                ) : (
                  <Clock className="h-5 w-5 text-red-500" />
                )}
                Status da Assinatura
              </CardTitle>
            </CardHeader>
            <CardContent>
              {subscriptionData.status === "unlimited" && (
                <div className="space-y-2">
                  <p className="text-lg font-semibold text-blue-600">Acesso Ilimitado</p>
                  <p className="text-muted-foreground">
                    {subscriptionData.isSuperadmin 
                      ? "Você tem acesso ilimitado como superadmin."
                      : "Sua empresa possui acesso ilimitado ao sistema."}
                  </p>
                </div>
              )}

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

        {userRole === "superadmin" && (
          <Card>
            <CardHeader>
              <CardTitle>Gerenciar Acesso Ilimitado</CardTitle>
              <CardDescription>Conceda ou remova acesso ilimitado para empresas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {companies.map((company) => (
                  <div key={company.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{company.name}</p>
                      <p className="text-sm text-muted-foreground">{company.document}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`unlimited-${company.id}`}>Acesso Ilimitado</Label>
                      <Switch
                        id={`unlimited-${company.id}`}
                        checked={company.unlimited_access}
                        onCheckedChange={(checked) =>
                          toggleUnlimitedAccessMutation.mutate({
                            companyId: company.id,
                            unlimited: checked,
                          })
                        }
                        disabled={toggleUnlimitedAccessMutation.isPending}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {subscriptionData?.status !== "unlimited" && (
          <div className="space-y-8">
            <h2 className="text-2xl font-bold">Planos Disponíveis</h2>
            
            {/* Monthly Plans */}
            <div>
              <h3 className="text-xl font-semibold mb-4">Plano Mensal</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {monthlyPlans.map((plan) => {
                  const isPix = plan.name.includes('PIX');
                  return (
                    <Card key={plan.id} className="flex flex-col">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          {isPix ? <QrCode className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
                          {plan.name}
                        </CardTitle>
                        <CardDescription>
                          Cobrança mensal {isPix ? 'via PIX' : 'no cartão'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col justify-between">
                        <div className="mb-4">
                          <p className="text-3xl font-bold">
                            R$ {plan.price.toFixed(2)}
                          </p>
                          <p className="text-sm text-muted-foreground">por mês</p>
                          {isPix && (
                            <p className="text-sm text-green-600 font-medium mt-1">5% de desconto no PIX</p>
                          )}
                        </div>
                        <Button
                          onClick={() => handleSelectPlan(plan, isPix ? 'PIX' : 'CREDIT_CARD')}
                          disabled={isProcessing || subscriptionData?.status === "active"}
                          className="w-full"
                        >
                          {isProcessing ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando...</>
                          ) : subscriptionData?.status === "active" ? (
                            "Plano Ativo"
                          ) : (
                            "Assinar"
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Annual Plans */}
            <div>
              <h3 className="text-xl font-semibold mb-4">Plano Anual</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {annualPlans.map((plan) => {
                  const isPix = plan.name.includes('PIX');
                  const monthlyEquivalent = (plan.price / 12).toFixed(2);
                  return (
                    <Card key={plan.id} className="flex flex-col border-primary">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2">
                            {isPix ? <QrCode className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
                            {plan.name}
                          </CardTitle>
                          <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                            Economia de 20%
                          </span>
                        </div>
                        <CardDescription>
                          Cobrança anual {isPix ? 'via PIX' : 'no cartão'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col justify-between">
                        <div className="mb-4">
                          <p className="text-3xl font-bold">
                            R$ {plan.price.toFixed(2)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            equivalente a R$ {monthlyEquivalent}/mês
                          </p>
                          {isPix && (
                            <p className="text-sm text-green-600 font-medium mt-1">+ 5% de desconto no PIX</p>
                          )}
                        </div>
                        <Button
                          onClick={() => handleSelectPlan(plan, isPix ? 'PIX' : 'CREDIT_CARD')}
                          disabled={isProcessing || subscriptionData?.status === "active"}
                          className="w-full"
                        >
                          {isProcessing ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando...</>
                          ) : subscriptionData?.status === "active" ? (
                            "Plano Ativo"
                          ) : (
                            "Assinar"
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Credit Card Modal */}
      <Dialog open={showCreditCardModal} onOpenChange={setShowCreditCardModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pagamento com Cartão de Crédito</DialogTitle>
            <DialogDescription>
              Preencha os dados do seu cartão para ativar a assinatura.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="holderName">Nome no Cartão</Label>
              <Input
                id="holderName"
                value={cardForm.holderName}
                onChange={(e) => setCardForm({ ...cardForm, holderName: e.target.value })}
                placeholder="Nome como está no cartão"
              />
            </div>
            
            <div>
              <Label htmlFor="cardNumber">Número do Cartão</Label>
              <Input
                id="cardNumber"
                value={cardForm.cardNumber}
                onChange={(e) => setCardForm({ ...cardForm, cardNumber: e.target.value })}
                placeholder="0000 0000 0000 0000"
                maxLength={19}
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="expiryMonth">Mês</Label>
                <Input
                  id="expiryMonth"
                  value={cardForm.expiryMonth}
                  onChange={(e) => setCardForm({ ...cardForm, expiryMonth: e.target.value })}
                  placeholder="MM"
                  maxLength={2}
                />
              </div>
              <div>
                <Label htmlFor="expiryYear">Ano</Label>
                <Input
                  id="expiryYear"
                  value={cardForm.expiryYear}
                  onChange={(e) => setCardForm({ ...cardForm, expiryYear: e.target.value })}
                  placeholder="AAAA"
                  maxLength={4}
                />
              </div>
              <div>
                <Label htmlFor="ccv">CVV</Label>
                <Input
                  id="ccv"
                  value={cardForm.ccv}
                  onChange={(e) => setCardForm({ ...cardForm, ccv: e.target.value })}
                  placeholder="123"
                  maxLength={4}
                  type="password"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="cpfCnpj">CPF/CNPJ</Label>
              <Input
                id="cpfCnpj"
                value={cardForm.cpfCnpj}
                onChange={(e) => setCardForm({ ...cardForm, cpfCnpj: e.target.value })}
                placeholder="000.000.000-00"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="postalCode">CEP</Label>
                <Input
                  id="postalCode"
                  value={cardForm.postalCode}
                  onChange={(e) => setCardForm({ ...cardForm, postalCode: e.target.value })}
                  placeholder="00000-000"
                />
              </div>
              <div>
                <Label htmlFor="addressNumber">Número</Label>
                <Input
                  id="addressNumber"
                  value={cardForm.addressNumber}
                  onChange={(e) => setCardForm({ ...cardForm, addressNumber: e.target.value })}
                  placeholder="123"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={cardForm.phone}
                onChange={(e) => setCardForm({ ...cardForm, phone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>

            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={cardForm.email}
                onChange={(e) => setCardForm({ ...cardForm, email: e.target.value })}
                placeholder="seu@email.com"
              />
            </div>

            <Button 
              onClick={processCreditCardPayment} 
              disabled={isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando...</>
              ) : (
                `Pagar R$ ${selectedPlan?.price.toFixed(2)}`
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* PIX Modal */}
      <Dialog open={showPixModal} onOpenChange={setShowPixModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pagamento via PIX</DialogTitle>
            <DialogDescription>
              Escaneie o QR Code ou copie o código para efetuar o pagamento.
            </DialogDescription>
          </DialogHeader>
          
          {pixInfo && (
            <div className="space-y-4 text-center">
              {pixInfo.qr_code && (
                <div className="flex justify-center">
                  <img 
                    src={`data:image/png;base64,${pixInfo.qr_code}`} 
                    alt="QR Code PIX" 
                    className="w-48 h-48"
                  />
                </div>
              )}
              
              <div>
                <p className="text-sm text-muted-foreground mb-2">Ou copie o código:</p>
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-xs break-all font-mono">{pixInfo.copy_paste}</p>
                </div>
              </div>
              
              <Button onClick={copyPixCode} variant="outline" className="w-full">
                Copiar código PIX
              </Button>
              
              <p className="text-sm text-muted-foreground">
                Após o pagamento, sua assinatura será ativada automaticamente.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
