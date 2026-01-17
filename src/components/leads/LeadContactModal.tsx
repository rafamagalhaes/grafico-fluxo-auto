import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { X } from "lucide-react";

export type LeadContact = {
  id?: string;
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  position: string;
};

type LeadContactModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: LeadContact[];
  onContactsChange: (contacts: LeadContact[]) => void;
};

const formatPhone = (value: string) => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 7)
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  if (numbers.length <= 11)
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
};

export function LeadContactModal({
  open,
  onOpenChange,
  contacts,
  onContactsChange,
}: LeadContactModalProps) {
  const { toast } = useToast();
  const [newContact, setNewContact] = useState<LeadContact>({
    name: "",
    phone: "",
    whatsapp: "",
    email: "",
    position: "",
  });

  const handleAddContact = () => {
    if (!newContact.name.trim()) {
      toast({
        title: "Erro",
        description: "O nome do contato é obrigatório",
        variant: "destructive",
      });
      return;
    }

    onContactsChange([...contacts, newContact]);
    setNewContact({
      name: "",
      phone: "",
      whatsapp: "",
      email: "",
      position: "",
    });
    toast({
      title: "Contato adicionado",
      description: "O contato foi adicionado com sucesso",
    });
  };

  const handleRemoveContact = (index: number) => {
    const updatedContacts = contacts.filter((_, i) => i !== index);
    onContactsChange(updatedContacts);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Contatos do Lead</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact-name">Nome *</Label>
              <Input
                id="contact-name"
                value={newContact.name}
                onChange={(e) =>
                  setNewContact({ ...newContact, name: e.target.value })
                }
                placeholder="Nome do contato"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-position">Cargo</Label>
              <Input
                id="contact-position"
                value={newContact.position}
                onChange={(e) =>
                  setNewContact({ ...newContact, position: e.target.value })
                }
                placeholder="Cargo"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact-phone">Telefone</Label>
              <Input
                id="contact-phone"
                value={newContact.phone}
                onChange={(e) =>
                  setNewContact({
                    ...newContact,
                    phone: formatPhone(e.target.value),
                  })
                }
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-whatsapp">WhatsApp</Label>
              <Input
                id="contact-whatsapp"
                value={newContact.whatsapp}
                onChange={(e) =>
                  setNewContact({
                    ...newContact,
                    whatsapp: formatPhone(e.target.value),
                  })
                }
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-email">E-mail</Label>
            <Input
              id="contact-email"
              type="email"
              value={newContact.email}
              onChange={(e) =>
                setNewContact({ ...newContact, email: e.target.value })
              }
              placeholder="email@exemplo.com"
            />
          </div>

          <Button type="button" onClick={handleAddContact}>
            Adicionar Contato
          </Button>

          {contacts.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium mb-2">Contatos adicionados:</h4>
              <div className="space-y-2">
                {contacts.map((contact, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{contact.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {contact.position && `${contact.position} • `}
                        {contact.phone || contact.email}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveContact(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
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
