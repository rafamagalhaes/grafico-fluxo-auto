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
import { Plus, TrendingUp, TrendingDown, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, parseCurrency } from "@/lib/currency";
import { CurrencyInput } from "@/components/CurrencyInput";
import { useUserCompany } from "@/hooks/use-user-company";
import { Textarea } from "@/components/ui/textarea";
import { z } from "zod";

const transactionSchema = z.object({
  type: z.enum(["receita", "despesa"], { errorMap: () => ({ message: "Tipo deve ser receita ou despesa" }) }),
  description: z.string().min(1, "Descrição é obrigatória").max(500, "Descrição deve ter no máximo 500 caracteres"),
  amount: z.number().positive("Valor deve ser positivo").max(10000000, "Valor muito alto"),
  due_date: z.string(),
  category: z.string().max(100, "Categoria deve ter no máximo 100 caracteres").optional(),
});

type Transaction = {
  id: string;
  type: string;
  description: string;
  amount: number;
  due_date: string;
  paid: boolean;
  paid_date: string | null;
  category?: string | null;
};

export default function Financial() {
  const [open, setOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [newTransactionValue, setNewTransactionValue] = useState(0);
  const [transactionType, setTransactionType] = useState<string>("");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: userCompany } = useUserCompany();

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["transactions", month, year],
    queryFn: async () => {
      const startDate = new Date(year, month - 1, 1).toISOString().split("T")[0];
      const endDate = new Date(year, month, 0).toISOString().split("T")[0];
      
      const { data, error } = await supabase
        .from("financial_transactions")
        .select("*")
        .gte("due_date", startDate)
        .lte("due_date", endDate)
        .order("due_date", { ascending: true });
      
      if (error) throw error;
      return data as Transaction[];
    },
  });

  const summary = {
    revenue: transactions?.filter((t) => t.type === "receita" && t.paid).reduce((sum, t) => sum + Number(t.amount), 0) || 0,
    expenses: transactions?.filter((t) => t.type === "despesa" && t.paid).reduce((sum, t) => sum + Number(t.amount), 0) || 0,
    pendingRevenue: transactions?.filter((t) => t.type === "receita" && !t.paid).reduce((sum, t) => sum + Number(t.amount), 0) || 0,
    pendingExpenses: transactions?.filter((t) => t.type === "despesa" && !t.paid).reduce((sum, t) => sum + Number(t.amount), 0) || 0,
  };

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!userCompany?.company_id) throw new Error("Company not found");
      const { error } = await supabase.from("financial_transactions").insert([{ ...data, company_id: userCompany.company_id }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      setOpen(false);
      toast({ title: "Transação criada com sucesso!" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase
        .from("financial_transactions")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
	    onSuccess: () => {
	      queryClient.invalidateQueries({ queryKey: ["transactions"] });
	      setOpen(false);
	      setEditingTransaction(null);
	      setNewTransactionValue(0);
	      toast({ title: "Transação salva com sucesso!" });
	    },
  });

  const togglePaidMutation = useMutation({
    mutationFn: async ({ id, paid }: { id: string; paid: boolean }) => {
      const { error } = await supabase
        .from("financial_transactions")
        .update({ paid, paid_date: paid ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast({ title: "Status atualizado!" });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const rawData = {
      type: transactionType,
      description: formData.get("description") as string,
	      amount: editingTransaction ? parseCurrency(formData.get("amount") as string) : newTransactionValue,
      due_date: formData.get("due_date") as string,
      category: formData.get("category") as string || undefined,
    };
    
    try {
      const validatedData = transactionSchema.parse(rawData);
      if (editingTransaction) {
        updateMutation.mutate({ id: editingTransaction.id, data: validatedData });
      } else {
        createMutation.mutate(validatedData);
      }
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

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setTransactionType(transaction.type);
    setOpen(true);
  };

  const handleDialogChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setEditingTransaction(null);
      setTransactionType("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Controle Financeiro</h1>
          <p className="text-muted-foreground">Gerencie suas receitas e despesas</p>
        </div>
        <Dialog open={open} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <Button onClick={() => setTransactionType("")}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Transação
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTransaction ? "Editar Transação" : "Nova Transação"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="type">Tipo *</Label>
                <Select 
                  name="type" 
                  required 
                  value={transactionType}
                  onValueChange={setTransactionType}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receita">Receita</SelectItem>
                    <SelectItem value="despesa">Despesa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="description">Descrição *</Label>
                <Textarea 
                  id="description" 
                  name="description" 
                  required 
                  defaultValue={editingTransaction?.description || ""}
                />
              </div>
              <div>
                <Label htmlFor="amount">Valor *</Label>
	                <CurrencyInput 
	                  id="amount" 
	                  name="amount" 
	                  required 
	                  value={editingTransaction?.amount || newTransactionValue}
	                  onChange={setNewTransactionValue}
	                />
              </div>
              <div>
                <Label htmlFor="due_date">Data de Vencimento *</Label>
                <Input 
                  id="due_date" 
                  name="due_date" 
                  type="date" 
                  required 
                  defaultValue={editingTransaction?.due_date || ""}
                />
              </div>
              <div>
                <Label htmlFor="category">Categoria</Label>
                <Input 
                  id="category" 
                  name="category" 
                  defaultValue={editingTransaction?.category || ""}
                />
              </div>
              <Button type="submit" className="w-full">
                {editingTransaction ? "Salvar Alterações" : "Criar Transação"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4 items-center">
        <Label>Período:</Label>
        <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <SelectItem key={m} value={m.toString()}>
                {new Date(2024, m - 1).toLocaleDateString("pt-BR", { month: "long" })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="number"
          className="w-24"
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value))}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receitas Pagas</CardTitle>
            <TrendingUp className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
	            <div className="text-2xl font-bold text-accent">R$ {formatCurrency(summary.revenue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas Pagas</CardTitle>
            <TrendingDown className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent>	            <div className="text-2xl font-bold text-destructive">R$ {formatCurrency(summary.pendingExpenses)}</div>          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receitas Pendentes</CardTitle>
            <TrendingUp className="h-5 w-5 text-warning" />
          </CardHeader>
          <CardContent>
	            <div className="text-2xl font-bold text-warning">R$ {formatCurrency(summary.pendingRevenue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo</CardTitle>
            <TrendingUp className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
	            <div className="text-2xl font-bold text-primary">
	              R$ {formatCurrency(summary.revenue - summary.expenses)}
	            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transações do Mês</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Carregando...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions?.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      <Badge className={transaction.type === "receita" ? "bg-accent" : "bg-destructive"}>
                        {transaction.type === "receita" ? "Receita" : "Despesa"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{transaction.description}</TableCell>
	                    <TableCell>R$ {formatCurrency(transaction.amount)}</TableCell>
                    <TableCell>{new Date(transaction.due_date).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>{transaction.category || "-"}</TableCell>
                    <TableCell>
                      {transaction.paid ? (
                        <Badge className="bg-accent">Pago</Badge>
                      ) : (
                        <Badge variant="secondary">Pendente</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(transaction)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant={transaction.paid ? "outline" : "default"}
                          onClick={() => togglePaidMutation.mutate({ id: transaction.id, paid: !transaction.paid })}
                        >
                          {transaction.paid ? "Pendente" : "Pago"}
                        </Button>
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
