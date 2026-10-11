import * as cheerio from "cheerio";
import { createHash } from "node:crypto";

export const sha1 = (s: string) => createHash("sha1").update(s).digest("hex");

/** HTML → testo compatto con link assoluti, input per l'LLM. */
export function htmlToText(html: string, baseUrl: string): string {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg, iframe, header nav, footer, form").remove();
  $("a[href]").each((_, el) => {
    const a = $(el);
    const text = a.text().trim();
    if (!text) return;
    try {
      a.replaceWith(`${text} <${new URL(a.attr("href")!, baseUrl).href}>`);
    } catch {
      // href non valido: lascia solo il testo
    }
  });
  $("img[src]").each((_, el) => {
    const img = $(el);
    try {
      img.replaceWith(` [img ${new URL(img.attr("src")!, baseUrl).href}] `);
    } catch {
      img.remove();
    }
  });
  $("br, p, div, li, h1, h2, h3, h4, tr, article, section").after("\n");
  return $("body")
    .text()
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

/** Spezza su righe in blocchi di dimensione massima, senza perdere testo. */
export function chunkText(text: string, maxChars = 40_000): string[] {
  if (text.length <= maxChars) return [text];
  const chunks: string[] = [];
  let current = "";
  for (const line of text.split("\n")) {
    if (current.length + line.length + 1 > maxChars && current) {
      chunks.push(current);
      current = "";
    }
    current += line + "\n";
  }
  if (current) chunks.push(current);
  return chunks;
}
