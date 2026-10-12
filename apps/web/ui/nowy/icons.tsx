import type { SVGProps } from "react";

/** Icone Nowy: tratto 2.25, terminali squadrati, colore dal testo. Sempre decorative. */
const PATHS = {
  external: "M7 17 17 7M8 7h9v9",
  left: "M15 5 8 12l7 7",
  right: "m9 5 7 7-7 7",
  close: "M6 6l12 12M18 6 6 18",
  sliders: "M4 7h10M18 7h2M4 17h4M12 17h8M14 4v6M8 14v6",
  check: "m5 12 5 5 9-10",
  map: "M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14",
  list: "M4 6h16M4 12h16M4 18h16",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v5M16 3v5",
  share: "M12 3v12M7 8l5-5 5 5M5 13v8h14v-8",
  star: "m12 3 2.8 5.8 6.2.9-4.5 4.4 1 6.3L12 17.5 6.5 20.4l1-6.3L3 9.7l6.2-.9z",
  locate: "M12 2v4M12 18v4M2 12h4M18 12h4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  theme: "M12 3a9 9 0 1 0 0 18zM12 3a9 9 0 0 1 0 18",
  fit: "M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, filled, ...props }: { name: IconName; filled?: boolean } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
