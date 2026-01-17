import { useState, useMemo } from "react";
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
import { useUserCompany } from "@/hooks/use-user-company";
import { useUserRole } from "@/hooks/use-user-role";
import { Trash2, Plus, Search } from "lucide-react";
import { z } from "zod";

const userSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
  role: z.enum(["admin", "user"]),
  company_id: z.string().uuid("Empresa é obrigatória"),
});

export default function Users() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: userCompany } = useUserCompany();
  const { data: userRole } = useUserRole();
  const [open, setOpen] = useState(false);
  const [emailFilter, setEmailFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");

  // Fetch companies for superadmin
  const { data: companies } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: userRole === "superadmin",
  });

  // Fetch users via Edge Function
  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'list' },
      });
      if (error) throw error;
      return data.users;
    },
  });

  // Filter users based on search criteria
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter((user: any) => {
      const matchesEmail = !emailFilter || 
        user.email?.toLowerCase().includes(emailFilter.toLowerCase());
      const matchesCompany = !companyFilter || 
        user.company_name?.toLowerCase().includes(companyFilter.toLowerCase());
      return matchesEmail && matchesCompany;
    });
  }, [users, emailFilter, companyFilter]);

  const createUserMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; role: "admin" | "user"; company_id: string }) => {
      const companyId = userRole === "superadmin" ? data.company_id : userCompany?.company_id;
      
      const { data: result, error } = await supabase.functions.invoke('manage-users', {
        body: { 
          action: 'create',
          email: data.email,
          password: data.password,
          role: data.role,
          company_id: companyId,
        },
      });
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "Usuário criado com sucesso" });
      setOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar usuário",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { 
          action: 'delete',
          userId,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "Usuário excluído com sucesso" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir usuário",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email");
    const password = formData.get("password");
    const role = formData.get("role");
    const company_id = formData.get("company_id");

    if (!email || !password || !role) {
      toast({
        title: "Erro de validação",
        description: "Todos os campos são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    if (userRole === "superadmin" && !company_id) {
      toast({
        title: "Erro de validação",
        description: "Empresa é obrigatória",
        variant: "destructive",
      });
      return;
    }

    try {
      const validatedData = userSchema.parse({ 
        email: email.toString(), 
        password: password.toString(),
        role: role.toString(),
        company_id: userRole === "superadmin" ? company_id?.toString() : userCompany?.company_id
      }) as { email: string; password: string; role: "admin" | "user"; company_id: string };
      createUserMutation.mutate(validatedData);
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

  const handleDelete = (userId: string) => {
    if (confirm("Tem certeza que deseja excluir este usuário?")) {
      deleteUserMutation.mutate(userId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Usuários</h1>
          <p className="text-muted-foreground">Gerencie os usuários do sistema</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Usuário</DialogTitle>
              <DialogDescription>
                Adicione um novo usuário ao sistema
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="usuario@email.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Permissão</Label>
                <Select name="role" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a permissão" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="user">Colaborador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {userRole === "superadmin" && (
                <div className="space-y-2">
                  <Label htmlFor="company_id">Empresa</Label>
                  <Select name="company_id" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a empresa" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies?.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button type="submit" className="w-full" disabled={createUserMutation.isPending}>
                {createUserMutation.isPending ? "Criando..." : "Criar Usuário"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuários</CardTitle>
          <CardDescription>
            {userRole === "superadmin" 
              ? "Todos os usuários cadastrados no sistema" 
              : "Usuários da sua empresa"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters - only for superadmin */}
          {userRole === "superadmin" && (
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por e-mail..."
                    value={emailFilter}
                    onChange={(e) => setEmailFilter(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por empresa..."
                    value={companyFilter}
                    onChange={(e) => setCompanyFilter(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  {userRole === "superadmin" && <TableHead>Empresa</TableHead>}
                  <TableHead>Permissão</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Último login</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers?.map((user: any) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    {userRole === "superadmin" && (
                      <TableCell>{user.company_name || "-"}</TableCell>
                    )}
                    <TableCell>
                      {user.role === "superadmin" 
                        ? "Super Admin" 
                        : user.role === "admin" 
                          ? "Administrador" 
                          : user.role === "user" 
                            ? "Colaborador" 
                            : "-"}
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      {user.last_sign_in_at
                        ? new Date(user.last_sign_in_at).toLocaleDateString("pt-BR")
                        : "Nunca"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(user.id)}
                        disabled={deleteUserMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
