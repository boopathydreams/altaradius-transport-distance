import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Distance Calculator - Altaradius Transport Solutions',
    short_name: 'Distance Calculator',
    description: 'Professional distance calculation tool for transport logistics. Calculate accurate driving distances and durations between multiple locations.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#4f46e5',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    categories: ['transportation', 'logistics', 'business', 'productivity'],
    lang: 'en',
    dir: 'ltr',
  }
}
