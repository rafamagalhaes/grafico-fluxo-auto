import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUserCompany } from "@/hooks/use-user-company";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { z } from "zod";

const orderSchema = z.object({
  description: z.string().min(1, "Descrição é obrigatória").max(500, "Descrição deve ter no máximo 500 caracteres"),
  delivery_date: z.string().refine(date => new Date(date) >= new Date(new Date().setHours(0, 0, 0, 0)), {
    message: "Data de entrega deve ser futura"
  }),
  total_value: z.number().positive("Valor total deve ser positivo").max(10000000, "Valor total muito alto"),
  has_advance: z.boolean(),
  advance_value: z.number().min(0, "Adiantamento não pode ser negativo").optional(),
  quote_id: z.string().uuid().optional().nullable(),
}).refine(data => {
  if (data.has_advance && data.advance_value) {
    return data.advance_value <= data.total_value;
  }
  return true;
}, { message: "Adiantamento não pode exceder valor total", path: ["advance_value"] });

type Order = {
  id: string;
  code: string;
  description: string;
  delivery_date: string;
  has_advance: boolean;
  advance_value: number;
  total_value: number;
  pending_value: number;
  status: string;
};

export default function Orders() {
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [hasAdvance, setHasAdvance] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editStatus, setEditStatus] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: userCompany } = useUserCompany();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("active_orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Order[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!userCompany?.company_id) throw new Error("Company not found");
      const { error } = await supabase.from("active_orders").insert([{ ...data, company_id: userCompany.company_id }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setOpen(false);
      setHasAdvance(false);
      toast({ title: "Pedido criado com sucesso!" });
    },
  });

  const createRevenueMutation = useMutation({
    mutationFn: async (data: { amount: number; description: string; order_id: string }) => {
      if (!userCompany?.company_id) throw new Error("Company not found");
      
      // Verificar se já existe uma transação para este pedido
      const { data: existingTransaction } = await supabase
        .from("financial_transactions")
        .select("id")
        .eq("order_id", data.order_id)
        .maybeSingle();
      
      // Só criar se não existir
      if (!existingTransaction) {
        const { error } = await supabase.from("financial_transactions").insert([{
          amount: data.amount,
          type: "receita",
          description: `Receita do Pedido #${data.order_id}: ${data.description}`,
          due_date: new Date().toISOString().split('T')[0],
          order_id: data.order_id,
          paid: true,
          paid_date: new Date().toISOString().split('T')[0],
          company_id: userCompany.company_id,
        }]);
        if (error) throw error;
      }
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await supabase.from("active_orders").update({ status }).eq("id", id).select("*").single();
      if (error) throw error;
      return { order: data, status };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({ title: "Status atualizado!" });

      if (result.status === "concluido") {
        createRevenueMutation.mutate({
          amount: result.order.total_value,
          description: result.order.description,
          order_id: result.order.id,
        });
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { data: order, error } = await supabase.from("active_orders").update(data).eq("id", id).select("*").single();
      if (error) throw error;
      return { order, status: data.status, previousStatus: editingOrder?.status };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      setEditOpen(false);
      setEditingOrder(null);
      setHasAdvance(false);
      toast({ title: "Pedido atualizado com sucesso!" });

      // Criar receita se o status for "concluido" (seja mudança de status ou manutenção do status)
      if (result.status === "concluido") {
        createRevenueMutation.mutate({
          amount: result.order.total_value,
          description: result.order.description,
          order_id: result.order.id,
        });
      }
    },
  });

  useEffect(() => {
    if (!orders) return;

    orders
      .filter((order) => order.status === "concluido")
      .forEach((order) => {
        createRevenueMutation.mutate({
          amount: order.total_value,
          description: order.description,
          order_id: order.id,
        });
      });
  }, [orders]);
 
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const rawData = {
      description: formData.get("description") as string,
      delivery_date: formData.get("delivery_date") as string,
      total_value: parseFloat(formData.get("sale_value") as string),
      has_advance: hasAdvance,
      advance_value: hasAdvance ? parseFloat(formData.get("advance_value") as string) : 0,
      quote_id: null,
    };
    
    try {
      const validatedData = orderSchema.parse(rawData);
      createMutation.mutate(validatedData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Erro de validação",
          description: error.errors[0].message,
          variant: "destructive"
        });
      }
    }
  };
  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingOrder) return;
    
    const formData = new FormData(e.currentTarget);
    const saleValueStr = formData.get("sale_value") as string;
    const advanceValueStr = formData.get("advance_value") as string;
    
    const rawData = {
      description: formData.get("description") as string,
      delivery_date: formData.get("delivery_date") as string,
      total_value: parseCurrency(saleValueStr),
      has_advance: hasAdvance,
      advance_value: hasAdvance ? parseCurrency(advanceValueStr) : 0,
      quote_id: null,
    };
    
    try {
      const validatedData = orderSchema.parse(rawData);
      updateMutation.mutate({ 
        id: editingOrder.id, 
        data: {
          ...validatedData,
          status: editStatus,
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Erro de validação",
          description: error.errors[0].message,
          variant: "destructive"
        });
      }
    }
  };

  const handleEdit = (order: Order) => {
    setEditingOrder(order);
    setHasAdvance(order.has_advance);
    setEditStatus(order.status);
    setEditOpen(true);
  };

  const formatCurrency = (value: number): string => {
    return value.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const parseCurrency = (value: string): number => {
    return parseFloat(value.replace(/\./g, "").replace(",", ".")) || 0;
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      in_progress: { label: "Em Andamento", className: "bg-primary" },
      em_andamento: { label: "Em Andamento", className: "bg-primary" },
      pedido_pronto: { label: "Pedido Pronto", className: "bg-blue-500" },
      entregue_pendente: { label: "Entregue (Pendente Pagamento)", className: "bg-warning" },
      concluido: { label: "Concluído", className: "bg-accent" },
      cancelado: { label: "Cancelado", className: "bg-destructive" },
    };
    const variant = variants[status as keyof typeof variants] || { label: "Desconhecido", className: "bg-secondary" };
    return <Badge className={variant.className}>{variant.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pedidos em Andamento</h1>
          <p className="text-muted-foreground">Gerencie seus pedidos ativos</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Pedido
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Pedido</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="description">Descrição *</Label>
                <Textarea id="description" name="description" required />
              </div>
              <div>
                <Label htmlFor="delivery_date">Prazo de Entrega *</Label>
                <Input id="delivery_date" name="delivery_date" type="date" required />
              </div>
              <div>
                <Label htmlFor="sale_value">Valor Total *</Label>
                <Input id="sale_value" name="sale_value" type="number" step="0.01" required />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="has_advance" checked={hasAdvance} onCheckedChange={(checked) => setHasAdvance(checked === true)} />
                <Label htmlFor="has_advance">Possui adiantamento?</Label>
              </div>
              {hasAdvance && (
                <div>
                  <Label htmlFor="advance_value">Valor do Adiantamento *</Label>
                  <Input id="advance_value" name="advance_value" type="number" step="0.01" required />
                </div>
              )}
              <Button type="submit" className="w-full">Criar Pedido</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Pedidos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Carregando...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Entrega</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Adiantamento</TableHead>
                  <TableHead>Pendente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders?.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>{order.code}</TableCell>
                    <TableCell className="max-w-xs truncate">{order.description}</TableCell>
                    <TableCell>{new Date(order.delivery_date).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>R$ {Number(order.total_value).toFixed(2)}</TableCell>
                    <TableCell>
                      {order.has_advance ? `R$ ${Number(order.advance_value).toFixed(2)}` : "-"}
                    </TableCell>
                    <TableCell className="font-semibold text-warning">
                      R$ {Number(order.pending_value).toFixed(2)}
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {(order.status === "em_andamento" || order.status === "in_progress") && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => updateStatusMutation.mutate({ id: order.id, status: "pedido_pronto" })}
                            >
                              Marcar como Pronto
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(order)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive">
                                  <X className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Cancelar Pedido</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja cancelar o pedido {order.code}? Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Voltar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => updateStatusMutation.mutate({ id: order.id, status: "cancelado" })}
                                  >
                                    Cancelar Pedido
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                        {order.status === "pedido_pronto" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => updateStatusMutation.mutate({ id: order.id, status: "entregue_pendente" })}
                            >
                              Entregar (Pendente)
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateStatusMutation.mutate({ id: order.id, status: "concluido" })}
                            >
                              Concluir
                            </Button>
                          </>
                        )}
                        {order.status === "entregue_pendente" && (
                          <Button
                            size="sm"
                            onClick={() => updateStatusMutation.mutate({ id: order.id, status: "concluido" })}
                          >
                            Concluir
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

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Pedido</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <Label htmlFor="edit_description">Descrição *</Label>
              <Textarea 
                id="edit_description" 
                name="description" 
                defaultValue={editingOrder?.description}
                required 
              />
            </div>
            <div>
              <Label htmlFor="edit_delivery_date">Prazo de Entrega *</Label>
              <Input 
                id="edit_delivery_date" 
                name="delivery_date" 
                type="date" 
                defaultValue={editingOrder?.delivery_date}
                required 
              />
            </div>
            <div>
              <Label htmlFor="edit_sale_value">Valor Total *</Label>
              <Input 
                id="edit_sale_value" 
                name="total_value" 
                placeholder="0,00"
                defaultValue={editingOrder ? formatCurrency(editingOrder.total_value) : ""}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^\d,]/g, "");
                  e.target.value = value;
                }}
                required 
              />
            </div>
            <div>
              <Label htmlFor="edit_status">Status do Pedido *</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="em_andamento">Em andamento</SelectItem>
                  <SelectItem value="pedido_pronto">Pronto</SelectItem>
                  <SelectItem value="entregue_pendente">Entregue (pendente de pagamento)</SelectItem>
                  <SelectItem value="concluido">Finalizado (Pago)</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="edit_has_advance" 
                checked={hasAdvance} 
                onCheckedChange={(checked) => setHasAdvance(checked === true)} 
              />
              <Label htmlFor="edit_has_advance">Possui adiantamento?</Label>
            </div>
            {hasAdvance && (
              <div>
                <Label htmlFor="edit_advance_value">Valor do Adiantamento *</Label>
                <Input 
                  id="edit_advance_value" 
                  name="advance_value" 
                  placeholder="0,00"
                  defaultValue={editingOrder ? formatCurrency(editingOrder.advance_value || 0) : ""}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^\d,]/g, "");
                    e.target.value = value;
                  }}
                  required 
                />
              </div>
            )}
            <Button type="submit" className="w-full">Salvar Alterações</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
