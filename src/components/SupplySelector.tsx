
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUserCompany } from "@/hooks/use-user-company";

// Funções auxiliares para máscara de moeda
const formatCurrency = (value: number): string => {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const parseCurrency = (value: string): number => {
  const cleaned = value.replace(/[^\d,]/g, "").replace(",", ".");
  return parseFloat(cleaned) || 0;
};

type Supply = {
  id: string;
  code: string | null;
  name: string;
  cost_value: number;
};

type QuoteSupply = {
  id: string;
  supply_id: string;
  quantity: number;
  adjusted_cost: number | null;
  supplies: Supply;
};

type SupplySelectorProps = {
  quoteId?: string;
  onCostCalculated?: (totalCost: number) => void;
  onClose?: () => void;
};

export default function SupplySelector({ quoteId, onCostCalculated, onClose }: SupplySelectorProps) {
  const [open, setOpen] = useState(false);
  const [selectedSupply, setSelectedSupply] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(0);
  const [adjustedCost, setAdjustedCost] = useState<string>("");
  const formRef = useRef<HTMLFormElement | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: userCompany } = useUserCompany();

  const { data: supplies } = useQuery({
    queryKey: ["supplies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("supplies").select("*").order("name");
      if (error) throw error;
      return data as Supply[];
    },
  });

  const { data: quoteSupplies } = useQuery({
    queryKey: ["quote_supplies", quoteId],
    queryFn: async () => {
      if (!quoteId) return [];
      const { data, error } = await supabase
        .from("quote_supplies")
        .select("*, supplies(*)")
        .eq("quote_id", quoteId);
      if (error) throw error;
      return data as QuoteSupply[];
    },
    enabled: !!quoteId,
  });

  const createSupplyMutation = useMutation({
    mutationFn: async (data: { code?: string; name: string; cost_value: number; company_id: string }) => {
      const { data: newSupply, error } = await supabase
        .from("supplies")
        .insert([{ ...data }])
        .select()
        .single();
      if (error) throw error;
      return newSupply;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplies"] });
      toast({ title: "Insumo cadastrado com sucesso!" });
    },
    onError: (error) => {
      toast({ 
        title: "Erro ao cadastrar insumo", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const addQuoteSupplyMutation = useMutation({
    mutationFn: async (data: { quote_id: string; supply_id: string; quantity: number; adjusted_cost?: number }) => {
      const { error } = await supabase.from("quote_supplies").insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quote_supplies", quoteId] });
      toast({ title: "Insumo adicionado ao orçamento!" });
    },
  });

  const removeQuoteSupplyMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quote_supplies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quote_supplies", quoteId] });
      toast({ title: "Insumo removido do orçamento!" });
    },
  });

  const handleAddSupply = () => {
    if (!selectedSupply) {
      toast({ 
        title: "Erro", 
        description: "Selecione um insumo e tente novamente.",
        variant: "destructive"
      });
      return;
	    }
	
	    if (!quoteId) {
	      toast({ 
	        title: "Erro", 
	        description: "ID do orçamento não encontrado. Certifique-se de que o orçamento foi salvo.",
	        variant: "destructive"
	      });
	      return;
	    }
	
	    if (!quoteId) {
	      toast({ 
	        title: "Erro", 
	        description: "ID do orçamento não encontrado. Certifique-se de que o orçamento foi salvo.",
	        variant: "destructive"
	      });
	      return;
	    }
	
	    addQuoteSupplyMutation.mutate({
	      quote_id: quoteId,
      supply_id: selectedSupply,
      quantity,
      adjusted_cost: adjustedCost ? parseCurrency(adjustedCost) : undefined,
    });
    
    // Reset form
    setSelectedSupply("");
    setQuantity(0);
    setAdjustedCost("");
  };

  const handleCreateSupply = (form: HTMLFormElement) => {
    const formData = new FormData(form);
    const costValueString = (formData.get("cost_value") as string).replace(",", ".");
    const costValue = parseFloat(costValueString);
    
    if (isNaN(costValue) || costValue <= 0) {
      toast({ 
        title: "Erro", 
        description: "Valor de custo inválido",
        variant: "destructive" 
      });
      return;
    }

    if (!userCompany?.company_id) {
      toast({
        title: "Erro",
        description: "Não foi possível identificar a empresa do usuário.",
        variant: "destructive",
      });
      return;
    }
    
    const data = {
      name: formData.get("name") as string,
      cost_value: costValue,
      company_id: userCompany.company_id as string,
    };
    createSupplyMutation.mutate(data);
    form.reset();
  };
  const totalCost = useMemo(() => {
    if (!quoteSupplies) return 0;
    const total = quoteSupplies.reduce((sum, qs) => {
      const cost = qs.adjusted_cost ?? qs.supplies.cost_value;
      return sum + (cost * qs.quantity);
    }, 0);

    // Notify parent component of cost change
    if (onCostCalculated) {
      onCostCalculated(total);
    }

    return total;
  }, [quoteSupplies, onCostCalculated]);
  
  const selectedSupplyData = supplies?.find(s => s.id === selectedSupply);
  const unitCost = adjustedCost ? parseCurrency(adjustedCost) : (selectedSupplyData?.cost_value || 0);
  const lineTotal = unitCost * quantity;

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-lg font-semibold">Custos do Orçamento</Label>
        <p className="text-sm text-muted-foreground">Adicione os insumos para calcular o custo total</p>
      </div>

      {/* Container de Adição de Insumo */}
      <div className="border rounded-lg p-4 space-y-4 bg-card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="supply_select">Nome do Insumo *</Label>
            <Select value={selectedSupply} onValueChange={setSelectedSupply}>
              <SelectTrigger id="supply_select">
                <SelectValue placeholder="Selecione um insumo" />
              </SelectTrigger>
              <SelectContent>
                {supplies?.map((supply) => (
                  <SelectItem key={supply.id} value={supply.id}>
                    {supply.name} - R$ {formatCurrency(supply.cost_value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="quantity">Quantidade *</Label>
              <Input
                id="quantity"
                type="number"
                step="1"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                disabled={!selectedSupply}
              />
          </div>
          
          <div>
            <Label htmlFor="adjusted_cost">Valor Unitário (R$)</Label>
            <Input
              id="adjusted_cost"
              type="text"
              value={adjustedCost}
              onChange={(e) => {
                const value = e.target.value;
                // Permite apenas números e vírgula
                if (/^[\d,]*$/.test(value)) {
                  setAdjustedCost(value);
                }
              }}
              placeholder={selectedSupplyData ? formatCurrency(selectedSupplyData.cost_value) : "0,00"}
              disabled={!selectedSupply}
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="text-sm">
            <span className="text-muted-foreground">Valor Total da Linha: </span>
            <span className="font-semibold text-lg">R$ {formatCurrency(lineTotal)}</span>
          </div>
	          <Button type="button" onClick={handleAddSupply} disabled={!selectedSupply || !quoteId}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Insumo
          </Button>
        </div>
      </div>

      {/* Link para cadastrar novo insumo */}
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="link" size="sm">
              <Plus className="mr-1 h-3 w-3" />
              Cadastrar Novo Insumo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Insumo</DialogTitle>
            </DialogHeader>
            <form ref={formRef} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome do Insumo *</Label>
                <Input id="name" name="name" required />
              </div>
              <div>
                <Label htmlFor="cost_value">Valor de Custo *</Label>
                <Input id="cost_value" name="cost_value" type="number" step="0.01" min="0" required />
              </div>
              <p className="text-xs text-muted-foreground">O código do insumo será gerado automaticamente</p>
              <Button
                type="button"
                className="w-full"
                onClick={() => formRef.current && handleCreateSupply(formRef.current)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Cadastrar Insumo
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabela de Insumos Adicionados */}
      {quoteSupplies && quoteSupplies.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome do Insumo</TableHead>
                <TableHead className="text-right">Quantidade</TableHead>
                <TableHead className="text-right">Valor Unitário</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quoteSupplies.map((qs) => {
                const unitCost = qs.adjusted_cost ?? qs.supplies.cost_value;
                const lineCost = unitCost * qs.quantity;
                return (
                  <TableRow key={qs.id}>
                    <TableCell className="font-medium">{qs.supplies.name}</TableCell>
                    <TableCell className="text-right">{qs.quantity}</TableCell>
                    <TableCell className="text-right">R$ {formatCurrency(unitCost)}</TableCell>
                    <TableCell className="text-right font-semibold">R$ {formatCurrency(lineCost)}</TableCell>
                    <TableCell className="text-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeQuoteSupplyMutation.mutate(qs.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          
          {/* Caixa de Total */}
          <div className="bg-muted p-4 border-t flex justify-between items-center">
            <div className="flex flex-col">
              <Label className="text-base font-semibold">Valor Total de Custo:</Label>
              <div className="text-3xl font-bold text-primary bg-background px-6 py-2 rounded-md border-2 border-primary">
                R$ {formatCurrency(totalCost)}
              </div>
            </div>
            <Button onClick={onClose} className="bg-green-500 hover:bg-green-600">Finalizar</Button>
          </div>
        </div>
      )}

      {(!quoteSupplies || quoteSupplies.length === 0) && (
        <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/50">
          <Package className="mx-auto h-12 w-12 mb-2 opacity-50" />
          <p>Nenhum insumo adicionado ainda</p>
          <p className="text-sm">Selecione um insumo acima para começar</p>
        </div>
      )}
    </div>
  );
}
