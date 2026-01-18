import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDateBR } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Pencil, Trash2, UserCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUserCompany } from "@/hooks/use-user-company";
import { LeadForm, Lead } from "@/components/leads/LeadForm";
import { LeadViewModal } from "@/components/leads/LeadViewModal";
import { LeadContact } from "@/components/leads/LeadContactModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const funnelStageLabels: Record<string, string> = {
  novo: "Novo",
  qualificado: "Qualificado",
  em_negociacao: "Em Negociação",
  descartado: "Descartado",
};

const funnelStageColors: Record<string, string> = {
  novo: "bg-blue-100 text-blue-800",
  qualificado: "bg-green-100 text-green-800",
  em_negociacao: "bg-yellow-100 text-yellow-800",
  descartado: "bg-red-100 text-red-800",
};

export default function Leads() {
  const [open, setOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [viewingLead, setViewingLead] = useState<any | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<string | null>(null);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [leadToConvert, setLeadToConvert] = useState<any | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: userCompany } = useUserCompany();

  const { data: leads, isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async ({ lead, contacts }: { lead: Lead; contacts: LeadContact[] }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("leads")
        .insert({
          cnpj: lead.cnpj?.replace(/\D/g, "") || null,
          razao_social: lead.razao_social,
          endereco: lead.endereco || null,
          cargo: lead.cargo || null,
          first_contact_date: lead.first_contact_date || null,
          second_contact_date: lead.second_contact_date || null,
          funnel_stage: lead.funnel_stage,
          company_id: userCompany?.company_id,
          owner_id: userData.user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Save contacts
      if (contacts.length > 0) {
        const { error: contactsError } = await supabase
          .from("lead_contacts")
          .insert(
            contacts.map((c) => ({
              lead_id: data.id,
              name: c.name,
              phone: c.phone || null,
              whatsapp: c.whatsapp || null,
              email: c.email || null,
              position: c.position || null,
            }))
          );
        if (contactsError) throw contactsError;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setOpen(false);
      toast({
        title: "Lead cadastrado",
        description: "O lead foi cadastrado com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao cadastrar lead",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ lead, contacts }: { lead: Lead; contacts: LeadContact[] }) => {
      const { data, error } = await supabase
        .from("leads")
        .update({
          cnpj: lead.cnpj?.replace(/\D/g, "") || null,
          razao_social: lead.razao_social,
          endereco: lead.endereco || null,
          cargo: lead.cargo || null,
          first_contact_date: lead.first_contact_date || null,
          second_contact_date: lead.second_contact_date || null,
          funnel_stage: lead.funnel_stage,
        })
        .eq("id", lead.id)
        .select()
        .single();

      if (error) throw error;

      // Delete existing contacts and insert new ones
      await supabase.from("lead_contacts").delete().eq("lead_id", lead.id);

      if (contacts.length > 0) {
        const { error: contactsError } = await supabase
          .from("lead_contacts")
          .insert(
            contacts.map((c) => ({
              lead_id: lead.id,
              name: c.name,
              phone: c.phone || null,
              whatsapp: c.whatsapp || null,
              email: c.email || null,
              position: c.position || null,
            }))
          );
        if (contactsError) throw contactsError;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setOpen(false);
      setEditingLead(null);
      toast({
        title: "Lead atualizado",
        description: "O lead foi atualizado com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar lead",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast({
        title: "Lead excluído",
        description: "O lead foi excluído com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir lead",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const convertToClientMutation = useMutation({
    mutationFn: async (lead: any) => {
      // Get lead contacts
      const { data: contacts } = await supabase
        .from("lead_contacts")
        .select("*")
        .eq("lead_id", lead.id);

      // Create client
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .insert({
          name: lead.razao_social,
          phone: contacts?.[0]?.phone || "",
          cnpj: lead.cnpj,
          address: lead.endereco,
          email: contacts?.[0]?.email || null,
          client_type: "juridica",
          company_id: userCompany?.company_id,
        })
        .select()
        .single();

      if (clientError) throw clientError;

      // Create client contacts from lead contacts
      if (contacts && contacts.length > 0) {
        const { error: contactsError } = await supabase
          .from("client_contacts")
          .insert(
            contacts.map((c) => ({
              client_id: client.id,
              name: c.name,
              phone: c.phone || null,
              whatsapp: c.whatsapp || null,
              email: c.email || null,
              position: c.position || null,
            }))
          );
        if (contactsError) throw contactsError;
      }

      // Delete the lead
      const { error: deleteError } = await supabase
        .from("leads")
        .delete()
        .eq("id", lead.id);

      if (deleteError) throw deleteError;

      return client;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setConvertDialogOpen(false);
      setLeadToConvert(null);
      toast({
        title: "Lead convertido",
        description: "O lead foi convertido em cliente com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao converter lead",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: Lead, contacts: LeadContact[]) => {
    if (editingLead) {
      updateMutation.mutate({ lead: { ...data, id: editingLead.id }, contacts });
    } else {
      createMutation.mutate({ lead: data, contacts });
    }
  };

  const handleEdit = (lead: any) => {
    setEditingLead({
      id: lead.id,
      code: lead.code,
      cnpj: lead.cnpj || "",
      razao_social: lead.razao_social,
      endereco: lead.endereco || "",
      cargo: lead.cargo || "",
      first_contact_date: lead.first_contact_date || "",
      second_contact_date: lead.second_contact_date || "",
      funnel_stage: lead.funnel_stage,
    });
    setOpen(true);
  };

  const handleView = (lead: any) => {
    setViewingLead(lead);
    setViewModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setLeadToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (leadToDelete) {
      deleteMutation.mutate(leadToDelete);
      setDeleteDialogOpen(false);
      setLeadToDelete(null);
    }
  };

  const handleConvert = (lead: any) => {
    setLeadToConvert(lead);
    setConvertDialogOpen(true);
  };

  const confirmConvert = () => {
    if (leadToConvert) {
      convertToClientMutation.mutate(leadToConvert);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Leads</h1>
          <p className="text-muted-foreground">
            Gerencie seus leads e oportunidades de vendas
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingLead(null);
            setOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo Lead
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Razão Social</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>Estágio</TableHead>
              <TableHead>1º Contato</TableHead>
              <TableHead>2º Contato</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : leads?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  Nenhum lead cadastrado
                </TableCell>
              </TableRow>
            ) : (
              leads?.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">{lead.code}</TableCell>
                  <TableCell>{lead.razao_social}</TableCell>
                  <TableCell>{lead.cnpj || "-"}</TableCell>
                  <TableCell>
                    <Badge className={funnelStageColors[lead.funnel_stage] || ""}>
                      {funnelStageLabels[lead.funnel_stage] || lead.funnel_stage}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {formatDateBR(lead.first_contact_date)}
                  </TableCell>
                  <TableCell>
                    {formatDateBR(lead.second_contact_date)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleView(lead)}
                        title="Visualizar"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(lead)}
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleConvert(lead)}
                        title="Converter em Cliente"
                      >
                        <UserCheck className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(lead.id)}
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (!value) setEditingLead(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingLead ? "Editar Lead" : "Novo Lead"}
            </DialogTitle>
          </DialogHeader>
          <LeadForm
            editingLead={editingLead}
            onSubmit={handleSubmit}
            onCancel={() => {
              setOpen(false);
              setEditingLead(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <LeadViewModal
        lead={viewingLead}
        open={viewModalOpen}
        onOpenChange={setViewModalOpen}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este lead? Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Converter Lead em Cliente</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja converter o lead "{leadToConvert?.razao_social}" em cliente?
              O lead será removido e um novo cliente será criado com os mesmos
              dados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmConvert}>
              Converter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
