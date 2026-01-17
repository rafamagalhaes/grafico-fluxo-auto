import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import graficontrolLogo from "@/assets/graficontrol-logo.png";
import { CheckCircle, BarChart3, Users, FileText, Calculator, Shield, Clock } from "lucide-react";

const registerSchema = z.object({
  company_name: z.string().min(2, "Nome da empresa deve ter no mínimo 2 caracteres"),
  cnpj: z.string().min(14, "CNPJ inválido").max(18, "CNPJ inválido"),
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
});

const formatCNPJ = (value: string) => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`;
  if (numbers.length <= 8) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`;
  if (numbers.length <= 12) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`;
  return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`;
};

const features = [
  {
    icon: FileText,
    title: "Orçamentos Profissionais",
    description: "Crie orçamentos detalhados com produtos e insumos em poucos cliques",
  },
  {
    icon: BarChart3,
    title: "Controle Financeiro",
    description: "Acompanhe receitas, despesas e lucratividade em tempo real",
  },
  {
    icon: Users,
    title: "Gestão de Clientes",
    description: "Cadastre e gerencie seus clientes de forma organizada",
  },
  {
    icon: Calculator,
    title: "Cálculo Automático",
    description: "Custos e lucros calculados automaticamente",
  },
  {
    icon: Shield,
    title: "Dados Seguros",
    description: "Seus dados protegidos com a mais alta segurança",
  },
  {
    icon: Clock,
    title: "30 Dias Grátis",
    description: "Teste todas as funcionalidades sem compromisso",
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cnpj, setCnpj] = useState("");

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const company_name = formData.get("company_name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      registerSchema.parse({ company_name, cnpj, email, password });

      const cleanCNPJ = cnpj.replace(/\D/g, "");

      const response = await supabase.functions.invoke("register-company", {
        body: {
          company_name,
          cnpj: cleanCNPJ,
          email,
          password,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Erro ao cadastrar");
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast({
        title: "Cadastro realizado com sucesso!",
        description: "Você já pode fazer login no sistema.",
      });

      setDialogOpen(false);
      navigate("/auth");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Erro de validação",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro ao cadastrar",
          description: error instanceof Error ? error.message : "Tente novamente mais tarde",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <img src={graficontrolLogo} alt="GrafiControl" className="h-10 w-auto" />
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/auth">Login</Link>
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>Cadastre-se Grátis</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Criar Conta</DialogTitle>
                  <DialogDescription>
                    Comece seu período de teste de 30 dias grátis
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleRegister} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="company_name">Nome da Empresa</Label>
                    <Input
                      id="company_name"
                      name="company_name"
                      placeholder="Sua Empresa Ltda"
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input
                      id="cnpj"
                      name="cnpj"
                      placeholder="00.000.000/0000-00"
                      value={cnpj}
                      onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
                      maxLength={18}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="seu@email.com"
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="Mínimo 8 caracteres"
                      required
                      disabled={loading}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Cadastrando..." : "Criar Conta Grátis"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
            Gestão completa para sua{" "}
            <span className="text-primary">gráfica</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Controle orçamentos, pedidos, clientes e finanças em uma única plataforma 
            simples e intuitiva. Aumente sua produtividade e lucre mais.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="text-lg px-8">
                  Começar Teste Grátis
                </Button>
              </DialogTrigger>
            </Dialog>
            <Button size="lg" variant="outline" className="text-lg px-8" asChild>
              <Link to="/auth">Já sou cliente</Link>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            30 dias grátis • Sem cartão de crédito • Cancele quando quiser
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-secondary/30">
        <div className="container mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Tudo que você precisa para gerenciar sua gráfica
          </h2>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            Funcionalidades pensadas especialmente para o dia a dia de gráficas e comunicação visual
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="bg-card border-border hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Por que escolher o GrafiControl?
          </h2>
          <div className="space-y-6">
            {[
              "Orçamentos profissionais em minutos, não horas",
              "Controle de custos e lucros em cada pedido",
              "Gestão de insumos e estoque simplificada",
              "Relatórios financeiros para tomada de decisão",
              "Acesso de qualquer lugar, a qualquer hora",
              "Suporte técnico especializado",
            ].map((benefit, index) => (
              <div key={index} className="flex items-center gap-4 p-4 rounded-lg bg-card border border-border">
                <CheckCircle className="w-6 h-6 text-accent flex-shrink-0" />
                <span className="text-lg">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-primary">
        <div className="container mx-auto text-center max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-6">
            Pronto para transformar sua gráfica?
          </h2>
          <p className="text-xl text-primary-foreground/90 mb-8">
            Comece agora com 30 dias grátis. Sem compromisso, sem cartão de crédito.
          </p>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" variant="secondary" className="text-lg px-8">
                Criar Minha Conta Grátis
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} GrafiControl. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
