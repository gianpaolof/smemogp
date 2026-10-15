"use client";

import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import { divIcon, latLng, point, type MarkerCluster, type Marker as LMarker, type MarkerClusterGroup as LGroup } from "leaflet";
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Circle, MapContainer, Marker, TileLayer, Tooltip, useMap, useMapEvent } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { useReducedMotion } from "@/hooks/useMotion";
import { useResolvedTheme } from "@/hooks/useTheme";
import type { MapVM } from "@/ui/contracts";

// CARTO ora richiede API key (anche Voyager): Esri Gray Canvas è raster, neutro, senza chiave.
// In scuro le tile Dark Gray native: strade chiare su fondo scuro. Le chiare invertite davano strade
// più scure del fondo, illeggibili; un po' di brightness (globals.css) le avvicina al nero dell'app.
// Alternativa futura: OpenFreeMap (vettoriale, richiede MapLibre).
export const TILE_HOST = "https://server.arcgisonline.com";
const TILES = {
  light: `${TILE_HOST}/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
  dark: `${TILE_HOST}/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
};
const ATTRIBUTION = 'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

type Row = MapVM["rows"][number];

/** Zoom d'arrivo dal dettaglio: l'ultimo con tile native, strade e nomi leggibili. */
const ARRIVAL_ZOOM = 16;
/** Sotto questo zoom il callout coprirebbe i marker vicini: si nasconde (CSS). */
const CALLOUT_MIN_ZOOM = 13;
/** Asta del pin selezionato: la punta è il punto esatto dell'evento. */
const STEM = 14;
/** Metà larghezza massima del callout + margine: il pin non va più vicino di così al bordo. */
const CALLOUT_HALF_W = 136;

/**
 * Un solo linguaggio: quadrati. Più eventi nello stesso luogo = quadrato col numero e ombra "a pila".
 * Il selezionato è un pin: quadrato più grande su un'asta, ancorato alla punta.
 */
function icon(selected: boolean, count: number) {
  const box = count > 1 ? (selected ? 36 : 28) : selected ? 32 : 28;
  const height = selected ? box + STEM : box;
  return divIcon({
    className: `nowy-marker${selected ? " is-selected" : ""}${count > 1 ? " has-count" : ""}`,
    html: count > 1 ? `<span>${count}</span>` : "",
    // Area di tocco ≥ 28px: il quadrato visibile è disegnato dentro (::before)
    iconSize: [box, height],
    iconAnchor: [box / 2, selected ? height : box / 2],
    // Il callout sta sopra il quadrato, non sopra la punta
    tooltipAnchor: [0, selected ? -height : -box / 2],
    // Opzione extra: Leaflet copia tutte le opzioni dell'icona, la rilegge clusterIcon
    ...({ count } as object),
  });
}

const eventsIn = (cluster: MarkerCluster) =>
  cluster
    .getAllChildMarkers()
    .reduce((n, m) => n + ((m.options.icon?.options as { count?: number } | undefined)?.count ?? 1), 0);

/** Cluster: quadrato pieno col numero di eventi (non di marker), più grande se ne contiene tanti. */
function clusterIcon(cluster: MarkerCluster) {
  const n = eventsIn(cluster);
  const size = n < 10 ? 34 : n < 50 ? 40 : 46;
  return divIcon({
    className: "nowy-cluster",
    html: `<span>${n}</span>`,
    iconSize: point(size, size),
  });
}

/** Origine: mirino nel colore d'accento, sopra tutto. */
const originIcon = divIcon({ className: "nowy-origin", html: "<i></i>", iconSize: [28, 28] });

/** Etichetta del raggio sul bordo est del cerchio. */
const radiusLabel = (km: number) =>
  divIcon({ className: "nowy-radius-label", html: `<span>${km} km</span>`, iconSize: [0, 0] });

const radiusBounds = (origin: MapVM["origin"], radiusKm: number) =>
  latLng(origin.lat, origin.lng).toBounds(radiusKm * 2000);

type FitArgs = { lat: number; lng: number; radiusKm: number; fitKey: number };
const sameFit = (a: FitArgs, b: FitArgs) =>
  a.lat === b.lat && a.lng === b.lng && a.radiusKm === b.radiusKm && a.fitKey === b.fitKey;

/**
 * Inquadra il raggio all'apertura, quando cambiano origine o raggio e con «Inquadra raggio» (fitKey).
 * Arrivando su un evento la mappa nasce già zoomata lì: finché i parametri sono quelli dell'arrivo
 * non si inquadra (confronto di valori, non "primo run": in sviluppo gli effetti girano due volte).
 */
