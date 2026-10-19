import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { worldMap, WORLD_COUNTRY_OPTIONS } from "../data/world-map";
import type { CityMapMarker } from "../data/city-visits";

interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Point {
  x: number;
  y: number;
}

interface SmallCountryMarker {
  id: string;
  name: string;
  x: number;
  y: number;
}

const WORLD_VIEW: ViewBox = { x: 0, y: 0, width: 1010, height: 666 };
const MIN_VIEW_WIDTH = 42;

export interface WorldMapHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
  focusCountry: (id: string) => void;
}

interface WorldMapProps {
  visitedIds: string[];
  bucketListIds: string[];
  /** Countries with a trip planned but not started yet; drawn with a dashed outline. */
  plannedIds?: string[];
  selectedId?: string | null;
  cityMarkers?: CityMapMarker[];
  selectedCityId?: string | null;
  onCountryClick: (id: string, name: string) => void;
  onCityClick?: (id: string) => void;
}

function clampViewBox(view: ViewBox): ViewBox {
  const width = Math.max(MIN_VIEW_WIDTH, Math.min(WORLD_VIEW.width, view.width));
  const height = Math.max(
    MIN_VIEW_WIDTH * (WORLD_VIEW.height / WORLD_VIEW.width),
    Math.min(WORLD_VIEW.height, view.height),
  );

  return {
    width,
    height,
    x: Math.max(0, Math.min(WORLD_VIEW.width - width, view.x)),
    y: Math.max(0, Math.min(WORLD_VIEW.height - height, view.y)),
  };
}

