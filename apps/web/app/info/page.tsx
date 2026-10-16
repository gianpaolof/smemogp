import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { activeSources } from "@/data/sources";
import { AUTHOR, buildInfo, REPO_URL } from "@/ui/nowy/Colophon";
import { Icon } from "@/ui/nowy/icons";
import { Screen } from "../_screens/Screen";

export const metadata: Metadata = { title: "Info · Eventi Torino" };

const label = "mb-2 text-[11px] font-bold tracking-[0.12em] text-muted uppercase";
const ext = "underline decoration-line underline-offset-2 hover:decoration-fg";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-line px-3 py-4">
      <h2 className={label}>{title}</h2>
      <div className="flex flex-col gap-2 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

function A({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={ext}>
      {children}
    </a>
  );
}

export default function InfoPage() {
  const { printed, sha, commitUrl } = buildInfo();
  return (
    <Screen>
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-bg pt-[env(safe-area-inset-top)] [view-transition-name:app-header]">
        <h1 className="display-title px-3 py-2 text-3xl">Colophon</h1>
        <Link
          href="/"
          transitionTypes={["nav-back"]}
          className="press flex h-12 items-center gap-1.5 border-l border-line px-4 text-xs font-semibold hover:bg-line-soft"
        >
          <Icon name="left" />
          Eventi
        </Link>
      </header>
      <main className="flex-1">
        <Section title="Chi e perché">
          <p>
            Fatto da <A href="https://github.com/gianpaolof">{AUTHOR}</A>, a Torino, da ottobre 2026, per sé: un solo
            foglio con quello che mi interessa davvero, vicino a dove sono.
          </p>
          <p>Niente lirica, più sentieri.</p>
        </Section>

        <Section title="Come funziona">
          <p>
            Lunedì, mercoledì e venerdì all&apos;alba uno scout legge {activeSources.length} fonti, toglie i doppioni e
            scarta quello che non fa per me. Ogni evento rimanda alla sua fonte.
          </p>
          <ul className="mt-1 border-t border-line">
            {activeSources.map((s) => (
              <li key={s.url} className="flex min-h-11 items-center justify-between gap-3 border-b border-line">
                <A href={s.url}>{s.name}</A>
                <span className="shrink-0 text-xs text-muted">{new URL(s.url).hostname.replace(/^www\./, "")}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Strumenti">
          <p>Next.js, Tailwind, Turso con Drizzle, Leaflet. Ricerca web via OpenRouter.</p>
          <p>
            Mappe © Esri. Dati geografici © <A href="https://www.openstreetmap.org/copyright">OpenStreetMap</A>{" "}
            contributors, indirizzi tramite Nominatim.
          </p>
          <p>Scritto insieme ad agenti AI (Claude Code).</p>
        </Section>

        <Section title="Privacy">
          <p>
            Salvati, filtri e tema restano solo in questo browser. Nessun account. Statistiche di visita anonime, senza
            cookie (Vercel Analytics).
          </p>
        </Section>

        <Section title="Stampato il">
          <p className="tabular-nums">
            {printed ?? "in prova"}
            {sha && commitUrl && (
              <>
                {" · "}
                <A href={commitUrl}>{sha}</A>
              </>
            )}
            {" · "}
            <A href={REPO_URL}>codice su GitHub</A>
          </p>
        </Section>
      </main>
    </Screen>
  );
}
