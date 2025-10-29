import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
};

export default function SupplySelector({ quoteId, onCostCalculated }: SupplySelectorProps) {
  const [open, setOpen] = useState(false);
  const [selectedSupplies, setSelectedSupplies] = useState<Map<string, { quantity: number; adjustedCost?: number }>>(new Map());
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
    mutationFn: async (data: { code?: string; name: string; cost_value: number }) => {
      const { data: newSupply, error } = await supabase
        .from("supplies")
        .insert([data])
        .select()
        .single();
      if (error) throw error;
      return newSupply;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplies"] });
      toast({ title: "Insumo cadastrado com sucesso!" });
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

  const handleAddSupply = (supplyId: string) => {
    const quantity = selectedSupplies.get(supplyId)?.quantity || 1;
    const adjustedCost = selectedSupplies.get(supplyId)?.adjustedCost;
    
    if (quoteId) {
      addQuoteSupplyMutation.mutate({
        quote_id: quoteId,
        supply_id: supplyId,
        quantity,
        adjusted_cost: adjustedCost,
      });
    }
  };

  const handleCreateSupply = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      cost_value: parseFloat(formData.get("cost_value") as string),
    };
    createSupplyMutation.mutate(data);
    (e.target as HTMLFormElement).reset();
  };

  const calculateTotalCost = () => {
    if (!quoteSupplies) return 0;
    return quoteSupplies.reduce((total, qs) => {
      const cost = qs.adjusted_cost ?? qs.supplies.cost_value;
      return total + (cost * qs.quantity);
    }, 0);
  };

  const totalCost = calculateTotalCost();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-semibold">Insumos do Orçamento</Label>
          <p className="text-sm text-muted-foreground">Gerencie os insumos e custos</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={!quoteId}>
              <Package className="mr-2 h-4 w-4" />
              Adicionar Insumos
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Gerenciar Insumos</DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="select">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="select">Selecionar Insumo</TabsTrigger>
                <TabsTrigger value="create">Cadastrar Novo</TabsTrigger>
              </TabsList>
              
              <TabsContent value="select" className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Custo Unit.</TableHead>
                      <TableHead>Quantidade</TableHead>
                      <TableHead>Ajustar Custo</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplies?.map((supply) => (
                      <TableRow key={supply.id}>
                        <TableCell>{supply.code || "-"}</TableCell>
                        <TableCell>{supply.name}</TableCell>
                        <TableCell>R$ {Number(supply.cost_value).toFixed(2)}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            defaultValue="1"
                            className="w-24"
                            onChange={(e) => {
                              const current = selectedSupplies.get(supply.id) || { quantity: 1 };
                              setSelectedSupplies(new Map(selectedSupplies.set(supply.id, {
                                ...current,
                                quantity: parseFloat(e.target.value) || 1
                              })));
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder={supply.cost_value.toString()}
                            className="w-32"
                            onChange={(e) => {
                              const current = selectedSupplies.get(supply.id) || { quantity: 1 };
                              setSelectedSupplies(new Map(selectedSupplies.set(supply.id, {
                                ...current,
                                adjustedCost: parseFloat(e.target.value) || undefined
                              })));
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => handleAddSupply(supply.id)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
              
              <TabsContent value="create">
                <form onSubmit={handleCreateSupply} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nome do Insumo *</Label>
                    <Input id="name" name="name" required />
                  </div>
                  <div>
                    <Label htmlFor="cost_value">Valor de Custo *</Label>
                    <Input id="cost_value" name="cost_value" type="number" step="0.01" min="0" required />
                  </div>
                  <p className="text-xs text-muted-foreground">O código do insumo será gerado automaticamente</p>
                  <Button type="submit" className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Cadastrar Insumo
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {quoteSupplies && quoteSupplies.length > 0 && (
        <div className="border rounded-lg p-4 space-y-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Insumo</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Custo Unit.</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quoteSupplies.map((qs) => {
                const unitCost = qs.adjusted_cost ?? qs.supplies.cost_value;
                const lineCost = unitCost * qs.quantity;
                return (
                  <TableRow key={qs.id}>
                    <TableCell>{qs.supplies.name}</TableCell>
                    <TableCell>{qs.quantity}</TableCell>
                    <TableCell>R$ {Number(unitCost).toFixed(2)}</TableCell>
                    <TableCell className="font-semibold">R$ {lineCost.toFixed(2)}</TableCell>
                    <TableCell>
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
          <div className="flex justify-end pt-3 border-t">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Custo Total dos Insumos</p>
              <p className="text-2xl font-bold text-primary">R$ {totalCost.toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
