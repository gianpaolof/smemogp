import { DetailPanel } from "@/ui/nowy/DetailPanel";
import { DetailContent } from "../../../_screens/DetailContent";

/**
 * `/evento/[id]` intercettato: pannello sopra la vista corrente, URL condivisibile.
 * Niente Suspense qui: la boundary sta attorno allo slot nel layout ed è già visibile, quindi la
 * navigazione aspetta i dati e monta pannello e titolo nello stesso commit in cui la riga lo
 * cede (morph lista → dettaglio, vedi SharedHero). Con uno scheletro in mezzo non ci sarebbe coppia.
 */
export default function EventPanel({ params, searchParams }: PageProps<"/evento/[id]">) {
  return (
    <DetailPanel>
      <DetailContent params={params} searchParams={searchParams} />
    </DetailPanel>
  );
}
