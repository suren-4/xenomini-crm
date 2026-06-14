import { useState, useMemo, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from "react-simple-maps";
import { geoMercator } from "d3-geo";
import { CITY_COORDINATES } from "@/lib/constants";

interface CustomerMapProps {
  cityDistribution: Record<string, number>;
  totalCustomers: number;
}

const INDIA_GEO_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const MAP_PADDING = 16;

function getMarkerRadius(
  count: number,
  minCount: number,
  maxCount: number
): number {
  if (maxCount === minCount) return 8;
  const scale =
    (Math.sqrt(count) - Math.sqrt(minCount)) /
    (Math.sqrt(maxCount) - Math.sqrt(minCount));
  return 4 + scale * 8;
}

function useMapSize(ref: React.RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ width: 400, height: 280 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width > 0 && height > 0) {
        setSize({ width: Math.round(width), height: Math.round(height) });
      }
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}

export function CustomerMap({ cityDistribution, totalCustomers }: CustomerMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapSize = useMapSize(mapContainerRef);

  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    text: string;
    x: number;
    y: number;
  }>({
    visible: false,
    text: "",
    x: 0,
    y: 0,
  });

  const projection = useMemo(() => geoMercator(), []);

  const cityData = useMemo(() => {
    const data = Object.entries(cityDistribution)
      .filter(([, count]) => count > 0)
      .map(([city, count]) => ({
        city,
        count,
        coordinates: CITY_COORDINATES[city],
      }))
      .filter(
        (d): d is typeof d & { coordinates: [number, number] } =>
          !!d.coordinates
      );

    if (data.length === 0) return [];

    const maxCount = Math.max(...data.map((d) => d.count));
    const minCount = Math.min(...data.map((d) => d.count)) || 1;

    data.sort((a, b) => b.count - a.count);

    return data.map((d) => ({
      ...d,
      radius: getMarkerRadius(d.count, minCount, maxCount),
    }));
  }, [cityDistribution]);

  const topCities = cityData.slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-muted)] shadow-[var(--shadow)] p-6 hover:shadow-[var(--shadow-md)] transition-all duration-200 flex flex-col h-[480px]"
    >
      <div className="mb-4 shrink-0">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-[var(--text-primary)]">
          <MapPin className="w-5 h-5 text-[var(--accent)]" /> Customer Distribution
        </h3>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          {totalCustomers} customers across India
        </p>
      </div>

      <div
        ref={mapContainerRef}
        className="relative w-full flex-1 rounded-2xl overflow-hidden min-h-0 transition-colors duration-300"
        style={{
          background: "linear-gradient(to bottom right, var(--map-bg-from), var(--map-bg-to))",
        }}
      >
        <ComposableMap
          projection={projection}
          width={mapSize.width}
          height={mapSize.height}
          style={{ width: "100%", height: "100%" }}
        >
          <Geographies geography={INDIA_GEO_URL}>
            {({ geographies }) => {
              const indiaGeos = geographies.filter(
                (geo) => geo.properties?.name === "India"
              );

              if (indiaGeos.length > 0) {
                projection.fitExtent(
                  [
                    [MAP_PADDING, MAP_PADDING],
                    [
                      mapSize.width - MAP_PADDING,
                      mapSize.height - MAP_PADDING,
                    ],
                  ],
                  {
                    type: "FeatureCollection",
                    features: indiaGeos.map((geo) => ({
                      type: "Feature",
                      geometry: geo.geometry,
                      properties: geo.properties,
                    })),
                  }
                );
              }

              return (
                <>
                  {indiaGeos.map((geo) => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill="var(--map-fill)"
                      stroke="var(--map-stroke)"
                      strokeWidth={0.75}
                      style={{
                        default: { outline: "none" },
                        hover: { fill: "var(--map-fill)", outline: "none" },
                        pressed: { outline: "none" },
                      }}
                    />
                  ))}

                  {cityData.map((d, i) => (
                    <Marker
                      key={d.city}
                      coordinates={[d.coordinates[1], d.coordinates[0]]}
                    >
                      <motion.g
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{
                          duration: 0.5,
                          delay: 0.8 + i * 0.05,
                          type: "spring",
                        }}
                        onMouseEnter={(e) => {
                          setTooltip({
                            visible: true,
                            text: `${d.city} • ${d.count} customers`,
                            x: e.clientX,
                            y: e.clientY,
                          });
                        }}
                        onMouseMove={(e) => {
                          setTooltip((prev) => ({
                            ...prev,
                            x: e.clientX,
                            y: e.clientY,
                          }));
                        }}
                        onMouseLeave={() =>
                          setTooltip((prev) => ({ ...prev, visible: false }))
                        }
                        className="cursor-pointer outline-none"
                      >
                        <circle
                          r={d.radius * 1.6}
                          fill="none"
                          stroke="var(--accent)"
                          strokeWidth={1}
                          style={{
                            opacity: 0.3,
                            animation: "pulse-ring 2s ease-in-out infinite",
                            animationDelay: `${i * 0.2}s`,
                          }}
                        />
                        <circle
                          r={d.radius}
                          fill="var(--accent)"
                          opacity={0.85}
                        />
                      </motion.g>
                    </Marker>
                  ))}
                </>
              );
            }}
          </Geographies>
        </ComposableMap>
      </div>

      <div className="mt-4 shrink-0 flex flex-row flex-wrap items-center justify-center gap-4 text-sm text-[var(--text-primary)]">
        {topCities.map((c) => (
          <div key={c.city} className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)] shadow-[var(--shadow)]"></span>
            {c.city}{" "}
            <span className="text-[var(--text-muted)] font-normal">
              {c.count}
            </span>
          </div>
        ))}
      </div>

      {tooltip.visible && (
        <div
          className="fixed bg-[var(--text-primary)] text-[var(--bg-card)] text-xs rounded-lg px-3 py-2 shadow-xl pointer-events-none z-50 transform -translate-x-1/2 -translate-y-[130%]"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.text}
        </div>
      )}
    </motion.div>
  );
}
