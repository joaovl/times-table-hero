import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  safelist: [
    // Explicit gradient classes - force generation
    'bg-gradient-to-b',
    'bg-gradient-to-t',
    'bg-gradient-to-r',
    'bg-gradient-to-l',
    // Primary gradient stops
    'from-primary',
    'from-primary/90',
    'from-primary/80',
    'from-primary/70',
    'via-primary',
    'via-primary/90',
    'via-primary/80',
    'to-primary',
    'to-primary/90',
    'to-primary/80',
    'to-primary/70',
    // Secondary gradient stops
    'from-secondary',
    'from-secondary/90',
    'from-secondary/85',
    'from-secondary/80',
    'from-secondary/65',
    'from-secondary/60',
    'via-secondary',
    'via-secondary/90',
    'via-secondary/85',
    'via-secondary/80',
    'to-secondary',
    'to-secondary/90',
    'to-secondary/80',
    'to-secondary/70',
    'to-secondary/65',
    'to-secondary/60',
    // Hover variants
    'hover:from-secondary/80',
    'hover:via-secondary/80',
    'hover:to-secondary/60',
    'hover:shadow-2xl',
    // Shadows and borders
    'shadow-xl',
    'shadow-2xl',
    'shadow-lg',
    'border-card-border',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        comfortaa: ["Comfortaa", "cursive"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
          border: "hsl(var(--card-border))",
        },
        game: {
          teal: "hsl(var(--game-teal))",
          coral: "hsl(var(--game-coral))",
          yellow: "hsl(var(--game-yellow))",
          green: "hsl(var(--game-green))",
          purple: "hsl(var(--game-purple))",
          blue: "hsl(var(--game-blue))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
        button: "var(--shadow-button)",
        card: "var(--shadow-card)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
