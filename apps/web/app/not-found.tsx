import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center gap-4 px-3">
      <h1 className="display-title text-6xl">Non c&apos;è</h1>
      <p className="text-sm text-muted">Questo evento non è più in programma, oppure il link è sbagliato.</p>
      <Link href="/" className="press flex h-12 items-center justify-center self-start border border-line px-4 text-sm font-semibold hover:bg-line-soft">
        Tutti gli eventi
      </Link>
    </main>
  );
}
