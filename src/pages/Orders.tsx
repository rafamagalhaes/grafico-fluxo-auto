import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

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
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
      const { error } = await supabase.from("active_orders").insert([data]);
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
      const { error } = await supabase.from("financial_transactions").insert([{
        amount: data.amount,
        type: "receita",
        description: `Receita do Pedido #${data.order_id}: ${data.description}`,
        due_date: new Date().toISOString().split('T')[0], // Data de hoje como vencimento
        order_id: data.order_id,
        paid: true, // Assumindo que a receita é registrada como paga ao concluir o pedido
        paid_date: new Date().toISOString().split('T')[0],
      }]);
      if (error) throw error;
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
      const { error } = await supabase.from("active_orders").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setEditOpen(false);
      setEditingOrder(null);
      setHasAdvance(false);
      toast({ title: "Pedido atualizado com sucesso!" });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      description: formData.get("description"),
      delivery_date: formData.get("delivery_date"),
      total_value: parseFloat(formData.get("total_value") as string),
      has_advance: hasAdvance,
      advance_value: hasAdvance ? parseFloat(formData.get("advance_value") as string) : 0,
    };
    createMutation.mutate(data);
  };

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingOrder) return;
    
    const formData = new FormData(e.currentTarget);
    const data = {
      description: formData.get("description"),
      delivery_date: formData.get("delivery_date"),
      total_value: parseFloat(formData.get("total_value") as string),
      has_advance: hasAdvance,
      advance_value: hasAdvance ? parseFloat(formData.get("advance_value") as string) : 0,
    };
    updateMutation.mutate({ id: editingOrder.id, data });
  };

  const handleEdit = (order: Order) => {
    setEditingOrder(order);
    setHasAdvance(order.has_advance);
    setEditOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      em_andamento: { label: "Em Andamento", className: "bg-primary" },
      concluido: { label: "Concluído", className: "bg-accent" },
      cancelado: { label: "Cancelado", className: "bg-destructive" },
    };
    const variant = variants[status as keyof typeof variants];
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
                <Label htmlFor="total_value">Valor Total *</Label>
                <Input id="total_value" name="total_value" type="number" step="0.01" required />
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
                        {order.status === "em_andamento" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => updateStatusMutation.mutate({ id: order.id, status: "concluido" })}
                            >
                              Concluir
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
              <Label htmlFor="edit_total_value">Valor Total *</Label>
              <Input 
                id="edit_total_value" 
                name="total_value" 
                type="number" 
                step="0.01" 
                defaultValue={editingOrder?.total_value}
                required 
              />
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
                  type="number" 
                  step="0.01" 
                  defaultValue={editingOrder?.advance_value}
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
