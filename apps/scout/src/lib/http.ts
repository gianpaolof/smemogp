const USER_AGENT = "Mozilla/5.0 (compatible; smemogp-scout/0.1)";

export async function fetchText(url: string, timeoutMs = 20_000): Promise<string> {
  const res = await fetch(url, {
    headers: { "user-agent": USER_AGENT, "accept-language": "it-IT,it;q=0.9" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} su ${url}`);
  return res.text();
}

/** Per siti renderizzati in JS. Playwright caricato solo se serve. */
export async function renderPage(url: string): Promise<string> {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ userAgent: USER_AGENT, locale: "it-IT" });
    // "networkidle" non arriva mai su siti con tracker/pubblicità (Zero.eu): DOM pronto + attesa breve
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForLoadState("load", { timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(3_000);
    return await page.content();
  } finally {
    await browser.close();
  }
}
