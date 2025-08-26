import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | Distance Calculator - Altaradius Transport Solutions",
    default: "Distance Calculator - Altaradius Transport Solutions",
  },
  description: "Professional distance calculation tool for transport logistics. Calculate accurate driving distances and durations between multiple locations with Google Maps integration. Perfect for route planning, logistics management, and transportation analysis.",
  keywords: [
    "distance calculator",
    "route planning",
    "transportation",
    "logistics",
    "driving distance",
    "google maps",
    "altaradius",
    "transport solutions",
    "route optimization",
    "delivery planning",
    "distance matrix",
    "travel time calculator"
  ],
  authors: [{ name: "Altaradius Transport Solutions" }],
  creator: "Altaradius",
  publisher: "Altaradius Transport Solutions",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env.NEXT_PUBLIC_BASE_URL || "https://vat.altaradius.com",
    siteName: "Altaradius Distance Calculator",
    title: "Distance Calculator - Altaradius Transport Solutions",
    description: "Professional distance calculation tool for transport logistics. Calculate accurate driving distances and durations between multiple locations.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Altaradius Distance Calculator - Professional Route Planning Tool",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@altaradius",
    creator: "@altaradius",
    title: "Distance Calculator - Altaradius Transport Solutions",
    description: "Professional distance calculation tool for transport logistics. Calculate accurate driving distances and durations between multiple locations.",
    images: ["/og-image.jpg"],
  },
  alternates: {
    canonical: process.env.NEXT_PUBLIC_BASE_URL || "https://vat.altaradius.com",
  },
  category: "Transportation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Additional SEO meta tags */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#4f46e5" />
        <link rel="canonical" href={process.env.NEXT_PUBLIC_BASE_URL || "https://vat.altaradius.com"} />

        {/* Structured Data for Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "Altaradius Transport Solutions",
              "url": process.env.NEXT_PUBLIC_BASE_URL || "https://vat.altaradius.com",
              "logo": `${process.env.NEXT_PUBLIC_BASE_URL || "https://vat.altaradius.com"}/logo.png`,
              "description": "Professional transport and logistics solutions provider",
              "foundingDate": "2020",
              "industry": "Transportation and Logistics",
              "serviceType": "Distance Calculation and Route Planning"
            })
          }}
        />

        {/* Structured Data for WebApplication */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "Altaradius Distance Calculator",
              "description": "Professional distance calculation tool for transport logistics. Calculate accurate driving distances and durations between multiple locations.",
              "url": process.env.NEXT_PUBLIC_BASE_URL || "https://vat.altaradius.com",
              "applicationCategory": "Transportation",
              "operatingSystem": "Web Browser",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "author": {
                "@type": "Organization",
                "name": "Altaradius Transport Solutions"
              }
            })
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
