import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Professional distance calculation dashboard. Calculate routes between sources and destinations, view distance matrices, and manage location data for optimal transportation planning.",
  keywords: [
    "distance dashboard",
    "route calculator",
    "transportation dashboard",
    "logistics planning",
    "distance matrix",
    "route optimization",
    "source destinations",
    "travel calculator"
  ],
  openGraph: {
    title: "Dashboard - Distance Calculator",
    description: "Professional distance calculation dashboard for transportation planning and logistics optimization.",
    url: "/app",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
