import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LeadContactModal, LeadContact } from "./LeadContactModal";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Lead = {
  id?: string;
  code?: string;
  cnpj: string;
  razao_social: string;
  endereco: string;
  cargo: string;
  first_contact_date: string | null;
  second_contact_date: string | null;
  funnel_stage: string;
  owner_id?: string;
};

type LeadFormProps = {
  editingLead?: Lead | null;
  onSubmit: (data: Lead, contacts: LeadContact[]) => void;
  onCancel: () => void;
};

const formatCNPJ = (value: string) => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`;
  if (numbers.length <= 8)
    return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`;
  if (numbers.length <= 12)
    return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`;
  return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`;
};

export function LeadForm({ editingLead, onSubmit, onCancel }: LeadFormProps) {
  const [contacts, setContacts] = useState<LeadContact[]>([]);
  const [contactModalOpen, setContactModalOpen] = useState(false);

  // Fetch existing contacts when editing
  const { data: existingContacts } = useQuery({
    queryKey: ["lead-contacts", editingLead?.id],
    queryFn: async () => {
      if (!editingLead?.id) return [];
      const { data, error } = await supabase
        .from("lead_contacts")
        .select("*")
        .eq("lead_id", editingLead.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!editingLead?.id,
  });

  useEffect(() => {
    if (existingContacts) {
      setContacts(
        existingContacts.map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone || "",
          whatsapp: c.whatsapp || "",
          email: c.email || "",
          position: c.position || "",
        }))
      );
    }
  }, [existingContacts]);

  useEffect(() => {
    if (!editingLead) {
      setContacts([]);
    }
  }, [editingLead]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const leadData: Lead = {
      id: editingLead?.id,
      cnpj: formData.get("cnpj") as string,
      razao_social: formData.get("razao_social") as string,
      endereco: formData.get("endereco") as string,
      cargo: formData.get("cargo") as string,
      first_contact_date: (formData.get("first_contact_date") as string) || null,
      second_contact_date: (formData.get("second_contact_date") as string) || null,
      funnel_stage: formData.get("funnel_stage") as string,
    };

    onSubmit(leadData, contacts);
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="cnpj">CNPJ</Label>
            <Input
              id="cnpj"
              name="cnpj"
              defaultValue={editingLead?.cnpj || ""}
              onChange={(e) => {
                e.target.value = formatCNPJ(e.target.value);
              }}
              placeholder="00.000.000/0000-00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="razao_social">Razão Social *</Label>
            <Input
              id="razao_social"
              name="razao_social"
              defaultValue={editingLead?.razao_social || ""}
              required
              placeholder="Nome da empresa"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="endereco">Endereço</Label>
          <Input
            id="endereco"
            name="endereco"
            defaultValue={editingLead?.endereco || ""}
            placeholder="Endereço completo"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="cargo">Cargo</Label>
            <Input
              id="cargo"
              name="cargo"
              defaultValue={editingLead?.cargo || ""}
              placeholder="Cargo do contato principal"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="funnel_stage">Estágio no Funil *</Label>
            <Select
              name="funnel_stage"
              defaultValue={editingLead?.funnel_stage || "novo"}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o estágio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="novo">Novo</SelectItem>
                <SelectItem value="qualificado">Qualificado</SelectItem>
                <SelectItem value="em_negociacao">Em Negociação</SelectItem>
                <SelectItem value="descartado">Descartado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="first_contact_date">Data do 1º Contato</Label>
            <Input
              id="first_contact_date"
              name="first_contact_date"
              type="date"
              defaultValue={editingLead?.first_contact_date || ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="second_contact_date">Data do 2º Contato</Label>
            <Input
              id="second_contact_date"
              name="second_contact_date"
              type="date"
              defaultValue={editingLead?.second_contact_date || ""}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setContactModalOpen(true)}
          >
            Novo Contato ({contacts.length})
          </Button>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit">
            {editingLead ? "Salvar Alterações" : "Cadastrar Lead"}
          </Button>
        </div>
      </form>

      <LeadContactModal
        open={contactModalOpen}
        onOpenChange={setContactModalOpen}
        contacts={contacts}
        onContactsChange={setContacts}
      />
    </>
  );
}
