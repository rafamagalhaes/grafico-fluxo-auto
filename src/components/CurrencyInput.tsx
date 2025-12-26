import React, { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { parseCurrency, formatCurrency } from "@/lib/currency";

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number;
  onChange: (value: number) => void;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({ value, onChange, ...props }) => {
  const [displayValue, setDisplayValue] = useState<string>(formatCurrency(value));
  const [cursor, setCursor] = useState<number | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // 1. Atualiza o valor de exibição quando o valor numérico muda externamente
  useEffect(() => {
    if (inputRef.current && document.activeElement !== inputRef.current) {
      setDisplayValue(formatCurrency(value));
    }
  }, [value]);

  // 2. Restaura a posição do cursor após a renderização
  useEffect(() => {
    if (inputRef.current && cursor !== null) {
      inputRef.current.selectionStart = cursor;
      inputRef.current.selectionEnd = cursor;
    }
  }, [cursor, displayValue]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const rawValue = input.value;
    const oldCursor = input.selectionStart;

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

    // Calcula a nova posição do cursor
    let newCursor = oldCursor;
    // Se o novo valor for menor que o antigo, o cursor deve ser ajustado
    if (cleanedValue.length < rawValue.length) {
      newCursor = Math.max(0, oldCursor - (rawValue.length - cleanedValue.length));
    } else if (cleanedValue.length > rawValue.length) {
      newCursor = oldCursor + (cleanedValue.length - rawValue.length);
    }
    
    // Se o cursor estava após a vírgula e a vírgula foi removida, ajusta
    if (oldCursor && rawValue[oldCursor - 1] === ',' && cleanedValue.indexOf(',') === -1) {
      newCursor = oldCursor - 1;
    }

    setDisplayValue(cleanedValue);
    setCursor(newCursor);

    // Converte para número e notifica o componente pai
    const numericValue = parseCurrency(cleanedValue);
    onChange(numericValue);
  }, [onChange]);

  const handleBlur = useCallback(() => {
    // Formata o valor para o padrão X.XXX,XX ao perder o foco
    setDisplayValue(formatCurrency(value));
    setCursor(null); // Limpa o cursor
  }, [value]);

  const handleFocus = useCallback(() => {
    // Remove a formatação ao ganhar foco para facilitar a edição
    const rawValue = String(value).replace('.', ',');
    setDisplayValue(rawValue);
    // Coloca o cursor no final do valor
    setCursor(rawValue.length);
  }, [value]);

  return (
    <Input
      {...props}
      ref={inputRef}
      type="text"
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      placeholder="0,00"
    />
  );
};
