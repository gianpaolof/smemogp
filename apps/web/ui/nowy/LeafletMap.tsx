"use client";

import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import { divIcon, latLng, point, type MarkerCluster, type Marker as LMarker, type MarkerClusterGroup as LGroup } from "leaflet";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Circle, MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { useReducedMotion } from "@/hooks/useMotion";
import { useResolvedTheme } from "@/hooks/useTheme";
import type { MapVM } from "@/ui/contracts";

// CARTO ora richiede API key (anche Voyager): Esri Gray Canvas è raster, neutro, senza chiave.
// In scuro si usano le tile chiare invertite (globals.css): più vicine al nero dell'app di Esri Dark Gray.
// Alternativa futura: OpenFreeMap (vettoriale, richiede MapLibre).
export const TILE_HOST = "https://server.arcgisonline.com";
const TILES = `${TILE_HOST}/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`;
const ATTRIBUTION = 'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

type Row = MapVM["rows"][number];

/** Un solo linguaggio: quadrati. Più eventi nello stesso luogo = quadrato col numero e ombra "a pila". */
const icon = (selected: boolean, count: number) =>
  divIcon({
    className: `nowy-marker${selected ? " is-selected" : ""}${count > 1 ? " has-count" : ""}`,
    html: count > 1 ? `<span>${count}</span>` : "",
    // Area di tocco ≥ 28px: il quadrato visibile è disegnato dentro (::before)
    iconSize: count > 1 ? (selected ? [34, 34] : [28, 28]) : (selected ? [32, 32] : [28, 28]),
    // Opzione extra: Leaflet copia tutte le opzioni dell'icona, la rilegge clusterIcon
    ...({ count } as object),
  });

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

function FitRadius({ origin, radiusKm, animate }: Pick<MapVM, "origin" | "radiusKm"> & { animate: boolean }) {
  const map = useMap();
  useEffect(() => {
    // Anche al ritorno da <Activity> nascosta: il contenitore era display:none
    map.invalidateSize();
    map.fitBounds(radiusBounds(origin, radiusKm), { padding: [12, 12], animate });
    // Il pannello del luogo cambia altezza senza ridimensionare finestra.
    const resize = new ResizeObserver(() => map.invalidateSize({ animate: false }));
    resize.observe(map.getContainer());
    return () => resize.disconnect();
    // `animate` non deve rifare il fit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, origin.lat, origin.lng, radiusKm]);
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
}: {
  id: string | undefined;
  markers: RefObject<Map<string, LMarker>>;
  group: RefObject<LGroup | null>;
  animate: boolean;
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
      if (g?.hasLayer(marker) && g.getVisibleParent(marker) !== marker) {
        g.zoomToShowLayer(marker);
      } else if (!map.getBounds().pad(-0.15).contains(marker.getLatLng())) {
        map.panTo(marker.getLatLng(), { animate });
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, id, markers, group]);
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

function LiveMap({ vm, selectedId, focusSelected, onSelect, fitKey }: Props) {
  const theme = useResolvedTheme();
  const reducedMotion = useReducedMotion();
  const groupRef = useRef<LGroup | null>(null);
  const markerRefs = useRef(new Map<string, LMarker>());

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
      bounds={radiusBounds(vm.origin, vm.radiusKm)}
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
      <TileLayer url={TILES} attribution={ATTRIBUTION} maxNativeZoom={16} maxZoom={18} />
      <FitRadius key={fitKey} origin={vm.origin} radiusKm={vm.radiusKm} animate={!reducedMotion} />
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
        chunkedLoading
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
          />
        ))}
      </MarkerClusterGroup>
      {focusSelected && (
        <ShowSelected id={selectedMarkerId} markers={markerRefs} group={groupRef} animate={!reducedMotion} />
      )}
    </MapContainer>
  );
}
