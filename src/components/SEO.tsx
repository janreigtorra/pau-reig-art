import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  locale?: string;
  keywords?: string;
  /** If true, this is the homepage and uses the full default title without suffix */
  isHomepage?: boolean;
}

const defaultMeta = {
  title: 'Pau Reig – Gegants i Imatgeria Festiva Catalana | Constructor de Gegants a Solsona',
  description:
    'Pau Reig és un artista i constructor de gegants i bestiari de Solsona, Catalunya. Creador de gegants, capgrossos i figures tradicionals per a festes catalanes. Art festiu artesanal amb tècniques tradicionals.',
  image: 'https://www.paureig.art/logo/logo_main.png',
  url: 'https://www.paureig.art/',
  type: 'website',
  locale: 'ca_ES',
  keywords: 'Pau Reig, gegants, bestiari, constructor de gegants, imatgeria festiva, capgrossos, figures tradicionals, festes catalanes, art festiu, Solsona, Catalunya',
  author: 'Pau Reig Torra',
};

export default function SEO({
  title,
  description = defaultMeta.description,
  image = defaultMeta.image,
  url = defaultMeta.url,
  type = defaultMeta.type,
  locale = defaultMeta.locale,
  keywords = defaultMeta.keywords,
  isHomepage = false,
}: SEOProps) {
  // For homepage, use the full default title. For other pages, append site name suffix.
  const fullTitle = isHomepage
    ? defaultMeta.title
    : title
      ? `${title} | Pau Reig – Gegants i Art Festiu`
      : defaultMeta.title;

  return (
    <Helmet prioritizeSeoTags>
      {/* Primary Meta Tags - these are critical for SEO */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content={defaultMeta.author} />
      
      {/* Additional SEO meta tags */}
      <meta name="robots" content="index, follow" />
      <meta name="googlebot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={fullTitle} />
      <meta property="og:site_name" content="Pau Reig – Gegants i Art Festiu" />
      <meta property="og:locale" content={locale} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:image:alt" content={fullTitle} />

      {/* Canonical */}
      <link rel="canonical" href={url} />
    </Helmet>
  );
}

