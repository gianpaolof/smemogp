const bar = "animate-pulse bg-line-soft";

export function HeaderSkeleton() {
  return (
    <div className="sticky top-0 z-20 bg-bg" aria-hidden="true">
      <div className="grid h-12 grid-cols-4 border-b border-line">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center border-r border-line px-3 last:border-r-0">
            <span className={`${bar} h-3 w-12`} />
          </div>
        ))}
      </div>
      <div className="flex h-[41px] items-center border-b border-line px-3">
        <span className={`${bar} h-3 w-40`} />
      </div>
    </div>
  );
}

export function AgendaSkeleton() {
  return (
    <div role="status" aria-label="Caricamento eventi">
      {[0, 1].map((d) => (
        <div key={d} className="grid grid-cols-[88px_minmax(0,1fr)] border-b border-line sm:grid-cols-[112px_minmax(0,1fr)]">
          <div className="border-r border-line p-3">
            <span className={`${bar} block h-16 w-14`} />
          </div>
          <div>
            {[0, 1, 2].map((r) => (
              <div key={r} className="flex flex-col gap-2 border-b border-line px-3 py-3 last:border-b-0">
                <span className={`${bar} h-3 w-24`} />
                <span className={`${bar} h-5 w-4/5`} />
                <span className={`${bar} h-3 w-32`} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
