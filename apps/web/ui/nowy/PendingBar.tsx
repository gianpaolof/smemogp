"use client";

import { useLinkStatus } from "next/link";

/** Barra sottile animata sotto un <Link> mentre la navigazione è in corso. */
export function PendingBar() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden="true"
      className={`absolute inset-x-0 bottom-0 h-0.5 origin-left bg-accent transition-transform duration-500 ${
        pending ? "scale-x-100" : "scale-x-0"
      }`}
    />
  );
}
