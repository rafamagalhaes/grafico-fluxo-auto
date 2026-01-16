import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Users } from "lucide-react";
import { ContactModal } from "./ContactModal";

type Contact = {
  id?: string;
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  position: string;
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

type ClientFormProps = {
  editingClient: Client | null;
  clientType: "fisica" | "juridica";
  onClientTypeChange: (type: "fisica" | "juridica") => void;
  onSubmit: (data: FormData, contacts: Contact[]) => void;
  isSubmitting: boolean;
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

export function ClientForm({
  editingClient,
  clientType,
  onClientTypeChange,
  onSubmit,
  isSubmitting,
}: ClientFormProps) {
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    onSubmit(formData, contacts);
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Tipo de Cliente *</Label>
          <RadioGroup
            name="client_type"
            value={clientType}
            onValueChange={(value) => onClientTypeChange(value as "fisica" | "juridica")}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="fisica" id="fisica" />
              <Label htmlFor="fisica" className="font-normal cursor-pointer">
                Pessoa Física
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="juridica" id="juridica" />
              <Label htmlFor="juridica" className="font-normal cursor-pointer">
                Pessoa Jurídica
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div>
          <Label htmlFor="name">
            {clientType === "juridica" ? "Razão Social *" : "Nome *"}
          </Label>
          <Input id="name" name="name" required defaultValue={editingClient?.name || ""} />
        </div>

        {clientType === "juridica" && (
          <>
            <div>
              <Label htmlFor="cnpj">CNPJ *</Label>
              <Input
                id="cnpj"
                name="cnpj"
                required
                defaultValue={editingClient?.cnpj ? formatCNPJ(editingClient.cnpj) : ""}
                onChange={(e) => {
                  e.target.value = formatCNPJ(e.target.value);
                }}
                maxLength={18}
                placeholder="00.000.000/0000-00"
              />
            </div>
            <div>
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                name="address"
                defaultValue={editingClient?.address || ""}
                placeholder="Endereço completo"
              />
            </div>
          </>
        )}

        <div>
          <Label htmlFor="phone">
            Telefone {clientType === "fisica" ? "*" : ""}
          </Label>
          <Input
            id="phone"
            name="phone"
            required={clientType === "fisica"}
            defaultValue={editingClient?.phone || ""}
          />
        </div>

        <div>
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={editingClient?.email || ""}
            placeholder="exemplo@email.com"
          />
        </div>

        {clientType === "fisica" && (
          <div>
            <Label htmlFor="birth_date">Data de Nascimento</Label>
            <Input
              id="birth_date"
              name="birth_date"
              type="date"
              defaultValue={editingClient?.birth_date || ""}
            />
          </div>
        )}

        {clientType === "juridica" && (
          <div className="border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Contatos</h4>
                <p className="text-sm text-muted-foreground">
                  {contacts.length === 0
                    ? "Nenhum contato adicionado"
                    : `${contacts.length} contato(s) adicionado(s)`}
                </p>
              </div>
              <Button type="button" variant="outline" onClick={() => setContactModalOpen(true)}>
                <Users className="mr-2 h-4 w-4" />
                {contacts.length === 0 ? "Novo Contato" : "Gerenciar Contatos"}
              </Button>
            </div>
          </div>
        )}

        {editingClient && (
          <div>
            <Label>Código</Label>
            <Input value={editingClient.code || "Gerado automaticamente"} disabled />
            <p className="text-xs text-muted-foreground mt-1">
              Código gerado automaticamente pelo sistema
            </p>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {editingClient ? "Atualizar" : "Criar"}
        </Button>
      </form>

      <ContactModal
        open={contactModalOpen}
        onOpenChange={setContactModalOpen}
        contacts={contacts}
        onContactsChange={setContacts}
      />
    </>
  );
}
