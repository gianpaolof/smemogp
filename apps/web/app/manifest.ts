import type { MetadataRoute } from "next";
import { BG } from "@/hooks/useTheme";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Eventi Torino",
    short_name: "Eventi",
    description: "Eventi a Torino e dintorni, su mappa o in lista, nel raggio che scegli.",
    lang: "it",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: BG.light,
    theme_color: BG.light,
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png" },
      { src: "/pwa-icon/512?maskable=1", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Stasera", url: "/?periodo=stasera" },
      { name: "Mappa", url: "/mappa" },
      { name: "Salvati", url: "/salvati" },
    ],
  };
}
