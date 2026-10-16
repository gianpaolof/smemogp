import "server-only";
import catalog from "../../scout/sources.json";

/** Dominio leggibile; null se l'URL non è http(s) valido (la voce viene scartata, il build non si rompe). */
function host(url: string) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.hostname.replace(/^www\./, "") : null;
  } catch {
    return null;
  }
}

/** Fonti online (status `active`) per il colophon: solo nome, indirizzo e dominio, mai le note interne. */
export const activeSources = catalog
  .filter((s) => s.status === "active")
  .flatMap((s) => {
    const h = host(s.url);
    return h ? [{ name: s.name, url: s.url, host: h }] : [];
  })
  .sort((a, b) => a.name.localeCompare(b.name, "it"));
