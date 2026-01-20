import React, { useContext, useMemo, useState, useEffect, useLayoutEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { LanguageContext } from '../App';

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

// Generate SEO-friendly slug from work data
function generateSeoSlug(slug: string, meta: WorkMeta): string {
  const city = meta.city?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-') || '';
  const baseName = slug.toLowerCase();
  return city ? `${baseName}-${city}` : baseName;
}

// Build works data (same logic as LObra.tsx)
function buildWorks(): WorkItem[] {
  const jsonModules = import.meta.glob('/pages/*/*.json', { eager: true }) as Record<string, unknown>;
  const mainImageModules = import.meta.glob('/pages/*/main.{jpg,jpeg,png}', {
    eager: true,
    as: 'url',
  }) as Record<string, string>;
  const main2ImageModules = import.meta.glob('/pages/*/main2.{jpg,jpeg,png}', {
    eager: true,
    as: 'url',
  }) as Record<string, string>;
  const albumImageModules = import.meta.glob('/pages/*/*.{jpg,jpeg,png}', {
    eager: true,
    as: 'url',
  }) as Record<string, string>;

  const worksByFolder: Record<string, WorkItem> = {};

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

  Object.entries(mainImageModules).forEach(([path, url]) => {
    const folderMatch = path.match(/^\/pages\/([^\/]+)\//);
    if (!folderMatch) return;
    const folder = folderMatch[1];
    if (worksByFolder[folder]) {
      worksByFolder[folder].mainImageUrl = url;
    }
  });

  Object.entries(main2ImageModules).forEach(([path, url]) => {
    const folderMatch = path.match(/^\/pages\/([^\/]+)\//);
    if (!folderMatch) return;
    const folder = folderMatch[1];
    if (worksByFolder[folder]) {
      worksByFolder[folder].main2ImageUrl = url;
    }
  });

  const albumByFolder: Record<string, string[]> = {};
  Object.entries(albumImageModules).forEach(([path, url]) => {
    const match = path.match(/^\/pages\/([^\/]+)\/([^\/]+)$/);
    if (!match) return;
    const folder = match[1];
    const fileName = match[2].toLowerCase();
    if (!albumByFolder[folder]) albumByFolder[folder] = [];
    albumByFolder[folder].push(url + `#${fileName}`);
  });

  Object.entries(albumByFolder).forEach(([folder, urlsWithTags]) => {
    const sorted = urlsWithTags
      .sort((a, b) => {
        const an = a.split('#')[1] ?? '';
        const bn = b.split('#')[1] ?? '';
        const aIsMain = an.startsWith('main.');
        const bIsMain = bn.startsWith('main.');
        if (aIsMain && !bIsMain) return -1;
        if (!aIsMain && bIsMain) return 1;
        return an.localeCompare(bn);
      })
      .map((u) => u.split('#')[0]);
    if (worksByFolder[folder]) {
      worksByFolder[folder].albumImageUrls = sorted;
      if (!worksByFolder[folder].mainImageUrl && sorted.length > 0) {
        worksByFolder[folder].mainImageUrl = sorted[0];
      }
    }
  });

  return Object.values(worksByFolder).filter(
    (w) => w.meta?.nom || w.mainImageUrl || (w.albumImageUrls && w.albumImageUrls.length > 0)
  );
}

export default function ObraDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { language } = useContext(LanguageContext);
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const works = useMemo(() => buildWorks(), []);
  
  // Find work by slug (support both old slugs and new SEO slugs)
  const work = useMemo(() => {
    if (!slug) return null;
    // Try exact match first
    let found = works.find((w) => w.slug === slug);
    if (found) return found;
    // Try SEO slug match
    found = works.find((w) => generateSeoSlug(w.slug, w.meta) === slug);
    if (found) return found;
    // Try partial match (slug starts with work slug)
    found = works.find((w) => slug.startsWith(w.slug));
    return found || null;
  }, [works, slug]);

  // Find related works (same city or adjacent in list)
  const relatedWorks = useMemo(() => {
    if (!work) return [];
    const currentIndex = works.findIndex((w) => w.slug === work.slug);
    const related: WorkItem[] = [];
    
    // Add works from same city
    works.forEach((w) => {
      if (w.slug !== work.slug && w.meta.city && w.meta.city === work.meta.city) {
        related.push(w);
      }
    });
    
    // Add adjacent works if we don't have enough
    if (related.length < 3 && currentIndex > 0) {
      const prev = works[currentIndex - 1];
      if (!related.find((r) => r.slug === prev.slug)) {
        related.push(prev);
      }
    }
    if (related.length < 3 && currentIndex < works.length - 1) {
      const next = works[currentIndex + 1];
      if (!related.find((r) => r.slug === next.slug)) {
        related.push(next);
      }
    }
    
    return related.slice(0, 3);
  }, [works, work]);

  // Keyboard navigation
  useEffect(() => {
    if (!work?.albumImageUrls?.length) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setCurrentImageIndex((i) => (i + 1) % work.albumImageUrls.length);
      } else if (e.key === 'ArrowLeft') {
        setCurrentImageIndex((i) => (i - 1 + work.albumImageUrls.length) % work.albumImageUrls.length);
      } else if (e.key === 'Escape') {
        navigate('/obra');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [work, navigate]);

  // Scroll to top BEFORE browser paints (useLayoutEffect runs synchronously)
  useLayoutEffect(() => {
    // Disable browser's automatic scroll restoration
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    // Scroll to top immediately
    window.scrollTo(0, 0);
  }, [slug]);

  // Reset image index when work changes
  useEffect(() => {
    setCurrentImageIndex(0);
  }, [slug]);

  const t = (cat: string, en: string) => (language === 'catala' ? cat : en);

  if (!work) {
    return (
      <div className="container section">
        <h1>{t('Obra no trobada', 'Work not found')}</h1>
        <p>{t('L\'obra que busques no existeix.', 'The work you are looking for does not exist.')}</p>
        <Link to="/obra" className="btn-back">
          ← {t('Tornar a L\'Obra', 'Back to The Work')}
        </Link>
      </div>
    );
  }

  const seoSlug = generateSeoSlug(work.slug, work.meta);
  const canonicalUrl = `https://www.paureig.art/obra/${seoSlug}`;
  const imageUrl = work.mainImageUrl 
    ? (work.mainImageUrl.startsWith('http') ? work.mainImageUrl : `https://www.paureig.art${work.mainImageUrl}`)
    : 'https://www.paureig.art/logo/logo_main.png';
  
  const title = language === 'catala'
    ? `${work.meta.nom} – Gegant Festiu | Pau Reig`
    : `${work.meta.nom} – Festive Figure | Pau Reig`;
  
  const description = language === 'catala'
    ? (work.meta.text_catala?.slice(0, 155) + '...' || `${work.meta.nom} és una figura de bestiari festiu creada per Pau Reig${work.meta.year ? ` el ${work.meta.year}` : ''}${work.meta.city ? ` per a ${work.meta.city}` : ''}.`)
    : (work.meta.text_angles?.slice(0, 155) + '...' || `${work.meta.nom} is a festive figure created by Pau Reig${work.meta.year ? ` in ${work.meta.year}` : ''}${work.meta.city ? ` for ${work.meta.city}` : ''}.`);

  // JSON-LD structured data for artwork
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VisualArtwork',
    'name': work.meta.nom,
    'description': language === 'catala' ? work.meta.text_catala : work.meta.text_angles,
    'image': imageUrl,
    'url': canonicalUrl,
    'dateCreated': work.meta.year?.toString(),
    'creator': {
      '@type': 'Person',
      'name': 'Pau Reig Torra',
      'url': 'https://www.paureig.art/artista'
    },
    'artform': 'Sculpture',
    'artMedium': 'Mixed media, traditional techniques',
    'artworkSurface': 'Festive figure',
    ...(work.meta.city && {
      'locationCreated': {
        '@type': 'Place',
        'name': work.meta.city,
        'address': {
          '@type': 'PostalAddress',
          'addressLocality': work.meta.city,
          'addressRegion': 'Catalunya',
          'addressCountry': 'ES'
        }
      }
    })
  };

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="title" content={title} />
        <meta name="description" content={description} />
        <link rel="canonical" href={canonicalUrl} />
        
        {/* Open Graph */}
        <meta property="og:type" content="article" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={imageUrl} />
        <meta property="og:site_name" content="Pau Reig – Art | Constructor d'Imatgeria Festiva" />
        <meta property="og:locale" content={language === 'catala' ? 'ca_ES' : 'en_US'} />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={canonicalUrl} />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={imageUrl} />
        
        {/* JSON-LD */}
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      </Helmet>

      <div className="container section obra-detail">
        {/* Breadcrumb */}
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link to="/">{t('Inici', 'Home')}</Link>
          <span className="separator">›</span>
          <Link to="/obra">{t("L'Obra", 'The Work')}</Link>
          <span className="separator">›</span>
          <span className="current">{work.meta.nom}</span>
        </nav>

        {/* Main content */}
        <div className="obra-detail-content">
          {/* Info section - text content */}
          <div className="obra-detail-info">
            <h1>{work.meta.nom}</h1>
            
            <div className="obra-detail-meta">
              {work.meta.year && (
                <span className="chip chip-lg">
                  <svg className="chip-icon" viewBox="0 0 24 24" aria-hidden>
                    <path fill="currentColor" d="M19 4h-1V2h-2v2H8V2H6v2H5a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3Zm1 15a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V10h16v9Zm0-11H4V7a1 1 0 0 1 1-1h1v2h2V6h8v2h2V6h1a1 1 0 0 1 1 1v2Z"/>
                  </svg>
                  {work.meta.year}
                </span>
              )}
              {work.meta.city && (
                <span className="chip chip-lg">
                  <svg className="chip-icon" viewBox="0 0 24 24" aria-hidden>
                    <path fill="currentColor" d="M12 2a7 7 0 0 1 7 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 0 1 7-7Zm0 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"/>
                  </svg>
                  {work.meta.city}
                </span>
              )}
            </div>

            <div className="obra-detail-description text-lg text-justify">
              <p>{language === 'catala' ? work.meta.text_catala : work.meta.text_angles}</p>
            </div>

            {/* Actions - only show on desktop */}
            <div className="obra-detail-actions desktop-only">
              <Link to="/obra" className="btn-secondary">
                ← {t('Tornar a L\'Obra', 'Back to The Work')}
              </Link>
              <Link to="/artista" className="btn-text">
                {t('Sobre l\'artista', 'About the artist')} →
              </Link>
            </div>
          </div>

          {/* Image gallery */}
          <div className="obra-detail-gallery">
            {work.albumImageUrls?.length > 0 ? (
              <div className="obra-detail-carousel">
                <img
                  className="obra-detail-main-img"
                  src={work.albumImageUrls[currentImageIndex]}
                  alt={`${work.meta.nom} - ${currentImageIndex + 1}`}
                  loading="lazy"
                />
                {work.albumImageUrls.length > 1 && (
                  <>
                    <button
                      className="carousel-btn prev"
                      aria-label={t('Anterior', 'Previous')}
                      onClick={() =>
                        setCurrentImageIndex((i) => (i - 1 + work.albumImageUrls.length) % work.albumImageUrls.length)
                      }
                    >
                      ‹
                    </button>
                    <button
                      className="carousel-btn next"
                      aria-label={t('Següent', 'Next')}
                      onClick={() =>
                        setCurrentImageIndex((i) => (i + 1) % work.albumImageUrls.length)
                      }
                    >
                      ›
                    </button>
                  </>
                )}
              </div>
            ) : work.mainImageUrl ? (
              <img
                className="obra-detail-main-img"
                src={work.mainImageUrl}
                alt={work.meta.nom}
                loading="lazy"
              />
            ) : (
              <div className="obra-detail-placeholder">
                <span>🎨</span>
              </div>
            )}
            
            {/* Thumbnails */}
            {work.albumImageUrls?.length > 1 && (
              <div className="obra-detail-thumbs">
                {work.albumImageUrls.map((url, idx) => (
                  <button
                    key={idx}
                    className={`thumb ${idx === currentImageIndex ? 'active' : ''}`}
                    onClick={() => setCurrentImageIndex(idx)}
                  >
                    <img src={url} alt={`${work.meta.nom} miniatura ${idx + 1}`} loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions - only show on mobile, after gallery */}
        <div className="obra-detail-actions mobile-only">
          <Link to="/obra" className="btn-secondary">
            ← {t('Tornar a L\'Obra', 'Back to The Work')}
          </Link>
          <Link to="/artista" className="btn-text">
            {t('Sobre l\'artista', 'About the artist')} →
          </Link>
        </div>

        {/* Related works */}
        {relatedWorks.length > 0 && (
          <section className="related-works">
            <h2>{t('Obres relacionades', 'Related works')}</h2>
            <div className="related-works-grid">
              {relatedWorks.map((related) => (
                <Link
                  key={related.slug}
                  to={`/obra/${generateSeoSlug(related.slug, related.meta)}`}
                  className="related-work-card"
                >
                  {related.mainImageUrl ? (
                    <img src={related.mainImageUrl} alt={related.meta.nom} loading="lazy" />
                  ) : (
                    <div className="related-work-placeholder">🎨</div>
                  )}
                  <div className="related-work-info">
                    <h3>{related.meta.nom}</h3>
                    {related.meta.city && <span className="city">{related.meta.city}</span>}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}

// Export helper for generating SEO slugs (used by other components)
export { generateSeoSlug, buildWorks };
export type { WorkItem, WorkMeta };

