"use client";

import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import { divIcon, latLng, point, type MarkerCluster, type Marker as LMarker, type MarkerClusterGroup as LGroup } from "leaflet";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Circle, MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { useResolvedTheme } from "@/hooks/useTheme";
import type { MapVM } from "@/ui/contracts";

// CARTO ora richiede API key (anche Voyager): Esri Gray Canvas è raster, neutro, senza chiave.
// Alternativa futura: OpenFreeMap (vettoriale, richiede MapLibre).
const TILES = {
  light: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
  dark: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
};
const ATTRIBUTION = 'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

type Row = MapVM["rows"][number];

/** I luoghi con più eventi usano un pin con badge, distinto dai cluster quadrati. */
const icon = (selected: boolean, count: number) =>
  divIcon({
    className: `nowy-marker${selected ? " is-selected" : ""}${count > 1 ? " has-count" : ""}`,
    html: count > 1 ? `<svg viewBox="0 0 24 28" aria-hidden="true"><path d="M12 26S2 17 2 11a10 10 0 0 1 20 0c0 6-10 15-10 15Z"/><circle cx="12" cy="11" r="3"/></svg><span class="nowy-place-count">${count}</span>` : "",
    iconSize: count > 1 ? (selected ? [38, 42] : [32, 36]) : (selected ? [24, 24] : [18, 18]),
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
  const size = n < 10 ? 32 : n < 50 ? 38 : 44;
  return divIcon({
    className: "nowy-cluster",
    html: `<span>${n}</span>`,
    iconSize: point(size, size),
  });
}

const originIcon = divIcon({ className: "nowy-origin", html: "+", iconSize: [22, 22] });

function FitRadius({ origin, radiusKm }: Pick<MapVM, "origin" | "radiusKm">) {
  const map = useMap();
  useEffect(() => {
    // Anche al ritorno da <Activity> nascosta: il contenitore era display:none
    map.invalidateSize();
    map.fitBounds(latLng(origin.lat, origin.lng).toBounds(radiusKm * 2000), { padding: [8, 8] });
    // Il pannello del luogo cambia altezza senza ridimensionare la finestra.
    const resize = new ResizeObserver(() => map.invalidateSize({ animate: false }));
    resize.observe(map.getContainer());
    return () => resize.disconnect();
  }, [map, origin.lat, origin.lng, radiusKm]);
  return null;
}

/** Porta in vista il marker selezionato: se è dentro un cluster, zooma finché non si apre. */
function ShowSelected({
  id,
  markers,
  group,
}: {
  id: string | undefined;
  markers: RefObject<Map<string, LMarker>>;
  group: RefObject<LGroup | null>;
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
      if (g?.hasLayer(marker)) {
        g.zoomToShowLayer(marker);
      } else {
        map.panTo(marker.getLatLng(), { animate: true });
      }
    });
    return () => { cancelled = true; };
  }, [map, id, markers, group]);
  return null;
}

type Props = {
  vm: MapVM;
  selectedId: string | null;
  onSelect: (id: string, place: string) => void;
  /** Incrementato dal pulsante "Inquadra raggio" */
  fitKey: number;
};

export default function LeafletMap({ vm, selectedId, onSelect, fitKey }: Props) {
  const theme = useResolvedTheme();
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

  const reducedMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <MapContainer
      center={[vm.origin.lat, vm.origin.lng]}
      zoom={12}
      zoomControl={false}
      className="h-full w-full"
      attributionControl
    >
      <TileLayer
        key={theme}
        url={TILES[theme]}
        attribution={ATTRIBUTION}
        maxNativeZoom={16}
        maxZoom={18}
      />
      <FitRadius key={fitKey} origin={vm.origin} radiusKm={vm.radiusKm} />
      <Circle
        center={[vm.origin.lat, vm.origin.lng]}
        radius={vm.radiusKm * 1000}
        pathOptions={{ color: theme === "dark" ? "#f2f2f2" : "#111111", weight: 1.2, dashArray: "3 6", fill: false }}
        interactive={false}
      />
      <Marker position={[vm.origin.lat, vm.origin.lng]} icon={originIcon} interactive={false} keyboard={false} />
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
      <ShowSelected id={selectedMarkerId} markers={markerRefs} group={groupRef} />
    </MapContainer>
  );
}
