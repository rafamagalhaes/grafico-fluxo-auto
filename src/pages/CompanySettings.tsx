import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserCompany } from "@/hooks/use-user-company";
import { useAutoRefresh, AutoRefreshInterval } from "@/hooks/use-auto-refresh";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, Trash2, RefreshCw } from "lucide-react";

export default function CompanySettings() {
  const { data: userCompany } = useUserCompany();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const { interval: autoRefreshInterval, setInterval: setAutoRefreshInterval } = useAutoRefresh();

  const refreshIntervalOptions = [
    { value: "0", label: "Desativado" },
    { value: "1", label: "1 minuto" },
    { value: "5", label: "5 minutos" },
    { value: "10", label: "10 minutos" },
    { value: "30", label: "30 minutos" },
    { value: "60", label: "1 hora" },
  ];

  const handleRefreshIntervalChange = (value: string) => {
    const newInterval = parseInt(value, 10) as AutoRefreshInterval;
    setAutoRefreshInterval(newInterval);
    toast.success(
      newInterval === 0
        ? "Auto refresh desativado"
        : `Auto refresh configurado para ${refreshIntervalOptions.find(o => o.value === value)?.label}`
    );
  };

  const { data: company } = useQuery({
    queryKey: ["company", userCompany?.company_id],
    queryFn: async () => {
      if (!userCompany?.company_id) return null;
      
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", userCompany.company_id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!userCompany?.company_id,
  });

  const uploadLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!userCompany?.company_id) throw new Error("Empresa não encontrada");

      const fileExt = file.name.split(".").pop();
      const fileName = `${userCompany.company_id}/logo.${fileExt}`;

      // Upload da imagem
      const { error: uploadError } = await supabase.storage
        .from("company-logos")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from("company-logos")
        .getPublicUrl(fileName);

      // Atualizar empresa com a URL da logo
      const { error: updateError } = await supabase
        .from("companies")
        .update({ logo_url: publicUrl })
        .eq("id", userCompany.company_id);

      if (updateError) throw updateError;

      return publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company"] });
      toast.success("Logo atualizada com sucesso!");
      setUploading(false);
    },
    onError: (error) => {
      console.error("Erro ao fazer upload da logo:", error);
      toast.error("Erro ao fazer upload da logo");
      setUploading(false);
    },
  });

  const deleteLogoMutation = useMutation({
    mutationFn: async () => {
      if (!userCompany?.company_id || !company?.logo_url) {
        throw new Error("Nenhuma logo para deletar");
      }

      // Deletar arquivo do storage
      const fileName = `${userCompany.company_id}/logo.${company.logo_url.split(".").pop()}`;
      const { error: deleteError } = await supabase.storage
        .from("company-logos")
        .remove([fileName]);

      if (deleteError) throw deleteError;

      // Remover URL da empresa
      const { error: updateError } = await supabase
        .from("companies")
        .update({ logo_url: null })
        .eq("id", userCompany.company_id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company"] });
      toast.success("Logo removida com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao remover logo:", error);
      toast.error("Erro ao remover logo");
    },
  });

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem");
      return;
    }

    // Validar tamanho (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2MB");
      return;
    }

    setUploading(true);
    uploadLogoMutation.mutate(file);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações da Empresa</h1>
        <p className="text-muted-foreground">
          Personalize a aparência da sua empresa no sistema
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Logo da Empresa</CardTitle>
          <CardDescription>
            Adicione a logo da sua empresa para personalizar o sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {company?.logo_url && (
            <div className="flex items-center gap-4">
              <img
                src={company.logo_url}
                alt="Logo da empresa"
                className="h-20 w-auto object-contain rounded border"
              />
              <Button
                variant="destructive"
                size="icon"
                onClick={() => deleteLogoMutation.mutate()}
                disabled={deleteLogoMutation.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="logo">
              {company?.logo_url ? "Alterar Logo" : "Adicionar Logo"}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="logo"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={uploading}
              />
              <Button disabled={uploading} size="icon" variant="secondary">
                <Upload className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Formatos aceitos: PNG, JPG, GIF. Tamanho máximo: 2MB
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Auto Refresh do Dashboard
          </CardTitle>
          <CardDescription>
            Configure a atualização automática dos dados do Dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Intervalo de Atualização</Label>
            <Select
              value={String(autoRefreshInterval)}
              onValueChange={handleRefreshIntervalChange}
            >
              <SelectTrigger className="w-full md:w-[300px]">
                <SelectValue placeholder="Selecione o intervalo" />
              </SelectTrigger>
              <SelectContent>
                {refreshIntervalOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Quando ativado, o Dashboard será atualizado automaticamente no intervalo configurado.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informações da Empresa</CardTitle>
          <CardDescription>
            Dados cadastrais da empresa
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={company?.name || ""} disabled />
          </div>
          <div className="space-y-2">
            <Label>Documento</Label>
            <Input value={company?.document || ""} disabled />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
