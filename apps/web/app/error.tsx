"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col justify-center gap-4 px-3" role="alert">
      <h1 className="display-title text-5xl">Qualcosa non va</h1>
      <p className="text-sm text-muted">Non riusciamo ad aggiornare gli eventi. Riprova tra poco.</p>
      <button
        type="button"
        onClick={reset}
        className="h-12 self-start border border-line px-4 text-sm font-semibold hover:bg-line-soft"
      >
        Riprova
      </button>
    </main>
  );
}
