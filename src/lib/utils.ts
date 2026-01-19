import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a date string (YYYY-MM-DD) to pt-BR locale without timezone issues.
 * This prevents the date from being shifted by 1 day due to UTC conversion.
 */
export function formatDateBR(dateString: string | null | undefined): string {
  if (!dateString) return "-";
  
  // Parse the date parts directly to avoid timezone conversion issues
  const [year, month, day] = dateString.split("-").map(Number);
  if (!year || !month || !day) return "-";
  
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
}

/**
 * Formats a CNPJ string (only digits) to the standard format XX.XXX.XXX/XXXX-XX
 */
export function formatCNPJ(cnpj: string | null | undefined): string {
  if (!cnpj) return "-";
  
  const numbers = cnpj.replace(/\D/g, "");
  if (numbers.length !== 14) return cnpj;
  
  return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`;
}
