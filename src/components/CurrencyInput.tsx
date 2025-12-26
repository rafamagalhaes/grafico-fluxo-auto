import React, { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { parseCurrency, formatCurrency } from "@/lib/currency";

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number;
  onChange: (value: number) => void;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({ value, onChange, ...props }) => {
  const [displayValue, setDisplayValue] = useState<string>(formatCurrency(value));

  // Atualiza o valor de exibição quando o valor numérico muda externamente
  useEffect(() => {
    // Evita atualizar o displayValue enquanto o usuário está digitando
    if (document.activeElement !== document.getElementById(props.id || '')) {
      setDisplayValue(formatCurrency(value));
    }
  }, [value, props.id]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    
    // Remove tudo que não for dígito ou vírgula
    let cleanedValue = rawValue.replace(/[^\d,]/g, '');

    // Garante que haja apenas uma vírgula
    const parts = cleanedValue.split(',');
    if (parts.length > 2) {
      cleanedValue = parts[0] + ',' + parts.slice(1).join('');
    }

    // Limita a duas casas decimais após a vírgula
    if (parts.length === 2 && parts[1].length > 2) {
      cleanedValue = parts[0] + ',' + parts[1].substring(0, 2);
    }

    setDisplayValue(cleanedValue);

    // Converte para número e notifica o componente pai
    const numericValue = parseCurrency(cleanedValue);
    onChange(numericValue);
  }, [onChange]);

  const handleBlur = useCallback(() => {
    // Formata o valor para o padrão X.XXX,XX ao perder o foco
    setDisplayValue(formatCurrency(value));
  }, [value]);

  const handleFocus = useCallback(() => {
    // Remove a formatação ao ganhar foco para facilitar a edição
    const rawValue = String(value).replace('.', ',');
    setDisplayValue(rawValue);
  }, [value]);

  return (
    <Input
      {...props}
      type="text"
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      placeholder="0,00"
    />
  );
};
