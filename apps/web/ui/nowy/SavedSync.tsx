"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSaved } from "@/hooks/useSaved";

/** I salvati stanno nel browser: l'URL porta gli id al server, che li rende. Tenuto allineato. */
export function SavedSync({ current }: { current: string }) {
  const router = useRouter();
  const ids = useSaved().join(",");
  useEffect(() => {
    if (ids !== current) router.replace(ids ? `/salvati?ids=${encodeURIComponent(ids)}` : "/salvati", { scroll: false });
  }, [ids, current, router]);
  return null;
}
