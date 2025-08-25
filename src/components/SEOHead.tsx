import Head from 'next/head'

interface SEOProps {
  title?: string
  description?: string
  canonicalUrl?: string
  ogImage?: string
  ogType?: 'website' | 'article'
  noIndex?: boolean
  structuredData?: object
}

export default function SEOHead({
  title,
  description,
  canonicalUrl,
  ogImage = '/og-image.jpg',
  ogType = 'website',
  noIndex = false,
  structuredData
}: SEOProps) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://distance.altaradius.com'
  const fullTitle = title
    ? `${title} | Distance Calculator - Altaradius Transport Solutions`
    : 'Distance Calculator - Altaradius Transport Solutions'

  const defaultDescription = 'Professional distance calculation tool for transport logistics. Calculate accurate driving distances and durations between multiple locations with Google Maps integration.'
  const pageDescription = description || defaultDescription

  const fullCanonicalUrl = canonicalUrl ? `${baseUrl}${canonicalUrl}` : baseUrl
  const fullOgImage = `${baseUrl}${ogImage}`

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={pageDescription} />

      {/* Canonical URL */}
      <link rel="canonical" href={fullCanonicalUrl} />

      {/* Robots */}
      {noIndex && <meta name="robots" content="noindex,nofollow" />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:url" content={fullCanonicalUrl} />
      <meta property="og:type" content={ogType} />
      <meta property="og:image" content={fullOgImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content="Altaradius Distance Calculator" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={process.env.NEXT_PUBLIC_TWITTER_HANDLE || '@altaradius'} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={pageDescription} />
      <meta name="twitter:image" content={fullOgImage} />

      {/* Additional meta tags */}
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="theme-color" content="#4f46e5" />

      {/* Structured Data */}
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData)
          }}
        />
      )}
    </Head>
  )
}
