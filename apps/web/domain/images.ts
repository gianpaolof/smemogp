/**
 * Host delle immagini delle fonti attive: solo questi passano dall'ottimizzazione di Next
 * (ridimensionate e in AVIF/WebP). Allow-list e non "**": l'optimizer non diventa un proxy aperto.
 * Nuova fonte con immagini → aggiungere qui il suo host.
 */
export const IMAGE_HOSTS = [
  "torino.circololettori.it",
  "img.evbuc.com",
  "api.museoegizio.it",
  "cdn.zero.eu",
] as const;

export function isOptimizableImage(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && (IMAGE_HOSTS as readonly string[]).includes(u.hostname);
  } catch {
    return false;
  }
}
