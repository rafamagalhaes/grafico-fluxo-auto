import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type QuoteProduct = {
  id: string;
  product_name: string;
  sale_value: number;
};

type ProductSelectorProps = {
  quoteId?: string | null;
  onTotalCalculated: (total: number) => void;
};

export default function ProductSelector({ quoteId, onTotalCalculated }: ProductSelectorProps) {
  const [productName, setProductName] = useState("");
  const [saleValue, setSaleValue] = useState("");
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: quoteProducts = [] } = useQuery({
    queryKey: ["quote-products", quoteId],
    queryFn: async () => {
      if (!quoteId) return [];
      const { data, error } = await supabase
        .from("quote_products")
        .select("*")
        .eq("quote_id", quoteId);
      if (error) throw error;
      return data as QuoteProduct[];
    },
    enabled: !!quoteId,
  });

  const addProductMutation = useMutation({
    mutationFn: async (data: { product_name: string; sale_value: number }) => {
      if (!quoteId) throw new Error("Quote ID is required");
      const { error } = await supabase.from("quote_products").insert([
        {
          quote_id: quoteId,
          product_name: data.product_name,
          sale_value: data.sale_value,
        },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quote-products", quoteId] });
      setProductName("");
      setSaleValue("");
      setIsAddingProduct(false);
      toast({ title: "Produto adicionado com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao adicionar produto", description: error.message, variant: "destructive" });
    },
  });

  const removeProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase.from("quote_products").delete().eq("id", productId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quote-products", quoteId] });
      toast({ title: "Produto removido com sucesso!" });
    },
  });

  const handleAddProduct = () => {
    if (!productName || !saleValue) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    addProductMutation.mutate({
      product_name: productName,
      sale_value: parseFloat(saleValue),
    });
  };

  // Calculate total whenever products change
  const totalValue = quoteProducts.reduce((sum, product) => sum + Number(product.sale_value), 0);
  
  // Notify parent component of total changes
  if (onTotalCalculated) {
    onTotalCalculated(totalValue);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Dialog open={isAddingProduct} onOpenChange={setIsAddingProduct}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" className="w-full">
              Inserir Produto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Produto</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="product_name">Nome do Produto *</Label>
                <Input
                  id="product_name"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="Digite o nome do produto"
                />
              </div>
              <div>
                <Label htmlFor="sale_value">Valor de Venda *</Label>
                <Input
                  id="sale_value"
                  type="number"
                  step="0.01"
                  value={saleValue}
                  onChange={(e) => setSaleValue(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <Button onClick={handleAddProduct} className="w-full">
                Incluir Novo
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {quoteProducts.length > 0 ? (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead className="w-20">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quoteProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>{product.product_name}</TableCell>
                  <TableCell>R$ {Number(product.sale_value).toFixed(2)}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeProductMutation.mutate(product.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex justify-end items-center gap-2 pt-4 border-t">
            <span className="font-semibold">Valor Total:</span>
            <span className="text-lg text-primary font-bold">
              R$ {totalValue.toFixed(2)}
            </span>
          </div>
        </>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <p>Nenhum produto adicionado</p>
          <p className="text-sm">Clique em "Inserir Produto" para adicionar produtos</p>
        </div>
      )}
    </div>
  );
}
