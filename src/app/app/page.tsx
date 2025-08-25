'use client'

import { useState, useEffect, useCallback } from 'react'
import Sidebar from '../../components/Sidebar'
import Calculator from '../../components/Calculator'
import DistanceMatrix from '../../components/DistanceMatrix'
import ManageData from '../../components/ManageData'

interface Source {
  id: number
  name: string
  latitude: number
  longitude: number
  address?: string
}

interface Destination {
  id: number
  name: string
  pincode?: string
  address?: string
  latitude?: number
  longitude?: number
}

interface Distance {
  id: number
  distance: number
  duration?: number
  directionsUrl?: string
  source: Source
  destination: Destination
  createdAt: string
}

// Query cache for performance optimization
interface CacheEntry {
  data: Source[] | Destination[] | Distance[]
  timestamp: number
}

const queryCache = new Map<string, CacheEntry>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

const cachedFetch = async (url: string): Promise<Source[] | Destination[] | Distance[]> => {
  const cacheKey = url
  const cached = queryCache.get(cacheKey)
  const now = Date.now()

  if (cached && (now - cached.timestamp) < CACHE_DURATION) {
    console.log('Cache hit for:', url)
    return cached.data
  }

  console.log('Cache miss for:', url)
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const data = await response.json()

  // Handle paginated distances response
  if (url.includes('/api/distances') && data.distances && data.pagination) {
    console.log(`Loaded page ${data.pagination.page} of ${data.pagination.pages} (${data.distances.length} distances)`)
    queryCache.set(cacheKey, { data: data.distances, timestamp: now })
    return data.distances
  }

  queryCache.set(cacheKey, { data, timestamp: now })
  return data
}

// Function to get distance statistics/count only
const loadDistanceStats = async () => {
  try {
    const response = await fetch('/api/distances/stats')
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const stats = await response.json()
    console.log('Distance stats:', stats)
    return stats
  } catch (error) {
    console.error('Error loading distance stats:', error)
    return { total: 0, sources: 0, destinations: 0 }
  }
}

interface DistanceStats {
  calculatedDistances: number
  sources: number
  destinations: number
  totalPossibleDistances: number
  missingDistances: number
  completionPercentage: number
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  pages: number
  hasMore: boolean
}

