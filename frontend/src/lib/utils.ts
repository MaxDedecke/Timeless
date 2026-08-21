import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** shadcn/ui-Standard: bedingte Klassen zusammenführen, Konflikte auflösen. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