export const WorldMap = forwardRef<WorldMapHandle, WorldMapProps>(function WorldMap(
  { visitedIds, bucketListIds, plannedIds = [], selectedId, cityMarkers = [], selectedCityId, onCountryClick, onCityClick },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRefs = useRef(new Map<string, SVGPathElement>());
  const activePointers = useRef(new Map<number, Point>());
  const lastPointer = useRef<Point | null>(null);
  const pinchDistance = useRef<number | null>(null);
  const [viewBox, setViewBox] = useState<ViewBox>(WORLD_VIEW);
  const [isDragging, setIsDragging] = useState(false);
  const [smallCountries, setSmallCountries] = useState<SmallCountryMarker[]>([]);
  const smallCountryIds = useMemo(() => new Set(smallCountries.map((country) => country.id)), [smallCountries]);
  const visitedSet = useMemo(() => new Set(visitedIds), [visitedIds]);
  const bucketListSet = useMemo(() => new Set(bucketListIds), [bucketListIds]);
  const plannedSet = useMemo(() => new Set(plannedIds), [plannedIds]);

  const zoomAround = useCallback((factor: number, anchor?: Point) => {
    setViewBox((current) => {
      const center = anchor ?? {
        x: current.x + current.width / 2,
        y: current.y + current.height / 2,
      };
      const width = current.width * factor;
      const height = current.height * factor;
      const xRatio = (center.x - current.x) / current.width;
      const yRatio = (center.y - current.y) / current.height;

      return clampViewBox({
        x: center.x - width * xRatio,
        y: center.y - height * yRatio,
        width,
        height,
      });
    });
  }, []);

  const reset = useCallback(() => setViewBox(WORLD_VIEW), []);

  const focusCountry = useCallback((id: string) => {
    const path = pathRefs.current.get(id.toUpperCase());
    if (!path) return;

    const bounds = path.getBBox();
    const container = containerRef.current;
    const aspect = container ? container.clientWidth / Math.max(container.clientHeight, 1) : 0.65;
    const paddedWidth = Math.max(bounds.width * 2.65, bounds.height * 2.65 * aspect, 96);
    const width = Math.min(520, paddedWidth);
    const height = width / Math.max(aspect, 0.5);

    setViewBox(clampViewBox({
      x: bounds.x + bounds.width / 2 - width / 2,
      y: bounds.y + bounds.height / 2 - height * 0.42,
      width,
      height,
    }));
  }, []);

  useImperativeHandle(ref, () => ({
    zoomIn: () => zoomAround(0.72),
    zoomOut: () => zoomAround(1.38),
    reset,
    focusCountry,
  }), [focusCountry, reset, zoomAround]);

  useEffect(() => {
    if (selectedId) focusCountry(selectedId);
  }, [focusCountry, selectedId]);

  useLayoutEffect(() => {
    const markers = WORLD_COUNTRY_OPTIONS.flatMap(({ id, name }) => {
      const path = pathRefs.current.get(id);
      if (!path) return [];
      const bounds = path.getBBox();
      if (bounds.width * bounds.height >= 34 && Math.max(bounds.width, bounds.height) >= 8) return [];
      return [{ id, name, x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }];
    });
    setSmallCountries(markers);
  }, []);

  const clientToMap = useCallback((client: Point): Point => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const point = svg.createSVGPoint();
    point.x = client.x;
    point.y = client.y;
    const matrix = svg.getScreenCTM();
    if (!matrix) return { x: 0, y: 0 };
    const mapped = point.matrixTransform(matrix.inverse());
    return { x: mapped.x, y: mapped.y };
  }, []);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    activePointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    lastPointer.current = { x: event.clientX, y: event.clientY };
    setIsDragging(true);

    if (activePointers.current.size === 2) {
      const [first, second] = [...activePointers.current.values()];
      pinchDistance.current = Math.hypot(first.x - second.x, first.y - second.y);
    }
  }, []);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!activePointers.current.has(event.pointerId)) return;
    activePointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (activePointers.current.size === 2) {
      const [first, second] = [...activePointers.current.values()];
      const distance = Math.hypot(first.x - second.x, first.y - second.y);
      const previous = pinchDistance.current;
      if (previous && Math.abs(distance - previous) > 1) {
        const midpoint = clientToMap({ x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 });
        zoomAround(previous / distance, midpoint);
      }
      pinchDistance.current = distance;
      return;
    }

    const previous = lastPointer.current;
    const container = containerRef.current;
    if (!previous || !container) return;
    const dx = event.clientX - previous.x;
    const dy = event.clientY - previous.y;
    if (Math.abs(dx) + Math.abs(dy) > 2 && !event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    setViewBox((current) => clampViewBox({
      ...current,
      x: current.x - (dx / Math.max(container.clientWidth, 1)) * current.width,
      y: current.y - (dy / Math.max(container.clientHeight, 1)) * current.height,
    }));
    lastPointer.current = { x: event.clientX, y: event.clientY };
  }, [clientToMap, zoomAround]);

  const handlePointerEnd = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    activePointers.current.delete(event.pointerId);
    if (activePointers.current.size < 2) pinchDistance.current = null;
    if (activePointers.current.size === 0) {
      lastPointer.current = null;
      setIsDragging(false);
    }
  }, []);

  const handleWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    zoomAround(event.deltaY < 0 ? 0.82 : 1.22, clientToMap({ x: event.clientX, y: event.clientY }));
  }, [clientToMap, zoomAround]);

  const getCountryFill = (id: string) => {
    if (id === selectedId) return "var(--map-selected)";
    if (visitedSet.has(id)) return "var(--gold)";
    if (bucketListSet.has(id)) return "var(--map-bucket)";
    return "var(--map-unvisited)";
  };

  const mapUnitsPerPixel = viewBox.width / Math.max(containerRef.current?.clientWidth ?? 430, 1);
  const markerRadius = mapUnitsPerPixel * 3.5;
  const markerHitRadius = mapUnitsPerPixel * 12;
  const cityMarkerRadius = mapUnitsPerPixel * 5;
  const cityMarkerHitRadius = mapUnitsPerPixel * 18;
  const cityLabelFontSize = mapUnitsPerPixel * 11;

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden cursor-grab active:cursor-grabbing"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onWheel={handleWheel}
      style={{ touchAction: "none", background: "var(--map-ocean)" }}
      aria-label="Interactive world map. Drag to pan and pinch or scroll to zoom."
    >
      <svg
        ref={svgRef}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full"
        role="img"
        aria-label="World countries"
      >
        <defs>
          <radialGradient id="golden-atlas-ocean" cx="48%" cy="42%" r="78%">
            <stop offset="0%" stopColor="var(--map-ocean-highlight)" />
            <stop offset="100%" stopColor="var(--map-ocean)" />
          </radialGradient>
          <pattern id="golden-atlas-grid" width="42" height="42" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.8" fill="var(--map-grid)" />
          </pattern>
        </defs>
        <rect width={WORLD_VIEW.width} height={WORLD_VIEW.height} fill="url(#golden-atlas-ocean)" />
        <rect width={WORLD_VIEW.width} height={WORLD_VIEW.height} fill="url(#golden-atlas-grid)" opacity="0.38" pointerEvents="none" />
        {worldMap.locations.map((country) => {
          const id = country.id.toUpperCase();
          const selected = id === selectedId;
          const visited = visitedSet.has(id);
          const planned = plannedSet.has(id) && !visited && !selected;
          const isSmallCountry = smallCountryIds.has(id);
          return (
            <g key={id}>
              <path
                ref={(element) => {
                  if (element) pathRefs.current.set(id, element);
                  else pathRefs.current.delete(id);
                }}
                d={country.path}
                fill={getCountryFill(id)}
                stroke={selected ? "var(--map-selected-border)" : planned ? "var(--gold)" : "var(--map-border)"}
                strokeWidth={selected ? 1.8 : planned ? 1.6 : 0.65}
                strokeDasharray={planned ? "5 3" : undefined}
                vectorEffect="non-scaling-stroke"
                className={`world-map-country cursor-pointer transition-colors duration-200${selected ? " world-map-country--selected" : ""}`}
                style={{
                  filter: selected ? "drop-shadow(0 0 4px rgba(201, 168, 76, 0.66))" : "none",
                  opacity: selected ? 1 : visited ? 0.98 : 0.9,
                  pointerEvents: isSmallCountry ? "none" : "auto",
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  onCountryClick(id, country.name);
                }}
                onPointerDown={(event) => event.stopPropagation()}
                tabIndex={-1}
                aria-hidden="true"
              >
                <title>{country.name}</title>
              </path>
            </g>
          );
        })}

        {smallCountries.map((country) => {
          const selected = country.id === selectedId;
          const visited = visitedSet.has(country.id);
          const planned = plannedSet.has(country.id) && !visited && !selected;
          return (
            <g
              key={`marker-${country.id}`}
              tabIndex={-1}
              aria-hidden="true"
              className="world-map-small-country cursor-pointer"
              onClick={(event) => {
                event.stopPropagation();
                onCountryClick(country.id, country.name);
              }}
              onPointerDown={(event) => event.stopPropagation()}
            >
              {selected && (
                <circle
                  cx={country.x}
                  cy={country.y}
                  r={markerRadius * 2.35}
                  fill="none"
                  stroke="var(--map-selected-border)"
                  strokeWidth="1.5"
                  vectorEffect="non-scaling-stroke"
                  className="world-map-marker-pulse pointer-events-none"
                />
              )}
              <circle
                cx={country.x}
                cy={country.y}
                r={markerRadius}
                fill={getCountryFill(country.id)}
                stroke={selected ? "var(--map-selected-border)" : planned ? "var(--gold)" : "var(--map-border)"}
                strokeWidth={selected ? 1.8 : planned ? 1.8 : 1}
                strokeDasharray={planned ? "3 2" : undefined}
                vectorEffect="non-scaling-stroke"
                className={`world-map-small-country-dot pointer-events-none${selected ? " world-map-country--selected" : ""}`}
              >
                <title>{country.name}</title>
              </circle>
              <circle cx={country.x} cy={country.y} r={markerHitRadius} fill="transparent" stroke="none" />
            </g>
          );
        })}

        {cityMarkers.map((city) => {
          const selected = city.id === selectedCityId;
          const labelWidth = mapUnitsPerPixel * Math.max(54, city.name.length * 7 + 18);
          const labelHeight = mapUnitsPerPixel * 23;
          return (
            <g
              key={`city-${city.id}`}
              role="button"
              tabIndex={0}
              aria-label={`${city.name}${city.region ? `, ${city.region}` : ""}; visited ${city.visitCount} ${city.visitCount === 1 ? "time" : "times"}`}
              aria-pressed={selected}
              className="world-map-city-marker cursor-pointer"
              onClick={(event) => {
                event.stopPropagation();
                onCityClick?.(city.id);
              }}
              onPointerDown={(event) => event.stopPropagation()}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onCityClick?.(city.id);
                }
              }}
            >
              {selected && (
                <circle
                  cx={city.x}
                  cy={city.y}
                  r={cityMarkerRadius * 2.8}
                  fill="none"
                  stroke="var(--map-city-marker)"
                  strokeWidth="1.5"
                  vectorEffect="non-scaling-stroke"
                  className="world-map-marker-pulse pointer-events-none"
                />
              )}
              <circle
                cx={city.x}
                cy={city.y}
                r={cityMarkerRadius}
                fill="var(--map-city-marker)"
                stroke="var(--map-city-marker-border)"
                strokeWidth={selected ? 2.2 : 1.5}
                vectorEffect="non-scaling-stroke"
                className="world-map-city-marker-dot pointer-events-none"
              >
                <title>{city.name}</title>
              </circle>
              {city.visitCount > 1 && (
                <text
                  x={city.x}
                  y={city.y}
                  dy="0.34em"
                  textAnchor="middle"
                  fill="var(--map-city-marker-text)"
                  fontSize={cityLabelFontSize * 0.82}
                  fontWeight="700"
                  className="pointer-events-none select-none"
                >
                  {city.visitCount}
                </text>
              )}
              {selected && (
                <g className="pointer-events-none">
                  <rect
                    x={city.x - labelWidth / 2}
                    y={city.y - cityMarkerRadius - labelHeight - mapUnitsPerPixel * 5}
                    width={labelWidth}
                    height={labelHeight}
                    rx={labelHeight / 2}
                    fill="var(--map-legend-background)"
                    stroke="var(--map-city-marker-border)"
                    strokeWidth="1"
                    vectorEffect="non-scaling-stroke"
                  />
                  <text
                    x={city.x}
                    y={city.y - cityMarkerRadius - mapUnitsPerPixel * 5 - labelHeight / 2}
                    dy="0.34em"
                    textAnchor="middle"
                    fill="var(--foreground)"
                    fontSize={cityLabelFontSize}
                    fontWeight="650"
                    className="select-none"
                  >
                    {city.name}
                  </text>
                </g>
              )}
              <circle cx={city.x} cy={city.y} r={cityMarkerHitRadius} fill="transparent" stroke="none" />
            </g>
          );
        })}
      </svg>

      <div
        className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full px-3 py-1.5 text-[11px] font-medium shadow-sm"
        style={{
          background: "var(--map-hint-background)",
          color: "var(--muted-foreground)",
          opacity: viewBox.width < WORLD_VIEW.width ? 1 : 0.92,
        }}
      >
        {viewBox.width < WORLD_VIEW.width ? "Drag to explore nearby countries" : "Tap a country to zoom in"}
      </div>

      {isDragging && <span className="sr-only" aria-live="polite">Map moving</span>}
    </div>
  );
});
