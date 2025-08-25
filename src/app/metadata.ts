import { Metadata } from 'next'

export const loginMetadata: Metadata = {
  title: "Login - Distance Calculator",
  description: "Access your professional distance calculation dashboard. Secure login to calculate routes, manage locations, and optimize transportation planning.",
  robots: {
    index: false, // Don't index login pages
    follow: false,
  },
  openGraph: {
    title: "Login - Distance Calculator",
    description: "Access your professional distance calculation dashboard.",
  },
}

export const appMetadata: Metadata = {
  title: "Dashboard - Distance Calculator",
  description: "Professional distance calculation dashboard. Calculate routes between sources and destinations, view distance matrices, and manage location data for optimal transportation planning.",
  keywords: [
    "distance dashboard",
    "route calculator",
    "transportation dashboard",
    "logistics planning",
    "distance matrix",
    "route optimization"
  ],
  openGraph: {
    title: "Dashboard - Distance Calculator",
    description: "Professional distance calculation dashboard for transportation planning and logistics optimization.",
  },
}