function FitRadius({ origin, radiusKm, fitKey, animate, keepFrom }: Pick<MapVM, "origin" | "radiusKm"> & {
  fitKey: number;
  animate: boolean;
  keepFrom: FitArgs | null;
}) {
  const map = useMap();
  useEffect(() => {
    // Anche al ritorno da <Activity> nascosta: il contenitore era display:none
    map.invalidateSize();
    const args = { lat: origin.lat, lng: origin.lng, radiusKm, fitKey };
    if (!keepFrom || !sameFit(keepFrom, args)) map.fitBounds(radiusBounds(origin, radiusKm), { padding: [12, 12], animate });
    // Il pannello del luogo cambia altezza senza ridimensionare finestra.
    const resize = new ResizeObserver(() => map.invalidateSize({ animate: false }));
    resize.observe(map.getContainer());
    return () => resize.disconnect();
    // `animate` e `keepFrom` (fisso dal mount) non devono rifare il fit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, origin.lat, origin.lng, radiusKm, fitKey]);
  return null;
}

/**
 * Porta in vista il marker selezionato, ma solo se scelto dall'utente (tap o `?evento=`):
 * all'apertura la mappa mostra tutto il raggio. Dentro un cluster: zooma finché non si apre.
 */
function ShowSelected({
  id,
  markers,
  group,
  animate,
  coverRight,
}: {
  id: string | undefined;
  markers: RefObject<Map<string, LMarker>>;
  group: RefObject<LGroup | null>;
  animate: boolean;
  coverRight: number;
}) {
  const map = useMap();
  useEffect(() => {
    let cancelled = false;
    // react-leaflet-cluster applica aggiunte/rimozioni in una microtask.
    queueMicrotask(() => {
      if (cancelled) return;
      const marker = id ? markers.current.get(id) : undefined;
      if (!marker) return;
      const g = group.current;
      // Dentro un cluster chiuso: il "genitore visibile" è il cluster, non il marker
      // Margini per il callout (centrato sul pin, largo fino a ~240px, alto ~60px) e per l'eventuale
      // pannello che copre il lato destro della mappa
      const pan = () =>
        !cancelled &&
        map.panInside(marker.getLatLng(), {
          paddingTopLeft: [CALLOUT_HALF_W, 96],
          paddingBottomRight: [coverRight + CALLOUT_HALF_W, 32],
          animate,
        });
      if (g?.hasLayer(marker) && g.getVisibleParent(marker) !== marker) g.zoomToShowLayer(marker, pan);
      else pan();
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, id, markers, group, coverRight]);
  return null;
}

/** Callout nascosto da lontano: classe sul contenitore, aggiornata a ogni zoom. */
function CalloutZoom() {
  const map = useMap();
  // Stabile: useMapEvent riaggancia il listener a ogni nuova funzione, e nel frattempo lo zoomend del
  // fitBounds di FitRadius (stesso commit) andrebbe perso
  const sync = useCallback(() => {
    map.getContainer().classList.toggle("callout-far", map.getZoom() < CALLOUT_MIN_ZOOM);
  }, [map]);
  useMapEvent("zoomend", sync);
  useEffect(sync, [sync]);
  return null;
}

type Props = {
  vm: MapVM;
  selectedId: string | null;
  /** Selezione voluta dall'utente: solo allora la mappa si sposta sul marker */
  focusSelected: boolean;
  onSelect: (id: string, place: string) => void;
  /** Incrementato dal pulsante "Inquadra raggio" */
  fitKey: number;
  /** Arrivo dal dettaglio (solo mobile): la mappa nasce zoomata sul selezionato invece che sul raggio */
  arriveZoomed?: boolean;
  /** Px a destra coperti da un pannello sopra la mappa: il selezionato va tenuto fuori */
  coverRight?: number;
};

let mapGeneration = 0;

/**
 * Next conserva le pagine visitate in un'<Activity> nascosta e le riattiva con Indietro: gli effetti
 * ripartono sulla mappa che react-leaflet ha già rimosso e Leaflet va in errore ("Map container is
 * being reused"). Quindi la mappa si smonta quando la pagina si nasconde e rinasce, con una key
 * nuova, quando torna visibile.
 */
export default function LeafletMap(props: Props) {
  const [generation, setGeneration] = useState(0);
  useEffect(() => {
    // Contatore che sale sempre: se l'azzeramento da nascosta non è ancora applicato, la key cambia comunque
    // eslint-disable-next-line react-hooks/set-state-in-effect -- serve proprio dopo il mount/la riattivazione
    setGeneration(++mapGeneration);
    return () => setGeneration(0);
  }, []);
  if (!generation) return <div className="hatch h-full w-full" />;
  return <LiveMap key={generation} {...props} />;
}

function LiveMap({ vm, selectedId, focusSelected, onSelect, fitKey, arriveZoomed = false, coverRight = 0 }: Props) {
  const theme = useResolvedTheme();
  const reducedMotion = useReducedMotion();
  const groupRef = useRef<LGroup | null>(null);
  const markerRefs = useRef(new Map<string, LMarker>());
  // Fissati al mount (anche dopo Indietro, che rimonta la mappa): dove nasce e cosa non va reinquadrato
  const [arrival] = useState(() => {
    const row = arriveZoomed && focusSelected ? vm.rows.find((r) => r.id === selectedId) : undefined;
    return row
      ? { center: [row.lat, row.lng] as [number, number], keep: { ...vm.origin, radiusKm: vm.radiusKm, fitKey } }
      : null;
  });

  // Più eventi nello stesso luogo: un solo marker (il selezionato o il primo), gli altri si scorrono nella card
  const markers = useMemo(() => {
    const byPlace = new Map<string, { key: string; row: Row; count: number }>();
    for (const r of vm.rows) {
      const key = `${r.lat.toFixed(5)},${r.lng.toFixed(5)}`;
      const prev = byPlace.get(key);
      byPlace.set(key, {
        key,
        row: !prev || r.id === selectedId ? r : prev.row,
        count: (prev?.count ?? 0) + 1,
      });
    }
    return [...byPlace.values()];
  }, [vm.rows, selectedId]);

  const selectedMarkerId = markers.find((m) => m.row.id === selectedId)?.row.id;
  const east = radiusBounds(vm.origin, vm.radiusKm).getEast();

  return (
    <MapContainer
      {...(arrival ? { center: arrival.center, zoom: ARRIVAL_ZOOM } : { bounds: radiusBounds(vm.origin, vm.radiusKm) })}
      zoomControl={false}
      className={`h-full w-full ${theme === "dark" ? "is-dark" : ""}`}
      attributionControl
      zoomAnimation={!reducedMotion}
      fadeAnimation={!reducedMotion}
      markerZoomAnimation={!reducedMotion}
      ref={(m) => {
        m?.attributionControl.setPrefix(false);
      }}
    >
      {/* key: cambiando tema si ricrea il layer, senza tile del vecchio tema in cache sullo schermo */}
      <TileLayer key={theme} url={TILES[theme]} attribution={ATTRIBUTION} maxNativeZoom={16} maxZoom={18} />
      <FitRadius
        origin={vm.origin}
        radiusKm={vm.radiusKm}
        fitKey={fitKey}
        animate={!reducedMotion}
        keepFrom={arrival?.keep ?? null}
      />
      <CalloutZoom />
      <Circle
        center={[vm.origin.lat, vm.origin.lng]}
        radius={vm.radiusKm * 1000}
        pathOptions={{ weight: 1.5, dashArray: "2 6", fill: false }}
        interactive={false}
      />
      <Marker
        position={[vm.origin.lat, east]}
        icon={radiusLabel(vm.radiusKm)}
        interactive={false}
        keyboard={false}
      />
      <Marker
        position={[vm.origin.lat, vm.origin.lng]}
        icon={originIcon}
        interactive={false}
        keyboard={false}
        // Sotto marker e cluster: il mirino non deve coprire il numero
        zIndexOffset={-1000}
      />
      <MarkerClusterGroup
        ref={groupRef}
        iconCreateFunction={clusterIcon}
        maxClusterRadius={44}
        showCoverageOnHover={false}
        spiderfyOnMaxZoom
        spiderLegPolylineOptions={{ className: "leaflet-cluster-spider-leg", weight: 1.5, opacity: 1 }}
        zoomToBoundsOnClick
        animate={!reducedMotion}
        // Niente caricamento a blocchi: all'arrivo il marker selezionato dev'essere già nel gruppo
        // (ShowSelected apre il suo cluster). Le righe sono al massimo qualche centinaio.
      >
        {markers.map(({ key, row, count }) => (
          <Marker
            key={key}
            ref={(m) => {
              if (m) markerRefs.current.set(row.id, m);
              else markerRefs.current.delete(row.id);
            }}
            position={[row.lat, row.lng]}
            icon={icon(row.id === selectedId, count)}
            title={count > 1 ? `${count} eventi qui. ${row.title}` : row.title}
            alt={row.title}
            zIndexOffset={row.id === selectedId ? 1000 : 0}
            eventHandlers={{ click: () => onSelect(row.id, key) }}
          >
            {/* Solo per una scelta dell'utente: all'apertura il selezionato è il primo evento, nessuno l'ha scelto */}
            {focusSelected && row.id === selectedId && (
              <Tooltip permanent direction="top" className="nowy-callout">
                {/* Ripete la card sotto la mappa: nascosto agli screen reader */}
                <span aria-hidden="true">
                  <b>{row.venue ?? row.title}</b>
                  {row.address && <span>{row.address}</span>}
                </span>
              </Tooltip>
            )}
          </Marker>
        ))}
      </MarkerClusterGroup>
      {focusSelected && (
        <ShowSelected
          id={selectedMarkerId}
          markers={markerRefs}
          group={groupRef}
          animate={!reducedMotion}
          coverRight={coverRight}
        />
      )}
    </MapContainer>
  );
}
