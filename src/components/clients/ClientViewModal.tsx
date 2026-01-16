import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

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

type ClientViewModalProps = {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("pt-BR");
};

export function ClientViewModal({ client, open, onOpenChange }: ClientViewModalProps) {
  const { data: contacts } = useQuery({
    queryKey: ["client-contacts", client?.id],
    queryFn: async () => {
      if (!client?.id) return [];
      const { data, error } = await supabase
        .from("client_contacts")
        .select("*")
        .eq("client_id", client.id);
      if (error) throw error;
      return data;
    },
    enabled: !!client?.id && client?.client_type === "juridica",
  });

  if (!client) return null;

  const isJuridica = client.client_type === "juridica";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Visualizar Cliente
            <Badge variant={isJuridica ? "default" : "secondary"}>
              {isJuridica ? "Pessoa Jurídica" : "Pessoa Física"}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Código</p>
              <p className="font-medium">{client.code || "Não gerado"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {isJuridica ? "Razão Social" : "Nome"}
              </p>
              <p className="font-medium">{client.name}</p>
            </div>
          </div>

          {isJuridica && client.cnpj && (
            <div>
              <p className="text-sm text-muted-foreground">CNPJ</p>
              <p className="font-medium">{formatCNPJ(client.cnpj)}</p>
            </div>
          )}

          {isJuridica && client.address && (
            <div>
              <p className="text-sm text-muted-foreground">Endereço</p>
              <p className="font-medium">{client.address}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {client.phone && (
              <div>
                <p className="text-sm text-muted-foreground">Telefone</p>
                <p className="font-medium">{client.phone}</p>
              </div>
            )}
            {client.email && (
              <div>
                <p className="text-sm text-muted-foreground">E-mail</p>
                <p className="font-medium">{client.email}</p>
              </div>
            )}
          </div>

          {!isJuridica && client.birth_date && (
            <div>
              <p className="text-sm text-muted-foreground">Data de Nascimento</p>
              <p className="font-medium">{formatDate(client.birth_date)}</p>
            </div>
          )}

          {isJuridica && contacts && contacts.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium mb-3">Contatos ({contacts.length})</h4>
                <div className="space-y-3">
                  {contacts.map((contact) => (
                    <div key={contact.id} className="border rounded-lg p-3 bg-muted/30">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Nome:</span>{" "}
                          <span className="font-medium">{contact.name}</span>
                        </div>
                        {contact.position && (
                          <div>
                            <span className="text-muted-foreground">Cargo:</span>{" "}
                            <span className="font-medium">{contact.position}</span>
                          </div>
                        )}
                        {contact.phone && (
                          <div>
                            <span className="text-muted-foreground">Telefone:</span>{" "}
                            <span className="font-medium">{contact.phone}</span>
                          </div>
                        )}
                        {contact.whatsapp && (
                          <div>
                            <span className="text-muted-foreground">WhatsApp:</span>{" "}
                            <span className="font-medium">{contact.whatsapp}</span>
                          </div>
                        )}
                        {contact.email && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">E-mail:</span>{" "}
                            <span className="font-medium">{contact.email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
