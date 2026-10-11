import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import { THEME_INIT_SCRIPT } from "@/hooks/useTheme";
import "./globals.css";

// Font variabile con asse larghezza: i titoli usano font-stretch 62–75%
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

export const metadata: Metadata = {
  title: "Eventi Torino",
  description: "Eventi a Torino e dintorni, su mappa o in lista, nel raggio che scegli.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0d0d" },
  ],
};

export default function RootLayout({ children, modal }: LayoutProps<"/">) {
  return (
    // data-theme viene impostato dallo script prima dell'idratazione
    <html lang="it" className={`${archivo.variable} antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-dvh bg-bg text-fg">
        {children}
        {modal}
      </body>
    </html>
  );
}
