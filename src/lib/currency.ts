// Funções auxiliares para máscara de moeda (R$)
export const formatCurrency = (value: number): string => {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const parseCurrency = (value: string): number => {
  // Remove R$, pontos e substitui vírgula por ponto para o parseFloat
  const cleaned = value.replace(/[^\d,]/g, "").replace(",", ".");
  return parseFloat(cleaned) || 0;
};

// Função para formatar o valor para exibição com R$
export const formatCurrencyDisplay = (value: number): string => {
  return `R$ ${formatCurrency(value)}`;
};