// Function to load distances with proper pagination (only current page)
const loadDistancePage = async (page: number = 1, limit: number = 50): Promise<{ distances: Distance[], pagination: PaginationInfo }> => {
  try {
    const response = await fetch(`/api/distances?page=${page}&limit=${limit}`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    console.log(`Loaded distances page ${page}: ${data.distances?.length || 0} distances`)

    return {
      distances: data.distances || [],
      pagination: data.pagination || {} as PaginationInfo
    }
  } catch (error) {
    console.error(`Error loading distances page ${page}:`, error)
    return { distances: [], pagination: {} as PaginationInfo }
  }
}

export default function AppPage() {
  const [sources, setSources] = useState<Source[]>([])
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [distances, setDistances] = useState<Distance[]>([])
  const [distanceStats, setDistanceStats] = useState<DistanceStats>({} as DistanceStats)
  const [distancePagination, setDistancePagination] = useState<PaginationInfo>({} as PaginationInfo)
  const [currentDistancePage, setCurrentDistancePage] = useState(1)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeSection, setActiveSection] = useState<'calculator' | 'distances' | 'manage'>('calculator')
  const [isLoading, setIsLoading] = useState(true)

  // Clear cache function for fresh data
  const clearCache = () => {
    queryCache.clear()
    console.log('Cache cleared')
  }

  // Load specific page of distances
  const loadDistancesPage = useCallback(async (page: number) => {
    try {
      const { distances: pageDistances, pagination } = await loadDistancePage(page, 50)
      setDistances(pageDistances)
      setDistancePagination(pagination)
      setCurrentDistancePage(page)
    } catch (error) {
      console.error('Error loading distances page:', error)
    }
  }, [])

  // Load initial data efficiently
  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [sourcesData, destinationsData, statsData] = await Promise.all([
        cachedFetch('/api/sources'),
        cachedFetch('/api/destinations'),
        loadDistanceStats() // Only get stats, not all distances
      ])

      setSources(sourcesData as Source[])
      setDestinations(destinationsData as Destination[])
      setDistanceStats(statsData)

      // Load only first page of distances for the distance matrix view
      if (activeSection === 'distances') {
        await loadDistancesPage(1)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [activeSection, loadDistancesPage])

  // Efficient update functions
  const addSource = (newSource: Source) => {
    setSources(prev => [...prev, newSource])
  }

  const addDestination = (newDestination: Destination) => {
    setDestinations(prev => [...prev, newDestination])
  }

  const removeSource = (sourceId: number) => {
    setSources(prev => prev.filter(s => s.id !== sourceId))
    // Also remove related distances
    setDistances(prev => prev.filter(d => d.source.id !== sourceId))
  }

  const removeDestination = (destinationId: number) => {
    setDestinations(prev => prev.filter(d => d.id !== destinationId))
    // Also remove related distances
    setDistances(prev => prev.filter(d => d.destination.id !== destinationId))
  }

  // Refresh only distances (when user explicitly calculates)
  const refreshDistances = async () => {
    try {
      const distancesData = await cachedFetch('/api/distances')
      setDistances(distancesData as Distance[])
    } catch (error) {
      console.error('Error loading distances:', error)
    }
  }

  // Refresh data and clear cache
  const refreshData = async () => {
    clearCache()
    await loadData()
  }

  useEffect(() => {
    loadData()
  }, [loadData]) // Now properly depends on loadData

  // Handle section change - load distances only when needed
  const handleSectionChange = (section: 'calculator' | 'distances' | 'manage') => {
    setActiveSection(section)
    if (section === 'distances' && distances.length === 0) {
      loadDistancesPage(1)
    }
  }

  // Calculate statistics for sidebar
  const totalDistances = distanceStats.calculatedDistances || distances.length
  const uniqueSources = new Set(distances.map(d => d.source.id)).size
  const uniqueDestinations = destinations.length || 0

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <div className="text-lg font-medium text-gray-900">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        distanceCount={totalDistances}
        sourceCount={uniqueSources}
        destinationCount={uniqueDestinations}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50">
          <div className="p-6">
            {/* Cache Status and Controls */}
            <div className="mb-4 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Cache entries: {queryCache.size} |
                Last updated: {new Date().toLocaleTimeString()}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={clearCache}
                  className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded text-gray-700"
                >
                  Clear Cache
                </button>
                <button
                  onClick={refreshData}
                  className="text-sm bg-indigo-100 hover:bg-indigo-200 px-3 py-1 rounded text-indigo-700"
                >
                  Refresh Data
                </button>
              </div>
            </div>

            {/* Content based on active section */}
            {activeSection === 'calculator' && (
              <Calculator
                sources={sources}
                destinations={destinations}
                distances={distances}
                calculatedCount={distanceStats.calculatedDistances}
                onRefresh={refreshDistances}
                onSourceAdded={addSource}
                onDestinationAdded={addDestination}
              />
            )}

            {activeSection === 'distances' && (
              <div>
                <DistanceMatrix
                  distances={distances}
                  pagination={distancePagination}
                  currentPage={currentDistancePage}
                  onPageChange={loadDistancesPage}
                />
                {distanceStats.calculatedDistances > 0 && (
                  <div className="mt-4 text-sm text-gray-600">
                    Showing {distances.length} of {distanceStats.calculatedDistances} total distances
                    {distancePagination.total && (
                      <span> • Page {currentDistancePage} of {distancePagination.pages}</span>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeSection === 'manage' && (
              <ManageData
                sources={sources}
                destinations={destinations}
                onRefresh={refreshData}
                onSourceDeleted={removeSource}
                onDestinationDeleted={removeDestination}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
