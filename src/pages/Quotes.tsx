import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, CheckCircle, ArrowRight, Edit, FileText } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useToast } from "@/hooks/use-toast";
import { useUserCompany } from "@/hooks/use-user-company";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import SupplySelector from "@/components/SupplySelector";
import ProductSelector from "@/components/ProductSelector";

type Quote = {
  id: string;
  code: string;
  description: string;
  delivery_date: string;
  cost_value: number;
  sale_value: number;
  profit_value: number;
  is_approved: boolean;
  customers: { name: string };
  orders: { id: string; status: string }[];
};

export default function Quotes() {
  const [open, setOpen] = useState(false);
  const [costValue, setCostValue] = useState<number>(0);
  const [saleValue, setSaleValue] = useState<number>(0);
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<Quote | null>(null);
  const [isCreatingTempQuote, setIsCreatingTempQuote] = useState(false);
  const [convertingQuote, setConvertingQuote] = useState<Quote | null>(null);
  const [tempQuoteId, setTempQuoteId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: userCompany } = useUserCompany();

  const { data: company } = useQuery({
    queryKey: ["company", userCompany?.company_id],
    queryFn: async () => {
      if (!userCompany?.company_id) return null;
      const { data, error } = await supabase
        .from("companies")
        .select("name, logo_url")
        .eq("id", userCompany.company_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userCompany?.company_id,
  });

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("id, name");
      if (error) throw error;
      return data;
    },
  });

  const { data: quotes, isLoading } = useQuery({
    queryKey: ["quotes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("*, customers!customer_id(name), orders(id, status)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Quote[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!userCompany?.company_id) throw new Error("Company not found");
      const { error } = await supabase.from("quotes").insert([{ ...data, company_id: userCompany.company_id }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      setOpen(false);
      setTempQuoteId(null); // Limpa o ID temporário após o sucesso
      toast({ title: "Orçamento criado com sucesso!" });
    },
  });

  const editMutation = useMutation({
    mutationFn: async (data: any) => {
      const { id, ...updateData } = data;
      const { error } = await supabase.from("quotes").update(updateData).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      setOpen(false);
      setTempQuoteId(null); // Limpa o ID temporário após o sucesso
      toast({ title: "Orçamento atualizado com sucesso!" });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quotes").update({ is_approved: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast({ title: "Orçamento aprovado!" });
    },
  });

  const handleConvert = (quote: Quote) => {
    setConvertingQuote(quote);
  };

  const convertToOrderMutation = useMutation({
    mutationFn: async (data: { quote: Quote, sale_value: number, has_advance: boolean, advance_value: number }) => {
      if (!userCompany?.company_id) throw new Error("Company not found");
      const { quote, sale_value, has_advance, advance_value } = data;
      const { error } = await supabase.from("orders").insert([{
        quote_id: quote.id,
        description: quote.description,
        delivery_date: quote.delivery_date,
        sale_value: sale_value,
        has_advance: has_advance,
        advance_value: advance_value,
        company_id: userCompany.company_id,
      } as any]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      setConvertingQuote(null); // Fechar o modal
      toast({ title: "Pedido criado com sucesso!" });
    },
    onError: (error) => {
      setConvertingQuote(null); // Fechar o modal
      toast({ title: "Erro ao criar pedido", description: error.message, variant: "destructive" });
    },
  });

  const cancelOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from("orders")
        .update({ status: "cancelado" })
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast({ title: "Pedido cancelado com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao cancelar pedido", description: error.message, variant: "destructive" });
    },
  });

  const createTempQuoteMutation = useMutation({
    mutationFn: async () => {
      if (!userCompany?.company_id) throw new Error("Company not found");
      const { data, error } = await supabase
        .from("quotes")
        .insert([
          {
            description: "Orçamento Temporário",
            delivery_date: new Date().toISOString().split("T")[0],
            cost_value: 0,
            sale_value: 0,
            customer_id: clients?.[0]?.id || null,
            company_id: userCompany.company_id,
          },
        ])
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (newId) => {
      setTempQuoteId(newId); // Armazena o ID temporário
      setIsCreatingTempQuote(false);
    },
    onError: () => {
      setIsCreatingTempQuote(false);
      toast({ title: "Erro ao criar orçamento temporário", variant: "destructive" });
    },
  });

  const deleteTempQuoteMutation = useMutation({
    mutationFn: async (quoteId: string) => {
      const { error } = await supabase
        .from("quotes")
        .delete()
        .eq("id", quoteId);
      if (error) throw error;
    },
  });

  useEffect(() => {
    if (editingQuoteId === "new" && !isCreatingTempQuote && !tempQuoteId) {
      setIsCreatingTempQuote(true);
      createTempQuoteMutation.mutate();
    }
  }, [editingQuoteId]);

  const handleEdit = (quote: Quote) => {
    setIsEditing(quote);
    setCostValue(quote.cost_value);
    setSaleValue(quote.sale_value);
    setEditingQuoteId(null);
    setTempQuoteId(null);
    setOpen(true);
  };

  const handleGeneratePDF = async (quote: Quote) => {
    try {
      // Buscar produtos do orçamento
      const { data: products } = await supabase
        .from("quote_products")
        .select("product_name, sale_value")
        .eq("quote_id", quote.id);

      // Buscar insumos do orçamento
      const { data: supplies } = await supabase
        .from("quote_supplies")
        .select("quantity, adjusted_cost, supplies(name, cost_value)")
        .eq("quote_id", quote.id);

      const doc = new jsPDF();
      let yPosition = 20;

      // Cabeçalho com logo e nome da empresa (papel timbrado)
      let logoWidth = 0;
      if (company?.logo_url) {
        try {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = company.logo_url;
          await new Promise((resolve) => {
            img.onload = resolve;
          });
          
          // Manter proporção da imagem
          const maxHeight = 25;
          const aspectRatio = img.width / img.height;
          const height = maxHeight;
          const width = height * aspectRatio;
          
          doc.addImage(img, "PNG", 15, yPosition, width, height);
          logoWidth = width + 5; // Adiciona espaço após o logo
        } catch (error) {
          console.error("Erro ao carregar logo:", error);
        }
      }

      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text(company?.name || "Empresa", 15 + logoWidth, yPosition + 10);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Orçamento", 15 + logoWidth, yPosition + 20);
      
      yPosition += 45;

      // Linha separadora
      doc.setDrawColor(200, 200, 200);
      doc.line(15, yPosition, 195, yPosition);
      yPosition += 10;

      // Informações do orçamento
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Informações do Orçamento", 15, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Código: ${quote.code}`, 15, yPosition);
      yPosition += 6;
      doc.text(`Cliente: ${quote.customers.name}`, 15, yPosition);
      yPosition += 12;

      // Tabela de produtos
      if (products && products.length > 0) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Produtos", 15, yPosition);
        yPosition += 5;

        autoTable(doc, {
          startY: yPosition,
          head: [["Produto", "Valor"]],
          body: products.map((p) => [
            p.product_name,
            `R$ ${Number(p.sale_value).toFixed(2)}`,
          ]),
          theme: "striped",
          headStyles: { fillColor: [66, 139, 202] },
        });

        yPosition = (doc as any).lastAutoTable.finalY + 10;
      }

      // Valor total
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(`Valor Total: R$ ${Number(quote.sale_value).toFixed(2)}`, 15, yPosition);

      // Rodapé
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(150);
        doc.text(
          `Página ${i} de ${pageCount}`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: "center" }
        );
      }

      doc.save(`orcamento-${quote.code}.pdf`);
      toast({ title: "PDF gerado com sucesso!" });
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast({ title: "Erro ao gerar PDF", variant: "destructive" });
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      customer_id: formData.get("customer_id"),
      description: "Orçamento com produtos",
      delivery_date: formData.get("delivery_date"),
      cost_value: costValue,
      sale_value: saleValue,
    };

    if (isEditing) {
      editMutation.mutate({ id: isEditing.id, ...data });
    } else if (tempQuoteId) {
      // Se existe um ID temporário, atualiza o orçamento temporário com os dados finais
      editMutation.mutate({ id: tempQuoteId, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Orçamentos</h1>
          <p className="text-muted-foreground">Gerencie seus orçamentos</p>
        </div>
        <Dialog open={open} onOpenChange={(open) => {
    setOpen(open);
    if (!open) {
        // Se houver um orçamento temporário e o usuário não estava editando, deletar
        if (tempQuoteId && !isEditing) {
          deleteTempQuoteMutation.mutate(tempQuoteId);
        }
        setIsEditing(null);
        setTempQuoteId(null);
    }
}}>
            <Button onClick={() => {
                setIsEditing(null);
                setCostValue(0);
                setSaleValue(0);
                setIsCreatingTempQuote(true);
                createTempQuoteMutation.mutate();
                setOpen(true);
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Orçamento
            </Button>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{isEditing ? "Editar Orçamento" : "Novo Orçamento"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="customer_id">Cliente *</Label>
                <Select name="customer_id" required defaultValue={(isEditing as any)?.customer_id}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="delivery_date">Prazo de Entrega *</Label>
                <Input id="delivery_date" name="delivery_date" type="date" required defaultValue={isEditing?.delivery_date} />
              </div>
              <div>
                <Label>Produtos</Label>
                <ProductSelector 
                  quoteId={isEditing?.id || tempQuoteId}
                  onTotalCalculated={(total) => setSaleValue(total)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cost_value">Valor de Custo</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="cost_value" 
                      name="cost_value" 
                      type="number" 
                      step="0.01" 
                      value={costValue.toFixed(2)} 
                      readOnly 
                    />
                    <Dialog open={!!editingQuoteId} onOpenChange={(open) => !open && setEditingQuoteId(null)}>
                        <DialogTrigger asChild>
                                <Button 
                                type="button" 
                                variant="outline" 
                                disabled={isCreatingTempQuote}
                                onClick={() => {
                                    if (isEditing) {
                                        setEditingQuoteId(isEditing.id);
                                    } else {
                                        setEditingQuoteId("new");
                                        setCostValue(0); // Resetar o valor de custo ao abrir novo
                                    }
                                }} // Usar um ID temporário para novo orçamento
                            >
                                Selecionar Insumos
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Gerenciar Custos e Insumos</DialogTitle>
                            </DialogHeader>
                            <SupplySelector 
                                quoteId={editingQuoteId === "new" ? undefined : editingQuoteId}
                                onCostCalculated={(totalCost) => {
                                    setCostValue(totalCost);
                                }}
                                onClose={() => setEditingQuoteId(null)}
                            />
                        </DialogContent>
                    </Dialog>
                </div>
                  <p className="text-xs text-muted-foreground mt-1">Custo total calculado com base nos insumos selecionados.</p>
                </div>
                <div>
                  <Label htmlFor="sale_value">Valor Total</Label>
                  <Input 
                    id="sale_value" 
                    name="sale_value" 
                    type="number" 
                    step="0.01" 
                    value={saleValue.toFixed(2)} 
                    readOnly 
                  />
                  <p className="text-xs text-muted-foreground mt-1">Valor total calculado com base nos produtos incluídos.</p>
                </div>
              </div>
              <Button type="submit" className="w-full">{isEditing ? "Salvar Alterações" : "Criar Orçamento"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Orçamentos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Carregando...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Entrega</TableHead>
                  <TableHead>Custo</TableHead>
                  <TableHead>Venda</TableHead>
                  <TableHead>Lucro</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes?.map((quote) => (
                  <TableRow key={quote.id}>
                    <TableCell>{quote.code}</TableCell>
                    <TableCell>{quote.customers.name}</TableCell>
                    <TableCell className="max-w-xs truncate">{quote.description}</TableCell>
                    <TableCell>{new Date(quote.delivery_date).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>R$ {Number(quote.cost_value).toFixed(2)}</TableCell>
                    <TableCell>R$ {Number(quote.sale_value).toFixed(2)}</TableCell>
                    <TableCell className="text-accent font-semibold">R$ {Number(quote.profit_value).toFixed(2)}</TableCell>
                    <TableCell>
                      {quote.is_approved ? (
                        <Badge className="bg-accent">Aprovado</Badge>
                      ) : (
                        <Badge variant="secondary">Pendente</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => handleEdit(quote)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Editar Orçamento</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => handleGeneratePDF(quote)}
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Gerar PDF</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {!quote.is_approved && (
                          <Button size="sm" onClick={() => approveMutation.mutate(quote.id)}>
                            <CheckCircle className="mr-1 h-4 w-4" />
                            Aprovar
                          </Button>
                        )}
                        {quote.is_approved && quote.orders.length === 0 && (
                          <Button size="sm" variant="outline" onClick={() => handleConvert(quote)}>
                            <ArrowRight className="mr-1 h-4 w-4" />
                            Converter em Pedido
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

    </div>

      {/* Modal de Conversão para Pedido */}
      <Dialog open={!!convertingQuote} onOpenChange={() => setConvertingQuote(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Converter Orçamento em Pedido</DialogTitle>
          </DialogHeader>
          {convertingQuote && (
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const totalValue = parseFloat(formData.get("sale_value") as string);
                const advanceValue = parseFloat(formData.get("advance_value") as string) || 0; // Garante que é um número ou 0
                const hasAdvance = advanceValue > 0; // Lógica de inferência
                
                convertToOrderMutation.mutate({
                  quote: convertingQuote,
                  sale_value: totalValue,
                  has_advance: hasAdvance,
                  advance_value: advanceValue,
                });
              }} 
              className="space-y-4"
            >
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea id="description" name="description" defaultValue={convertingQuote.description} readOnly />
              </div>
              <div>
                <Label htmlFor="delivery_date">Prazo de Entrega</Label>
                <Input id="delivery_date" name="delivery_date" type="date" defaultValue={convertingQuote.delivery_date} readOnly />
              </div>
              <div>
                <Label htmlFor="sale_value">Valor Total do Pedido</Label>
                <Input 
                  id="sale_value" 
                  name="sale_value" 
                  type="number" 
                  step="0.01" 
                  defaultValue={convertingQuote.sale_value} 
                  required 
                />
              </div>
              <div>
                <Label htmlFor="advance_value">Valor do Adiantamento</Label>
                <Input 
                  id="advance_value" 
                  name="advance_value" 
                  type="number" 
                  step="0.01" 
                  defaultValue={0} 
                />
              </div>
              <Button type="submit" className="w-full" disabled={convertToOrderMutation.isPending}>
                Criar Pedido
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
