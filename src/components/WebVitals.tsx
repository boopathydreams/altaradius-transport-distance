'use client'

import { useReportWebVitals } from 'next/web-vitals'

declare global {
  interface Window {
    gtag?: (command: string, eventName: string, parameters?: Record<string, unknown>) => void
  }
}

export function WebVitals() {
  useReportWebVitals((metric) => {
    // In production, you might want to send these to an analytics service
    console.log(metric)

    // Example: Send to Google Analytics
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', metric.name, {
        custom_parameter_1: metric.value,
        custom_parameter_2: metric.id,
        custom_parameter_3: metric.name,
        custom_parameter_4: metric.delta,
      })
    }

    // Example: Send to custom analytics endpoint
    if (process.env.NODE_ENV === 'production') {
      fetch('/api/analytics/web-vitals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metric),
      }).catch((error) => {
        console.error('Failed to send web vitals:', error)
      })
    }
  })

  return null
}
