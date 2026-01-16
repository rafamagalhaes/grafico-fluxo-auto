import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Contact = {
  id?: string;
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  position: string;
};

type ContactModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: Contact[];
  onContactsChange: (contacts: Contact[]) => void;
};

const formatPhone = (value: string) => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 11) {
    return numbers
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2")
      .replace(/(-\d{4})\d+?$/, "$1");
  }
  return value;
};

export function ContactModal({ open, onOpenChange, contacts, onContactsChange }: ContactModalProps) {
  const { toast } = useToast();
  const [newContact, setNewContact] = useState<Contact>({
    name: "",
    phone: "",
    whatsapp: "",
    email: "",
    position: "",
  });

  const handleAddContact = () => {
    if (!newContact.name.trim()) {
      toast({ title: "Nome do contato é obrigatório", variant: "destructive" });
      return;
    }

    onContactsChange([...contacts, { ...newContact, id: crypto.randomUUID() }]);
    setNewContact({ name: "", phone: "", whatsapp: "", email: "", position: "" });
    toast({ title: "Contato adicionado!" });
  };

  const handleRemoveContact = (index: number) => {
    const updated = contacts.filter((_, i) => i !== index);
    onContactsChange(updated);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Contatos</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add new contact form */}
          <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
            <h4 className="font-medium">Novo Contato</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contact-name">Nome *</Label>
                <Input
                  id="contact-name"
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                  placeholder="Nome do contato"
                />
              </div>
              <div>
                <Label htmlFor="contact-position">Cargo</Label>
                <Input
                  id="contact-position"
                  value={newContact.position}
                  onChange={(e) => setNewContact({ ...newContact, position: e.target.value })}
                  placeholder="Ex: Gerente, Diretor"
                />
              </div>
              <div>
                <Label htmlFor="contact-phone">Telefone</Label>
                <Input
                  id="contact-phone"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: formatPhone(e.target.value) })}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                />
              </div>
              <div>
                <Label htmlFor="contact-whatsapp">WhatsApp</Label>
                <Input
                  id="contact-whatsapp"
                  value={newContact.whatsapp}
                  onChange={(e) => setNewContact({ ...newContact, whatsapp: formatPhone(e.target.value) })}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="contact-email">E-mail</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={newContact.email}
                  onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                  placeholder="contato@empresa.com"
                />
              </div>
            </div>
            <Button type="button" onClick={handleAddContact} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Contato
            </Button>
          </div>

          {/* Contact list */}
          {contacts.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium">Contatos Adicionados ({contacts.length})</h4>
              {contacts.map((contact, index) => (
                <div key={contact.id || index} className="border rounded-lg p-3 flex items-start justify-between gap-4">
                  <div className="flex-1 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-medium">Nome:</span> {contact.name}
                    </div>
                    {contact.position && (
                      <div>
                        <span className="font-medium">Cargo:</span> {contact.position}
                      </div>
                    )}
                    {contact.phone && (
                      <div>
                        <span className="font-medium">Telefone:</span> {contact.phone}
                      </div>
                    )}
                    {contact.whatsapp && (
                      <div>
                        <span className="font-medium">WhatsApp:</span> {contact.whatsapp}
                      </div>
                    )}
                    {contact.email && (
                      <div className="col-span-2">
                        <span className="font-medium">E-mail:</span> {contact.email}
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() => handleRemoveContact(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={() => onOpenChange(false)}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
