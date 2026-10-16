import Link from "next/link";
import { TIME_ZONE } from "@/domain/time";
import { Icon } from "./icons";

export const AUTHOR = "gianpaolof";
export const REPO_URL = "https://github.com/gianpaolof/smemogp";

const printedFmt = new Intl.DateTimeFormat("it-IT", { timeZone: TIME_ZONE, day: "2-digit", month: "2-digit", year: "numeric" });

/**
 * Data di build (letterale sostituito da next.config `env`: niente `new Date()` nel render) e commit.
 * In locale il commit manca: nessun link, mai «undefined».
 */
export function buildInfo() {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA;
  const built = process.env.BUILD_DATE ? new Date(process.env.BUILD_DATE) : null;
  return {
    printed: built ? printedFmt.format(built).replaceAll("/", ".") : null,
    sha: sha?.slice(0, 7) ?? null,
    commitUrl: sha ? `${REPO_URL}/commit/${sha}` : null,
  };
}

/** Firma in fondo al programma, come il colophon di un programma di sala. */
export function Colophon() {
  const { printed, sha } = buildInfo();
  return (
    <footer className="flex flex-col gap-3 px-3 pt-8 pb-10 text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
      <p>
        Programma compilato da {AUTHOR}
        {printed && <> · stampato il <span className="tabular-nums">{printed}</span></>}
        {sha && <> · <span className="tabular-nums normal-case">{sha}</span></>}
      </p>
      <Link
        href="/info"
        transitionTypes={["nav-forward"]}
        className="press flex h-12 items-center justify-between border-y border-line text-xs tracking-normal text-fg normal-case hover:bg-line-soft"
      >
        Info e colophon
        <Icon name="right" />
      </Link>
    </footer>
  );
}
