import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Plus } from "lucide-react";
import { z } from "zod";

const companySchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100, "Nome muito longo"),
  document: z.string().optional(),
});

export default function Companies() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<any>(null);
  const [assignUserOpen, setAssignUserOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  const { data: companies, isLoading } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.admin.listUsers();
      if (error) throw error;
      return data.users;
    },
  });

  const { data: userCompanies } = useQuery({
    queryKey: ["user-companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_companies")
        .select("*, companies(name)");
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; document?: string }) => {
      const { error } = await supabase.from("companies").insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast({ title: "Empresa criada com sucesso" });
      setOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar empresa",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name: string; document?: string } }) => {
      const { error } = await supabase.from("companies").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast({ title: "Empresa atualizada com sucesso" });
      setOpen(false);
      setEditingCompany(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar empresa",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("companies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast({ title: "Empresa excluída com sucesso" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir empresa",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const assignUserMutation = useMutation({
    mutationFn: async ({ userId, companyId }: { userId: string; companyId: string }) => {
      // First remove any existing association
      await supabase.from("user_companies").delete().eq("user_id", userId);
      
      // Then create new association
      const { error } = await supabase.from("user_companies").insert([{
        user_id: userId,
        company_id: companyId,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-companies"] });
      toast({ title: "Usuário associado com sucesso" });
      setAssignUserOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao associar usuário",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name");
    const document = formData.get("document");

    if (!name) {
      toast({
        title: "Erro de validação",
        description: "Nome é obrigatório",
        variant: "destructive",
      });
      return;
    }

    try {
      const validatedData = companySchema.parse({ 
        name: name.toString(), 
        document: document?.toString() 
      }) as { name: string; document?: string };
      
      if (editingCompany) {
        updateMutation.mutate({ id: editingCompany.id, data: validatedData });
      } else {
        createMutation.mutate(validatedData);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Erro de validação",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta empresa? Todos os dados relacionados serão excluídos.")) {
      deleteMutation.mutate(id);
    }
  };

  const handleAssignUser = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const userId = formData.get("user_id") as string;
    
    if (!userId || !selectedCompanyId) {
      toast({
        title: "Erro",
        description: "Selecione um usuário",
        variant: "destructive",
      });
      return;
    }

    assignUserMutation.mutate({ userId, companyId: selectedCompanyId });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Empresas</h1>
          <p className="text-muted-foreground">Gerencie as empresas do sistema</p>
        </div>
        <Button onClick={() => { setEditingCompany(null); setOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Empresa
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Empresas</CardTitle>
          <CardDescription>Todas as empresas cadastradas no sistema</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies?.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell className="font-medium">{company.name}</TableCell>
                    <TableCell>{company.document || "-"}</TableCell>
                    <TableCell>
                      {new Date(company.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedCompanyId(company.id);
                            setAssignUserOpen(true);
                          }}
                        >
                          Vincular Usuário
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingCompany(company);
                            setOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(company.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCompany ? "Editar Empresa" : "Criar Nova Empresa"}</DialogTitle>
            <DialogDescription>
              {editingCompany ? "Atualize os dados da empresa" : "Adicione uma nova empresa ao sistema"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                name="name"
                placeholder="Nome da empresa"
                required
                defaultValue={editingCompany?.name}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="document">Documento (CNPJ)</Label>
              <Input
                id="document"
                name="document"
                placeholder="00.000.000/0000-00"
                defaultValue={editingCompany?.document}
              />
            </div>
            <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
              {editingCompany ? "Atualizar" : "Criar Empresa"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={assignUserOpen} onOpenChange={setAssignUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular Usuário à Empresa</DialogTitle>
            <DialogDescription>
              Selecione um usuário para vincular a esta empresa
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAssignUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user_id">Usuário</Label>
              <Select name="user_id" required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um usuário" />
                </SelectTrigger>
                <SelectContent>
                  {users?.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={assignUserMutation.isPending}>
              Vincular Usuário
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
