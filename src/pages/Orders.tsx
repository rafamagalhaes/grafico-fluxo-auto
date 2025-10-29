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
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";

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
  const [hasAdvance, setHasAdvance] = useState(false);
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

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("active_orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({ title: "Status atualizado!" });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      code: formData.get("code"),
      description: formData.get("description"),
      delivery_date: formData.get("delivery_date"),
      total_value: parseFloat(formData.get("total_value") as string),
      has_advance: hasAdvance,
      advance_value: hasAdvance ? parseFloat(formData.get("advance_value") as string) : 0,
    };
    createMutation.mutate(data);
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
                <Label htmlFor="code">Código *</Label>
                <Input id="code" name="code" required />
              </div>
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
    </div>
  );
}
