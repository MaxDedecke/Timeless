/** @type {import('tailwindcss').Config} */

// Zentrales Design-System (docs/design-konzept.md): Farben ausschließlich als
// semantische shadcn/ui-CSS-Variablen aus src/index.css – rohe Hex-Werte
// gehören nicht in Komponenten. tailwindcss-animate liefert die Enter/Exit-
// Klassen für Radix-Primitives (Sheet/Dialog).
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          hover: "hsl(var(--primary-hover))",
          tint: "hsl(var(--primary-tint))",
          foreground: "hsl(var(--primary-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          tint: "hsl(var(--accent-tint))",
          foreground: "hsl(var(--accent-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          background: "hsl(var(--success-background))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          background: "hsl(var(--warning-background))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          background: "hsl(var(--destructive-background))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          background: "hsl(var(--info-background))",
        },
        // Dunkler Neutral-Ton der Sidebar (Konzept: hsl(213 30% 14%)).
        sidebar: {
          DEFAULT: "hsl(var(--sidebar))",
          foreground: "hsl(var(--sidebar-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
