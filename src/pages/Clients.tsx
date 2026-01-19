import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUserCompany } from "@/hooks/use-user-company";
import { z } from "zod";
import { ClientForm } from "@/components/clients/ClientForm";
import { ClientViewModal } from "@/components/clients/ClientViewModal";

// Schema for Pessoa Física - phone is required
const clientSchemaFisica = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  phone: z.string().min(1, "Telefone é obrigatório"),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  birth_date: z.string().optional(),
  client_type: z.literal("fisica"),
  cnpj: z.string().optional(),
  address: z.string().optional(),
});

// Schema for Pessoa Jurídica - CNPJ is required, phone is optional
const clientSchemaJuridica = z.object({
  name: z.string().min(1, "Razão Social é obrigatória"),
  phone: z.string().optional().or(z.literal("")),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  birth_date: z.string().optional(),
  client_type: z.literal("juridica"),
  cnpj: z.string().min(1, "CNPJ é obrigatório"),
  nome_fantasia: z.string().optional(),
  address: z.string().optional(),
});

type Contact = {
  id?: string;
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  position: string;
};

type ClientInput = {
  name: string;
  phone?: string;
  email?: string;
  birth_date?: string;
  client_type: "fisica" | "juridica";
  cnpj?: string;
  nome_fantasia?: string;
  address?: string;
};

type Client = {
  id: string;
  code: string | null;
  name: string;
  phone: string;
  email?: string | null;
  birth_date: string | null;
  client_type?: "fisica" | "juridica";
  cnpj?: string | null;
  address?: string | null;
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
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
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

  const saveContactsMutation = useMutation({
    mutationFn: async ({ clientId, contacts }: { clientId: string; contacts: Contact[] }) => {
      // First delete existing contacts
      await supabase.from("client_contacts").delete().eq("client_id", clientId);
      
      // Then insert new contacts
      if (contacts.length > 0) {
        const contactsToInsert = contacts.map((c) => ({
          client_id: clientId,
          name: c.name,
          phone: c.phone || null,
          whatsapp: c.whatsapp || null,
          email: c.email || null,
          position: c.position || null,
        }));
        const { error } = await supabase.from("client_contacts").insert(contactsToInsert);
        if (error) throw error;
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: async ({ data, contacts }: { data: ClientInput; contacts: Contact[] }) => {
      if (!userCompany?.company_id) throw new Error("Company not found");
      
      const insertData = {
        ...data,
        phone: data.phone || "",
        company_id: userCompany.company_id,
      };
      
      const { data: newClient, error } = await supabase
        .from("clients")
        .insert([insertData])
        .select()
        .single();
      
      if (error) throw error;
      
      // Save contacts if any
      if (contacts.length > 0 && newClient) {
        await saveContactsMutation.mutateAsync({ clientId: newClient.id, contacts });
      }
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
    mutationFn: async ({ id, data, contacts }: { id: string; data: ClientInput; contacts: Contact[] }) => {
      const updateData = {
        ...data,
        phone: data.phone || "",
      };
      
      const { error } = await supabase.from("clients").update(updateData).eq("id", id);
      if (error) throw error;
      
      // Save contacts
      await saveContactsMutation.mutateAsync({ clientId: id, contacts });
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

  const handleFormSubmit = (formData: FormData, contacts: Contact[]) => {
    const rawData: ClientInput = {
      name: formData.get("name") as string,
      client_type: clientType,
    };

    const phone = formData.get("phone") as string;
    if (phone) rawData.phone = phone;

    const email = formData.get("email") as string;
    if (email) rawData.email = email;

    const address = formData.get("address") as string;
    if (address) rawData.address = address;

    // Only include birth_date for Pessoa Física
    if (clientType === "fisica") {
      const birthDate = formData.get("birth_date") as string;
      if (birthDate) rawData.birth_date = birthDate;
    } else {
      rawData.birth_date = undefined;
    }

    const cnpj = formData.get("cnpj") as string;
    if (cnpj) rawData.cnpj = cnpj.replace(/\D/g, "");

    const nomeFantasia = formData.get("nome_fantasia") as string;
    if (nomeFantasia) rawData.nome_fantasia = nomeFantasia;

    try {
      // Use different schema based on client type
      if (clientType === "fisica") {
        clientSchemaFisica.parse(rawData);
      } else {
        clientSchemaJuridica.parse(rawData);
      }
      
      if (editingClient) {
        updateMutation.mutate({ id: editingClient.id, data: rawData, contacts });
      } else {
        createMutation.mutate({ data: rawData, contacts });
      }
    } catch (error) {
      console.error("Validation error:", error);
      if (clientType === "juridica") {
        toast({ title: "CNPJ e Razão Social são obrigatórios", variant: "destructive" });
      } else {
        toast({ title: "Nome e Telefone são obrigatórios", variant: "destructive" });
      }
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
            setClientType(editingClient.client_type || "fisica");
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingClient(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingClient ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
            </DialogHeader>
            <ClientForm
              editingClient={editingClient}
              clientType={clientType}
              onClientTypeChange={setClientType}
              onSubmit={handleFormSubmit}
              isSubmitting={createMutation.isPending || updateMutation.isPending}
            />
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
                  <TableHead>Nome / Razão Social</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>E-mail</TableHead>
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
                    <TableCell>{client.phone || "-"}</TableCell>
                    <TableCell>{client.email || "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setViewingClient(client)}
                          title="Visualizar"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            setEditingClient(client);
                            setOpen(true);
                          }}
                          title="Editar"
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
                          title="Excluir"
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

      <ClientViewModal
        client={viewingClient}
        open={!!viewingClient}
        onOpenChange={(open) => !open && setViewingClient(null)}
      />
    </div>
  );
}