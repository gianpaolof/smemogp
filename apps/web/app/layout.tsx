import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import { BG, THEME_INIT_SCRIPT } from "@/hooks/useTheme";
import { PwaBoot } from "@/ui/nowy/PwaBoot";
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
  applicationName: "Eventi Torino",
  appleWebApp: { capable: true, title: "Eventi", statusBarStyle: "black-translucent" },
  icons: { apple: "/pwa-icon/180" },
  openGraph: { title: "Eventi Torino", description: "Cosa succede a Torino, nel raggio che scegli.", locale: "it_IT", type: "website" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    // Il tema scelto nell'app sovrascrive questi due (vedi THEME_INIT_SCRIPT)
    { media: "(prefers-color-scheme: light)", color: BG.light },
    { media: "(prefers-color-scheme: dark)", color: BG.dark },
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
        <PwaBoot />
      </body>
    </html>
  );
}
