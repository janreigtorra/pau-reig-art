import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { LanguageContext, ModalContext } from '../App';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type Language = 'catala' | 'english';

type WorkMeta = {
  nom: string;
  city?: string;
  address?: string;
  text_catala?: string;
  text_angles?: string;
  year?: number | string;
  month?: string | number;
};

type WorkItem = {
  slug: string;
  folderPath: string;
  meta: WorkMeta;
  mainImageUrl?: string;
  main2ImageUrl?: string;
  albumImageUrls: string[];
};

type ViewMode = 'grid' | 'list' | 'map' | 'timeline';

function buildWorks(): WorkItem[] {
  // Load JSON metadata from each folder under /pages/*/*.json
  const jsonModules = import.meta.glob('/pages/*/*.json', { eager: true }) as Record<string, unknown>;
  // Load main image per folder (jpg/png/jpeg)
  const mainImageModules = import.meta.glob('/pages/*/main.{jpg,jpeg,png}', {
    eager: true,
    as: 'url',
  }) as Record<string, string>;
  // Load optional secondary main image for list view
  const main2ImageModules = import.meta.glob('/pages/*/main2.{jpg,jpeg,png}', {
    eager: true,
    as: 'url',
  }) as Record<string, string>;
  // Load all images per folder for the album
  const albumImageModules = import.meta.glob('/pages/*/*.{jpg,jpeg,png}', {
    eager: true,
    as: 'url',
  }) as Record<string, string>;

  const worksByFolder: Record<string, WorkItem> = {};

  // Build base items from JSON files
  Object.entries(jsonModules).forEach(([path, mod]) => {
    const folderMatch = path.match(/^\/pages\/([^\/]+)\//);
    if (!folderMatch) return;
    const folder = folderMatch[1];
    const slug = folder;
    const metaModule = mod as any;
    const meta: WorkMeta = (metaModule && typeof metaModule === 'object' && 'default' in metaModule)
      ? (metaModule.default as WorkMeta)
      : (metaModule as WorkMeta);

    worksByFolder[folder] = {
      slug,
      folderPath: `/pages/${folder}`,
      meta,
      mainImageUrl: undefined,
      main2ImageUrl: undefined,
      albumImageUrls: [],
    };
  });

  // Attach main image URLs
  Object.entries(mainImageModules).forEach(([path, url]) => {
    const folderMatch = path.match(/^\/pages\/([^\/]+)\//);
    if (!folderMatch) return;
    const folder = folderMatch[1];
    if (!worksByFolder[folder]) {
      // Create placeholder if JSON missing
      worksByFolder[folder] = {
        slug: folder,
        folderPath: `/pages/${folder}`,
        meta: { nom: folder },
        mainImageUrl: url,
        main2ImageUrl: undefined,
        albumImageUrls: [],
      };
    } else {
      worksByFolder[folder].mainImageUrl = url;
    }
  });

  // Attach main2 image URLs
  Object.entries(main2ImageModules).forEach(([path, url]) => {
    const folderMatch = path.match(/^\/pages\/([^\/]+)\//);
    if (!folderMatch) return;
    const folder = folderMatch[1];
    if (!worksByFolder[folder]) {
      worksByFolder[folder] = {
        slug: folder,
        folderPath: `/pages/${folder}`,
        meta: { nom: folder },
        mainImageUrl: undefined,
        main2ImageUrl: url,
        albumImageUrls: [],
      };
    } else {
      worksByFolder[folder].main2ImageUrl = url;
    }
  });

  // Attach album images, sorted by filename (try to put main first)
  const albumByFolder: Record<string, string[]> = {};
  Object.entries(albumImageModules).forEach(([path, url]) => {
    const match = path.match(/^\/pages\/([^\/]+)\/([^\/]+)$/);
    if (!match) return;
    const folder = match[1];
    const fileName = match[2].toLowerCase();
    if (!albumByFolder[folder]) albumByFolder[folder] = [];
    albumByFolder[folder].push(url + `#${fileName}`); // tag filename to help sorting, stripped later
  });

  Object.entries(albumByFolder).forEach(([folder, urlsWithTags]) => {
    const sorted = urlsWithTags
      .sort((a, b) => {
        const an = a.split('#')[1] ?? '';
        const bn = b.split('#')[1] ?? '';
        // Prefer files named 'main.*' first, then natural order
        const aIsMain = an.startsWith('main.');
        const bIsMain = bn.startsWith('main.');
        if (aIsMain && !bIsMain) return -1;
        if (!aIsMain && bIsMain) return 1;
        return an.localeCompare(bn);
      })
      .map((u) => u.split('#')[0]);
    if (!worksByFolder[folder]) {
      worksByFolder[folder] = {
        slug: folder,
        folderPath: `/pages/${folder}`,
        meta: { nom: folder },
        albumImageUrls: sorted,
      } as WorkItem;
    } else {
      worksByFolder[folder].albumImageUrls = sorted;
      // If no explicit main image, pick first in sorted list
      if (!worksByFolder[folder].mainImageUrl && sorted.length > 0) {
        worksByFolder[folder].mainImageUrl = sorted[0];
      }
    }
  });

  // Only keep folders that at least have meta or images
  const items = Object.values(worksByFolder).filter(
    (w) => w.meta?.nom || w.mainImageUrl || (w.albumImageUrls && w.albumImageUrls.length > 0)
  );

  // Custom order: lleo, oliba (a.k.a. oliva), ovella, asparrac, somera, then the rest by year desc and name
  const priorityOrder = ['lleo', 'oliba', 'ovella', 'asparrac', 'somera', 'oliva'];
  items.sort((a, b) => {
    const ai = priorityOrder.indexOf(a.slug);
    const bi = priorityOrder.indexOf(b.slug);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    const ay = typeof a.meta.year === 'string' ? parseInt(a.meta.year, 10) : a.meta.year ?? -Infinity;
    const by = typeof b.meta.year === 'string' ? parseInt(b.meta.year, 10) : b.meta.year ?? -Infinity;
    if (Number.isFinite(ay) && Number.isFinite(by) && ay !== by) return (by as number) - (ay as number);
    return (a.meta.nom || a.slug).localeCompare(b.meta.nom || b.slug);
  });

  return items;
}

export default function LObra() {
  const { language } = useContext(LanguageContext);
  const { setIsModalOpen } = useContext(ModalContext);
  const [view, setView] = useState<ViewMode>('grid');
  const works = useMemo(() => buildWorks(), []);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);

  const selected = useMemo(() => works.find((w) => w.slug === selectedSlug) || null, [works, selectedSlug]);

  // Close on Esc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedSlug(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Reset carousel index on selection change
  useEffect(() => {
    setCurrentImageIndex(0);
  }, [selectedSlug]);

  // Notify modal context when drawer state changes
  useEffect(() => {
    setIsModalOpen(!!selectedSlug);
  }, [selectedSlug, setIsModalOpen]);

  // Carousel keyboard navigation when drawer open
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (!selected?.albumImageUrls?.length) return;
      if (e.key === 'ArrowRight') {
        setCurrentImageIndex((i) => (i + 1) % selected.albumImageUrls.length);
      } else if (e.key === 'ArrowLeft') {
        setCurrentImageIndex((i) => (i - 1 + selected.albumImageUrls.length) % selected.albumImageUrls.length);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected]);

  const t = (keyCat: string, keyEn: string) => (language === 'catala' ? keyCat : keyEn);

  return (
    <div className="container section">
      <div className="obra-header">
        <h1 className="obra-title">{t("L'Obra", 'The Work')}</h1>
        <div className="obra-toolbar" role="group" aria-label="View mode">
          <button
            className={`view-toggle ${view === 'grid' ? 'active' : ''}`}
            onClick={() => setView('grid')}
          >
            {t('Graella', 'Grid')}
          </button>
          <button
            className={`view-toggle ${view === 'list' ? 'active' : ''}`}
            onClick={() => setView('list')}
          >
            {t('Línies', 'List')}
          </button>
          <button
            className={`view-toggle ${view === 'map' ? 'active' : ''}`}
            onClick={() => setView('map')}
          >
            {t('Mapa', 'Map')}
          </button>
          <button
            className={`view-toggle ${view === 'timeline' ? 'active' : ''}`}
            onClick={() => setView('timeline')}
          >
            {t('Cronològic', 'Timeline')}
          </button>
        </div>
      </div>

      {view === 'grid' ? (
        <div className="obra-grid">
          {works.map((w) => (
            <button key={w.slug} className="obra-card" onClick={() => setSelectedSlug(w.slug)}>
              {w.mainImageUrl ? (
                <img className="obra-card-img" src={w.mainImageUrl} alt={w.meta.nom} loading="lazy" />
              ) : (
                <div className="obra-card-placeholder" />
              )}
              <div className="obra-card-title">{w.meta.nom}</div>
            </button>
          ))}
        </div>
      ) : view === 'list' ? (
        <div className="obra-list">
          {works.map((w) => (
            <button key={w.slug} className="obra-row" onClick={() => setSelectedSlug(w.slug)}>
              {w.main2ImageUrl || w.mainImageUrl ? (
                <img
                  className="obra-row-thumb"
                  src={w.main2ImageUrl || w.mainImageUrl}
                  alt={w.meta.nom}
                  loading="lazy"
                />
              ) : (
                <div className="obra-row-thumb placeholder" />
              )}
              <div className="obra-row-main">
                <div className="obra-row-title">{w.meta.nom}</div>
                <div className="obra-row-meta">
                  {w.meta.year ? <span className="chip">{w.meta.year}</span> : null}
                  {w.meta.city ? <span className="chip">{w.meta.city}</span> : null}
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : view === 'map' ? (
        <MapView works={works} onSelect={(slug) => setSelectedSlug(slug)} />
      ) : (
        <TimelineView works={works} onSelect={(slug) => setSelectedSlug(slug)} language={language} />
      )}

      {/* Drawer */}
      <div className={`obra-drawer right ${selected ? 'open' : ''}`} aria-hidden={!selected}>
        <div className="obra-drawer-inner">
          <div className="obra-drawer-header">
            <div className="obra-drawer-title">{selected?.meta.nom}</div>
            <button className="close-btn" aria-label={t('Tancar', 'Close')} onClick={() => setSelectedSlug(null)}>
              ×
            </button>
          </div>
          {selected ? (
            <div className="obra-drawer-content">
              <div className="obra-drawer-meta">
                {selected.meta.year ? (
                  <span className="chip chip-lg">
                    <svg className="chip-icon" viewBox="0 0 24 24" aria-hidden>
                      <path fill="currentColor" d="M19 4h-1V2h-2v2H8V2H6v2H5a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3Zm1 15a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V10h16v9Zm0-11H4V7a1 1 0 0 1 1-1h1v2h2V6h8v2h2V6h1a1 1 0 0 1 1 1v2Z"/>
                    </svg>
                    {selected.meta.year}
                  </span>
                ) : null}
                {selected.meta.city ? (
                  <span className="chip chip-lg">
                    <svg className="chip-icon" viewBox="0 0 24 24" aria-hidden>
                      <path fill="currentColor" d="M12 2a7 7 0 0 1 7 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 0 1 7-7Zm0 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"/>
                    </svg>
                    {selected.meta.city}
                  </span>
                ) : null}
              </div>
              <div className="obra-drawer-text text-lg text-justify">
                {language === 'catala' ? (
                  <p>{selected.meta.text_catala}</p>
                ) : (
                  <p>{selected.meta.text_angles}</p>
                )}
              </div>
              {selected.albumImageUrls?.length ? (
                <div className="obra-carousel">
                  <img
                    className="obra-carousel-img"
                    src={selected.albumImageUrls[currentImageIndex]}
                    alt={`${selected.meta.nom} ${currentImageIndex + 1}`}
                    loading="lazy"
                  />
                  {selected.albumImageUrls.length > 1 ? (
                    <>
                      <button
                        className="carousel-btn prev"
                        aria-label={t('Anterior', 'Previous')}
                        onClick={() =>
                          setCurrentImageIndex((i) => (i - 1 + selected.albumImageUrls.length) % selected.albumImageUrls.length)
                        }
                      >
                        ‹
                      </button>
                      <button
                        className="carousel-btn next"
                        aria-label={t('Següent', 'Next')}
                        onClick={() =>
                          setCurrentImageIndex((i) => (i + 1) % selected.albumImageUrls.length)
                        }
                      >
                        ›
                      </button>
                      <div className="carousel-pager">
                        {currentImageIndex + 1} / {selected.albumImageUrls.length}
                      </div>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      {selected ? <div className={`drawer-backdrop active`} onClick={() => setSelectedSlug(null)} /> : null}
    </div>
  );
}

type MapViewProps = { works: WorkItem[]; onSelect: (slug: string) => void };

function MapView({ works, onSelect }: MapViewProps) {
  const mapContainerId = 'obra-map-container';
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (mapRef.current) return;
    const container = document.getElementById(mapContainerId);
    if (!container) return;
    const map = L.map(container).setView([41.7, 1.8], 7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    type LatLng = { lat: number; lng: number };
    const cacheKey = 'obra-geo-cache-v2';
    const cache: Record<string, LatLng> = JSON.parse(localStorage.getItem(cacheKey) || '{}');
    const addresses = works
      .map((w) => ({ work: w, query: w.meta.address || w.meta.city || '' }))
      .filter((x) => x.query);

    const results: { work: WorkItem; position: LatLng }[] = [];

    const geocode = async (query: string): Promise<LatLng | null> => {
      if (cache[query]) return cache[query];
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
        const res = await fetch(url, { headers: { Accept: 'application/json' } });
        if (!res.ok) return null;
        const data = (await res.json()) as Array<{ lat: string; lon: string }>;
        if (data && data.length > 0) {
          const pos = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
          cache[query] = pos;
          localStorage.setItem(cacheKey, JSON.stringify(cache));
          return pos;
        }
      } catch {}
      return null;
    };

    const run = async () => {
      for (const a of addresses) {
        const pos = await geocode(a.query);
        if (pos) results.push({ work: a.work, position: pos });
      }

      const groupKey = (p: LatLng) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`;
      const groups = new Map<string, { center: LatLng; items: { work: WorkItem; position: LatLng }[] }>();
      results.forEach((r) => {
        const key = groupKey(r.position);
        const g = groups.get(key) || { center: r.position, items: [] };
        g.items.push(r);
        groups.set(key, g);
      });

      layer.clearLayers();
      const bounds = L.latLngBounds([]);

      groups.forEach((g) => {
        const n = g.items.length;
        // Build one composite marker per town with all images side-by-side
        const itemsHtml = g.items
          .map((r) => {
            const iconUrl = r.work.mainImageUrl;
            const name = r.work.meta.nom;
            if (iconUrl) {
              return `<div class="obra-marker-box" data-slug="${r.work.slug}"><img src="${iconUrl}" alt="${name}" /><div class="obra-marker-label">${name}</div></div>`;
            }
            return `<div class="obra-marker-box" data-slug="${r.work.slug}"><div class="obra-marker-fallback">${name}</div></div>`;
          })
          .join('');
        const html = `<div class="obra-marker-row">${itemsHtml}</div>`;
        const widthPer = 90; // approximate per item width including gap
        const totalWidth = Math.max(90, n * widthPer);
        const totalHeight = 130; // approximate
        const icon = L.divIcon({
          html,
          className: 'obra-marker',
          iconSize: [totalWidth, totalHeight],
          iconAnchor: [totalWidth / 2, totalHeight - 20],
        });
        const pos = [g.center.lat, g.center.lng] as [number, number];
        const marker = L.marker(pos, { icon, title: g.items.map((x) => x.work.meta.nom).join(', ') });
        marker.addTo(layer);
        const el = marker.getElement();
        if (el) {
          el.addEventListener('click', (e) => {
            const target = (e.target as HTMLElement).closest('[data-slug]') as HTMLElement | null;
            if (target) {
              const slug = target.getAttribute('data-slug');
              if (slug) onSelect(slug);
            }
          });
        }
        bounds.extend(pos as any);
      });

      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [60, 60] });
      }
    };

    run();
  }, [works, onSelect]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return <div id={mapContainerId} className="obra-map" style={{ position: 'relative', zIndex: 1 }} />;
}

type TimelineViewProps = { works: WorkItem[]; onSelect: (slug: string) => void; language: Language };

function monthToIndex(m?: string | number): number | null {
  if (m === undefined || m === null) return null;
  if (typeof m === 'number') return Math.min(11, Math.max(0, m - 1));
  const s = m.toString().trim().toLowerCase();
  const map: Record<string, number> = {
    'january': 0, 'jan': 0, 'gener': 0, 'ene': 0,
    'february': 1, 'feb': 1, 'febrer': 1,
    'march': 2, 'mar': 2, 'març': 2, 'marzo': 2,
    'april': 3, 'apr': 3, 'abril': 3,
    'may': 4, 'mai': 4, 'mayo': 4, 'maig': 4,
    'june': 5, 'jun': 5, 'juny': 5, 'junio': 5,
    'july': 6, 'jul': 6, 'juliol': 6, 'julio': 6,
    'august': 7, 'aug': 7, 'agost': 7,
    'september': 8, 'sep': 8, 'setembre': 8,
    'october': 9, 'oct': 9, 'octubre': 9,
    'november': 10, 'nov': 10, 'novembre': 10,
    'december': 11, 'dec': 11, 'desembre': 11, 'diciembre': 11,
  };
  return map[s] ?? null;
}

function TimelineView({ works, onSelect, language }: TimelineViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState<number>(1000);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const el = containerRef.current;
    const update = () => {
      if (el) {
        const newWidth = el.clientWidth;
        setWidth(newWidth);
        setIsMobile(newWidth <= 768);
      }
    };
    update();
    const ro = new ResizeObserver(update);
    if (el) ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const timelineData = useMemo(() => {
    // Group works by year and month
    const yearMap = new Map<number, Map<number, WorkItem[]>>();
    
    works.forEach((work) => {
      const year = typeof work.meta.year === 'string' ? parseInt(work.meta.year, 10) : work.meta.year;
      if (!year || isNaN(year)) return;
      
      const monthIndex = monthToIndex(work.meta.month) ?? 0;
      
      if (!yearMap.has(year)) {
        yearMap.set(year, new Map());
      }
      
      const monthMap = yearMap.get(year)!;
      if (!monthMap.has(monthIndex)) {
        monthMap.set(monthIndex, []);
      }
      
      monthMap.get(monthIndex)!.push(work);
    });

    // Get all years that have works
    const yearsWithWorks = Array.from(yearMap.keys()).sort((a, b) => b - a); // Latest first
    
    // Create timeline points for ALL months of each year that has works
    const timePoints: Array<{
      year: number;
      month: number;
      works: WorkItem[];
      timestamp: number;
    }> = [];

    yearsWithWorks.forEach(year => {
      const monthMap = yearMap.get(year)!;
      
      // Add all 12 months for this year
      for (let month = 0; month < 12; month++) {
        const works = monthMap.get(month) || [];
        timePoints.push({
          year,
          month,
          works,
          timestamp: year * 12 + month
        });
      }
    });

    // Sort by timestamp (latest first for top-to-bottom)
    timePoints.sort((a, b) => b.timestamp - a.timestamp);
    
    return timePoints;
  }, [works]);

  const centerX = width / 2;
  const baseSpacing = isMobile ? 25 : 35; // Reduced spacing on mobile
  const extraSpacingForWorks = isMobile ? 70 : 95; // Reduced extra spacing on mobile
  
  // Calculate path points vertically with dynamic spacing
  const pathPoints = useMemo(() => {
    if (timelineData.length === 0) return [];
    
    let cumulativeY = isMobile ? 60 : 100; // Start closer to top on mobile
    
    return timelineData.map((point, index) => {
      const hasWorks = point.works.length > 0;
      const spacing = hasWorks ? baseSpacing + extraSpacingForWorks : baseSpacing;
      
      const y = cumulativeY;
      cumulativeY += spacing;
      
      // Create a gentle horizontal wave - reduced on mobile
      const waveOffset = Math.sin(index * 0.3) * (isMobile ? 120 : 260); 
      const x = centerX + waveOffset;
      
      return {
        x,
        y,
        ...point
      };
    });
  }, [timelineData, centerX, baseSpacing, extraSpacingForWorks, isMobile]);

  // Calculate total height based on actual positions
  const totalHeight = pathPoints.length > 0 
    ? pathPoints[pathPoints.length - 1].y + (isMobile ? 120 : 200)
    : (isMobile ? 400 : 600);

  // Generate SVG path for vertical timeline
  const pathData = useMemo(() => {
    if (pathPoints.length === 0) return '';
    
    let path = `M ${pathPoints[0].x} ${pathPoints[0].y}`;
    
    // Use smooth curves for vertical path
    for (let i = 1; i < pathPoints.length; i++) {
      const prev = pathPoints[i - 1];
      const curr = pathPoints[i];
      
      // Calculate control points for smooth vertical curve
      const cp1X = prev.x;
      const cp1Y = prev.y + (curr.y - prev.y) * 0.3;
      const cp2X = curr.x;
      const cp2Y = curr.y - (curr.y - prev.y) * 0.3;
      
      path += ` C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${curr.x} ${curr.y}`;
    }
    
    return path;
  }, [pathPoints]);

  const getMonthName = (monthIndex: number): string => {
    const monthNames = language === 'catala' 
      ? ['Gener', 'Febrer', 'Març', 'Abril', 'Maig', 'Juny', 'Juliol', 'Agost', 'Setembre', 'Octubre', 'Novembre', 'Desembre']
      : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return monthNames[monthIndex] || '';
  };
  

  return (
    <div ref={containerRef} className="timeline-path-container" style={{ height: `${totalHeight}px`, position: 'relative', width: '100%' }}>
      
      {/* SVG Path */}
      <svg 
        className="timeline-svg" 
        width={width} 
        height={totalHeight}
        style={{ position: 'absolute', top: 0, left: 0, zIndex: 1 }}
      >
        <defs>
          <marker id="timeline-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="#a67c5a" />
          </marker>
          
          {/* Brown pastel gradient for the path */}
          <linearGradient id="brownPathGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#d4b896" />
            <stop offset="50%" stopColor="#c4a67a" />
            <stop offset="100%" stopColor="#a67c5a" />
          </linearGradient>
        </defs>
        
        {/* Main dashed path */}
        <path
          d={pathData}
          stroke="url(#brownPathGradient)"
          strokeWidth={isMobile ? "2" : "3"}
          strokeDasharray="12,6"
          fill="none"
          markerEnd="url(#timeline-arrow)"
        />
        
        {/* Timeline points */}
        {pathPoints.map((point, index) => {
          const hasWorks = point.works.length > 0;
          const isCurrentYear = index === 0 || pathPoints[index - 1]?.year !== point.year;
          
          return (
            <g key={`${point.year}-${point.month}`}>
              {/* Point circle - larger if it has works */}
              <circle
                cx={point.x}
                cy={point.y}
                r={hasWorks ? (isMobile ? 8 : 10) : (isMobile ? 4 : 6)}
                fill="white"
                stroke="#a67c5a"
                strokeWidth={hasWorks ? (isMobile ? 2 : 3) : (isMobile ? 1 : 2)}
                opacity={hasWorks ? 1 : 0.6}
              />
              
              {/* Year label - only show on first month of each year */}
              {isCurrentYear && (
                <text
                  x={point.x + (isMobile ? 15 : 25)}
                  y={point.y - (isMobile ? 6 : 8)}
                  textAnchor="start"
                  className="timeline-date-label"
                  style={{
                    fontSize: isMobile ? '14px' : '18px',
                    fontWeight: '700',
                    fill: '#8b6f3d',
                    fontFamily: 'system-ui, sans-serif'
                  }}
                >
                  {point.year}
                </text>
              )}
              
              {/* Month label - always show */}
              <text
                x={point.x + (isMobile ? 15 : 25)}
                y={point.y + (isCurrentYear ? (isMobile ? 6 : 8) : (isMobile ? 3 : 4))}
                textAnchor="start"
                className="timeline-month-label"
                style={{
                  fontSize: hasWorks ? (isMobile ? '11px' : '14px') : (isMobile ? '9px' : '12px'),
                  fontWeight: hasWorks ? '600' : '400',
                  fill: hasWorks ? '#a67c5a' : '#c4a67a',
                  fontFamily: 'system-ui, sans-serif'
                }}
              >
                {getMonthName(point.month)}
              </text>
            </g>
          );
        })}
      </svg>
      
      {/* Work items */}
      {pathPoints.map((point, index) => {
        if (point.works.length === 0) return null;
        
        return point.works.map((work, workIndex) => {
          const totalWorks = point.works.length;
          
          // For single work: place on left side
          // For multiple works: alternate left/right starting with left
          let isLeft;
          if (totalWorks === 1) {
            isLeft = true;
          } else {
            isLeft = workIndex % 2 === 0;
          }
          
          const sideMultiplier = isLeft ? -1 : 1;
          const distance = isMobile ? 100 : 150; // Reduced distance on mobile
          
          const itemX = point.x + sideMultiplier * distance;
          const itemY = point.y + (workIndex * (isMobile ? 6 : 10)); // Reduced stagger on mobile
          
          return (
            <div
              key={`${work.slug}-${index}`}
              className="timeline-work-item"
              style={{
                position: 'absolute',
                left: itemX,
                top: itemY,
                transform: 'translate(-50%, -50%)',
                zIndex: 10,
              }}
            >
              {/* Connection line */}
              <svg
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  width: distance + (isMobile ? 30 : 50),
                  height: isMobile ? 30 : 50,
                  transform: 'translate(-50%, -50%)',
                  zIndex: -1,
                  pointerEvents: 'none'
                }}
              >
                <line
                  x1={isLeft ? distance + (isMobile ? 15 : 25) : (isMobile ? 15 : 25)}
                  y1={isMobile ? 15 : 25}
                  x2={isLeft ? (isMobile ? 15 : 25) : distance + (isMobile ? 15 : 25)}
                  y2={isMobile ? 15 : 25}
                  stroke="#c4a67a"
                  strokeWidth="1.5"
                  strokeDasharray="4,3"
                />
              </svg>
              
              {/* Work card */}
              <button
                className="timeline-work-card"
                onClick={() => onSelect(work.slug)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: isMobile ? '8px' : '12px',
                  background: 'white',
                  borderRadius: '12px',
                  border: '2px solid #d4b896',
                  cursor: 'pointer',
                  minWidth: isMobile ? '100px' : '140px',
                  maxWidth: isMobile ? '120px' : '160px',
                  boxShadow: '0 4px 12px rgba(166, 124, 90, 0.15)',
                }}
              >
                {work.main2ImageUrl || work.mainImageUrl ? (
                  <img
                    src={work.main2ImageUrl || work.mainImageUrl}
                    alt={work.meta.nom}
                    style={{
                      width: isMobile ? '60px' : '80px',
                      height: isMobile ? '60px' : '80px',
                      objectFit: 'cover',
                      borderRadius: '8px',
                      marginBottom: isMobile ? '6px' : '8px',
                      border: '1px solid #d4b896'
                    }}
                    loading="lazy"
                  />
                ) : (
                  <div
                    style={{
                      width: isMobile ? '60px' : '80px',
                      height: isMobile ? '60px' : '80px',
                      backgroundColor: '#f4f1e8',
                      border: '1px solid #d4b896',
                      borderRadius: '8px',
                      marginBottom: isMobile ? '6px' : '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: isMobile ? '20px' : '28px',
                      color: '#a67c5a'
                    }}
                  >
                    🎨
                  </div>
                )}
                
                <div
                  style={{
                    fontSize: isMobile ? '11px' : '13px',
                    fontWeight: '600',
                    color: '#8b6f3d',
                    textAlign: 'center',
                    lineHeight: '1.3',
                    marginBottom: '4px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}
                >
                  {work.meta.nom}
                </div>
                
                {work.meta.city && (
                  <div
                    style={{
                      fontSize: isMobile ? '9px' : '11px',
                      color: '#a67c5a',
                      textAlign: 'center',
                      padding: isMobile ? '1px 6px' : '2px 8px',
                      backgroundColor: '#f4f1e8',
                      borderRadius: '12px',
                      border: '1px solid #e6d4b8'
                    }}
                  >
                    {work.meta.city}
                  </div>
                )}
              </button>
            </div>
          );
        });
      })}
      
      {/* Timeline direction indicator - hidden on mobile */}
      {!isMobile && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: 'rgba(255,255,255,0.95)',
            borderRadius: '24px',
            fontSize: '12px',
            color: '#8b6f3d',
            fontWeight: '600',
            zIndex: 100,
            border: '1px solid #d4b896',
            boxShadow: '0 4px 12px rgba(166, 124, 90, 0.15)'
          }}
        >
          <span>{language === 'catala' ? 'Cronològic' : 'Timeline'}</span>
          <div style={{ 
            width: '2px', 
            height: '16px', 
            background: 'linear-gradient(to bottom, #d4b896, #a67c5a)',
            borderRadius: '1px'
          }} />
          <span style={{ transform: 'rotate(90deg)' }}>→</span>
        </div>
      )}
    </div>
  );
}
type CalendarViewProps = { works: WorkItem[]; onSelect: (slug: string) => void; language: Language };

function getMonthNames(language: Language): string[] {
  if (language === 'catala') {
    return ['Gener', 'Febrer', 'Març', 'Abril', 'Maig', 'Juny', 'Juliol', 'Agost', 'Setembre', 'Octubre', 'Novembre', 'Desembre'];
  }
  return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
}

function CalendarView({ works, onSelect, language }: CalendarViewProps) {
  const months = getMonthNames(language);

  const groups = useMemo(() => {
    // Group by year first
    const byYear = new Map<number, WorkItem[]>();
    works.forEach((w) => {
      const y = typeof w.meta.year === 'string' ? parseInt(w.meta.year, 10) : (w.meta.year as number | undefined);
      if (!y || Number.isNaN(y)) return;
      const arr = byYear.get(y) || [];
      arr.push(w);
      byYear.set(y, arr);
    });
    // Sort years desc, and within year keep stable order; monthIndex computed for placement
    return Array.from(byYear.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([year, items]) => ({ year, items }));
  }, [works]);

  return (
    <div className="calendar">
      {groups.map(({ year, items }) => {
        const buckets: WorkItem[][] = Array.from({ length: 12 }, () => []);
        const unknown: WorkItem[] = [];
        items.forEach((w) => {
          const idx = monthToIndex(w.meta.month ?? undefined);
          if (idx === null) unknown.push(w);
          else buckets[idx].push(w);
        });
        // Spread unknown across year evenly
        unknown.forEach((w, i) => {
          const target = Math.round((i / Math.max(1, unknown.length - 1)) * 11);
          buckets[target].push(w);
        });

        return (
          <div key={year} className="calendar-year">
            <div className="calendar-year-header">{year}</div>
            <div className="calendar-grid">
              {buckets.map((list, m) => (
                <div key={m} className="calendar-month">
                  <div className="calendar-month-title">{months[m]}</div>
                  <div className="calendar-month-items">
                    {list.map((w) => (
                      <button key={w.slug} className="calendar-item" onClick={() => onSelect(w.slug)}>
                        {w.main2ImageUrl || w.mainImageUrl ? (
                          <img src={w.main2ImageUrl || w.mainImageUrl} alt={w.meta.nom} loading="lazy" />
                        ) : (
                          <div className="calendar-item-placeholder" />
                        )}
                        <div className="calendar-item-name">{w.meta.nom}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
