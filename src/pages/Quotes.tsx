import { useState } from "react";
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
import { Plus, CheckCircle, XCircle, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";

type Quote = {
  id: string;
  code: string;
  description: string;
  delivery_date: string;
  cost_value: number;
  sale_value: number;
  profit_value: number;
  approved: boolean;
  clients: { name: string };
};

export default function Quotes() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id, name");
      if (error) throw error;
      return data;
    },
  });

  const { data: quotes, isLoading } = useQuery({
    queryKey: ["quotes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("*, clients(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Quote[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from("quotes").insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      setOpen(false);
      toast({ title: "Orçamento criado com sucesso!" });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quotes").update({ approved: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast({ title: "Orçamento aprovado!" });
    },
  });

  const convertToOrderMutation = useMutation({
    mutationFn: async (quote: Quote) => {
      const { error } = await supabase.from("active_orders").insert([{
        quote_id: quote.id,
        code: quote.code,
        description: quote.description,
        delivery_date: quote.delivery_date,
        total_value: quote.sale_value,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast({ title: "Pedido criado com sucesso!" });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      client_id: formData.get("client_id"),
      code: formData.get("code"),
      description: formData.get("description"),
      delivery_date: formData.get("delivery_date"),
      cost_value: parseFloat(formData.get("cost_value") as string),
      sale_value: parseFloat(formData.get("sale_value") as string),
    };
    createMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Orçamentos</h1>
          <p className="text-muted-foreground">Gerencie seus orçamentos</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Orçamento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Novo Orçamento</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="client_id">Cliente *</Label>
                  <Select name="client_id" required>
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
                  <Label htmlFor="code">Código *</Label>
                  <Input id="code" name="code" required />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Descrição *</Label>
                <Textarea id="description" name="description" required />
              </div>
              <div>
                <Label htmlFor="delivery_date">Prazo de Entrega *</Label>
                <Input id="delivery_date" name="delivery_date" type="date" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cost_value">Valor de Custo *</Label>
                  <Input id="cost_value" name="cost_value" type="number" step="0.01" required />
                </div>
                <div>
                  <Label htmlFor="sale_value">Valor de Venda *</Label>
                  <Input id="sale_value" name="sale_value" type="number" step="0.01" required />
                </div>
              </div>
              <Button type="submit" className="w-full">Criar Orçamento</Button>
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
                    <TableCell>{quote.clients.name}</TableCell>
                    <TableCell className="max-w-xs truncate">{quote.description}</TableCell>
                    <TableCell>{new Date(quote.delivery_date).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>R$ {Number(quote.cost_value).toFixed(2)}</TableCell>
                    <TableCell>R$ {Number(quote.sale_value).toFixed(2)}</TableCell>
                    <TableCell className="text-accent font-semibold">R$ {Number(quote.profit_value).toFixed(2)}</TableCell>
                    <TableCell>
                      {quote.approved ? (
                        <Badge className="bg-accent">Aprovado</Badge>
                      ) : (
                        <Badge variant="secondary">Pendente</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {!quote.approved && (
                          <Button size="sm" onClick={() => approveMutation.mutate(quote.id)}>
                            <CheckCircle className="mr-1 h-4 w-4" />
                            Aprovar
                          </Button>
                        )}
                        {quote.approved && (
                          <Button size="sm" variant="outline" onClick={() => convertToOrderMutation.mutate(quote)}>
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
  );
}
