import { TIME_ZONE } from "@/domain/time";
import { InfoLink } from "./InfoLink";

export const AUTHOR = "gianpaolof";
export const AUTHOR_URL = `https://github.com/${AUTHOR}`;
export const REPO_URL = `${AUTHOR_URL}/smemogp`;
/** Primo commit del progetto: la data di nascita, fissa. */
export const CREATED = { iso: "2026-10-11", label: "11.10.2026" };

const dateFmt = new Intl.DateTimeFormat("it-IT", { timeZone: TIME_ZONE, day: "2-digit", month: "2-digit", year: "numeric" });

/**
 * Ultimo ritocco = data di build (letterale sostituito da next.config `env`: niente `new Date()` nel render)
 * e commit del deploy. In locale il commit manca: nessun link, mai «undefined».
 */
export function buildInfo() {
  const iso = process.env.BUILD_DATE!;
  const sha = process.env.VERCEL_GIT_COMMIT_SHA;
  return {
    touched: { iso, label: dateFmt.format(new Date(iso)).replaceAll("/", ".") },
    commit: sha ? { short: sha.slice(0, 7), url: `${REPO_URL}/commit/${sha}` } : null,
  };
}

/** Firma in fondo al programma, come il colophon di un programma di sala. */
export function Colophon() {
  const { touched } = buildInfo();
  return (
    <footer className="flex flex-col gap-3 px-3 pt-8 pb-10">
      <p className="text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
        Programma compilato da {AUTHOR} · creato il{" "}
        <time dateTime={CREATED.iso} className="tabular-nums">
          {CREATED.label}
        </time>{" "}
        · ultimo ritocco il{" "}
        <time dateTime={touched.iso} className="tabular-nums">
          {touched.label}
        </time>
      </p>
      <InfoLink />
    </footer>
  );
}
