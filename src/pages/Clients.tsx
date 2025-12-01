import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUserCompany } from "@/hooks/use-user-company";
import { z } from "zod";

const clientSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  phone: z.string().min(1, "Telefone é obrigatório"),
  birth_date: z.string().optional(),
  client_type: z.enum(["fisica", "juridica"]),
  cnpj: z.string().optional(),
});

type ClientInput = {
  name: string;
  phone: string;
  birth_date?: string;
  client_type: "fisica" | "juridica";
  cnpj?: string;
};

type Client = {
  id: string;
  code: string | null;
  name: string;
  phone: string;
  birth_date: string | null;
  client_type?: "fisica" | "juridica";
  cnpj?: string | null;
};

const formatCNPJ = (value: string) => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 14) {
    return numbers
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return value;
};

export default function Clients() {
  const [open, setOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientType, setClientType] = useState<"fisica" | "juridica">("fisica");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: userCompany } = useUserCompany();

  const { data: clients, isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Client[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ClientInput) => {
      if (!userCompany?.company_id) throw new Error("Company not found");
      const { error } = await supabase.from("clients").insert([{ ...data, company_id: userCompany.company_id }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setOpen(false);
      toast({ title: "Cliente criado com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao criar cliente", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ClientInput }) => {
      const { error } = await supabase.from("clients").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setOpen(false);
      setEditingClient(null);
      toast({ title: "Cliente atualizado com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar cliente", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: "Cliente excluído com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao excluir cliente", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const rawData: any = {
      name: formData.get("name") as string,
      phone: formData.get("phone") as string,
      client_type: formData.get("client_type") as "fisica" | "juridica",
    };

    const birthDate = formData.get("birth_date") as string;
    if (birthDate) rawData.birth_date = birthDate;

    const cnpj = formData.get("cnpj") as string;
    if (cnpj) rawData.cnpj = cnpj.replace(/\D/g, "");

    try {
      clientSchema.parse(rawData);
      if (editingClient) {
        updateMutation.mutate({ id: editingClient.id, data: rawData });
      } else {
        createMutation.mutate(rawData);
      }
    } catch (error) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">Gerencie seus clientes</p>
        </div>
        <Dialog open={open} onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (isOpen && !editingClient) {
            setClientType("fisica");
          } else if (isOpen && editingClient) {
            setClientType(editingClient.client_type);
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingClient(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingClient ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Tipo de Cliente *</Label>
                <RadioGroup
                  name="client_type"
                  value={clientType}
                  onValueChange={(value) => setClientType(value as "fisica" | "juridica")}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fisica" id="fisica" />
                    <Label htmlFor="fisica" className="font-normal cursor-pointer">Pessoa Física</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="juridica" id="juridica" />
                    <Label htmlFor="juridica" className="font-normal cursor-pointer">Pessoa Jurídica</Label>
                  </div>
                </RadioGroup>
              </div>
              <div>
                <Label htmlFor="name">Nome *</Label>
                <Input id="name" name="name" required defaultValue={editingClient?.name || ""} />
              </div>
              {clientType === "juridica" && (
                <div>
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    name="cnpj"
                    defaultValue={editingClient?.cnpj ? formatCNPJ(editingClient.cnpj) : ""}
                    onChange={(e) => {
                      e.target.value = formatCNPJ(e.target.value);
                    }}
                    maxLength={18}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
              )}
              <div>
                <Label htmlFor="phone">Telefone *</Label>
                <Input id="phone" name="phone" required defaultValue={editingClient?.phone || ""} />
              </div>
              <div>
                <Label htmlFor="birth_date">Data de Nascimento</Label>
                <Input id="birth_date" name="birth_date" type="date" defaultValue={editingClient?.birth_date || ""} />
              </div>
              {editingClient && (
                <div>
                  <Label>Código</Label>
                  <Input value={editingClient.code || "Gerado automaticamente"} disabled />
                  <p className="text-xs text-muted-foreground mt-1">Código gerado automaticamente pelo sistema</p>
                </div>
              )}
              <Button type="submit" className="w-full">
                {editingClient ? "Atualizar" : "Criar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Carregando...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Data de Nascimento</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients?.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>{client.code || "-"}</TableCell>
                    <TableCell>{client.client_type === "fisica" ? "Física" : "Jurídica"}</TableCell>
                    <TableCell>{client.name}</TableCell>
                    <TableCell>{client.cnpj ? formatCNPJ(client.cnpj) : "-"}</TableCell>
                    <TableCell>{client.phone}</TableCell>
                    <TableCell>{client.birth_date ? new Date(client.birth_date).toLocaleDateString("pt-BR") : "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            setEditingClient(client);
                            setOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => {
                            if (confirm("Tem certeza que deseja excluir este cliente?")) {
                              deleteMutation.mutate(client.id);
                            }
                          }}
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
    </div>
  );
}
