"use client";

import { useTheme } from "@/hooks/useTheme";

const LABELS = { system: "Auto", light: "Chiaro", dark: "Scuro" } as const;

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { choice, cycle } = useTheme();
  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Tema: ${LABELS[choice]}. Cambia tema`}
      className={className}
      suppressHydrationWarning
    >
      <span aria-hidden="true">◐ </span>
      <span suppressHydrationWarning>{LABELS[choice]}</span>
    </button>
  );
}
