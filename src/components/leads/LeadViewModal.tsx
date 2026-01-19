import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDateBR } from "@/lib/utils";
import { Pencil } from "lucide-react";

type Lead = {
  id: string;
  code?: string;
  cnpj: string | null;
  razao_social: string;
  nome_fantasia: string | null;
  endereco: string | null;
  descricao: string | null;
  first_contact_date: string | null;
  second_contact_date: string | null;
  funnel_stage: string;
  owner_id: string;
};

type LeadViewModalProps = {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (lead: Lead) => void;
};

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

export function LeadViewModal({ lead, open, onOpenChange, onEdit }: LeadViewModalProps) {
  const { data: contacts } = useQuery({
    queryKey: ["lead-contacts-view", lead?.id],
    queryFn: async () => {
      if (!lead?.id) return [];
      const { data, error } = await supabase
        .from("lead_contacts")
        .select("*")
        .eq("lead_id", lead.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!lead?.id,
  });

  if (!lead) return null;

  const handleEdit = () => {
    if (onEdit) {
      onEdit(lead);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              {lead.code && <span className="text-muted-foreground">{lead.code}</span>}
              {lead.razao_social}
            </DialogTitle>
            {onEdit && (
              <Button variant="outline" size="sm" onClick={handleEdit}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">CNPJ</p>
              <p className="font-medium">{lead.cnpj || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Nome Fantasia</p>
              <p className="font-medium">{lead.nome_fantasia || "-"}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Endereço</p>
              <p className="font-medium">{lead.endereco || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Estágio no Funil</p>
              <Badge className={funnelStageColors[lead.funnel_stage] || ""}>
                {funnelStageLabels[lead.funnel_stage] || lead.funnel_stage}
              </Badge>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Descrição</p>
            <p className="font-medium">{lead.descricao || "-"}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Data do 1º Contato</p>
              <p className="font-medium">
                {formatDateBR(lead.first_contact_date)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Data do 2º Contato</p>
              <p className="font-medium">
                {formatDateBR(lead.second_contact_date)}
              </p>
            </div>
          </div>

          {contacts && contacts.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Contatos</h3>
              <div className="space-y-2">
                {contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="p-3 border rounded-lg"
                  >
                    <p className="font-medium">{contact.name}</p>
                    <div className="text-sm text-muted-foreground space-y-1">
                      {contact.position && <p>Cargo: {contact.position}</p>}
                      {contact.phone && <p>Telefone: {contact.phone}</p>}
                      {contact.whatsapp && <p>WhatsApp: {contact.whatsapp}</p>}
                      {contact.email && <p>E-mail: {contact.email}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
