/** Svuota la cache eventi del sito (Next `revalidateTag`). Opzionale: senza env non fa nulla. */
export async function revalidateSite() {
  const { SITE_URL, REVALIDATE_SECRET } = process.env;
  if (!SITE_URL || !REVALIDATE_SECRET) return;
  try {
    const res = await fetch(new URL("/api/revalidate", SITE_URL), {
      method: "POST",
      headers: { Authorization: `Bearer ${REVALIDATE_SECRET}` },
    });
    console.log(`Revalidate sito: ${res.status}`);
  } catch (err) {
    // Non blocca il run: i dati scadono comunque entro un'ora (cacheLife "hours")
    console.error(`Revalidate sito fallito: ${err instanceof Error ? err.message : err}`);
  }
}
