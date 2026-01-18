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
