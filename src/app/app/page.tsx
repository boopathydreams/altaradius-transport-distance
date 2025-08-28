'use client'

import { useState, useEffect, useCallback } from 'react'
import Sidebar from '../../components/Sidebar'
import Calculator from '../../components/Calculator'
import DistanceMatrix from '../../components/DistanceMatrix'
import ManageData from '../../components/ManageData'
import ToastContainer from '../../components/Toast'
import { useToast } from '../../hooks/useToast'

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
const loadDistancePage = async (page: number = 1, limit: number = 50, sourceFilter: string = '', destinationFilter: string = ''): Promise<{ distances: Distance[], pagination: PaginationInfo }> => {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    })

    if (sourceFilter) params.append('sourceFilter', sourceFilter)
    if (destinationFilter) params.append('destinationFilter', destinationFilter)

    const response = await fetch(`/api/distances?${params.toString()}`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    console.log(`Loaded distances page ${page}: ${data.distances?.length || 0} distances (filtered: source="${sourceFilter}", destination="${destinationFilter}")`)

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
  // Toast notifications
  const { toasts, removeToast, success, error, warning } = useToast()
  
  // Sidebar and section state - completely separate from data loading
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeSection, setActiveSection] = useState<'calculator' | 'distances' | 'manage'>('calculator')

  // Data state - only loaded when needed
  const [sources, setSources] = useState<Source[]>([])
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [distances, setDistances] = useState<Distance[]>([])
  const [distanceStats, setDistanceStats] = useState<DistanceStats>({} as DistanceStats)
  const [distancePagination, setDistancePagination] = useState<PaginationInfo>({} as PaginationInfo)
  const [currentDistancePage, setCurrentDistancePage] = useState(1)

  // Filter state for distance matrix
  const [sourceFilter, setSourceFilter] = useState('')
  const [destinationFilter, setDestinationFilter] = useState('')

  // Loading states
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isLoadingDistances, setIsLoadingDistances] = useState(false)
  const [hasLoadedSources, setHasLoadedSources] = useState(false)
  const [hasLoadedDestinations, setHasLoadedDestinations] = useState(false)
  const [hasLoadedStats, setHasLoadedStats] = useState(false)

  // Clear cache function for fresh data
  const clearCache = () => {
    queryCache.clear()
    console.log('Cache cleared')
  }

  // Load specific page of distances with filters - with better state management
  const loadDistancesPage = useCallback(async (page: number, sourceFilterParam?: string, destinationFilterParam?: string) => {
    if (isLoadingDistances) return // Prevent multiple simultaneous loads

    const currentSourceFilter = sourceFilterParam ?? sourceFilter
    const currentDestinationFilter = destinationFilterParam ?? destinationFilter

    // Only trigger loading if page or filters actually changed
    if (page === currentDistancePage &&
        currentSourceFilter === sourceFilter &&
        currentDestinationFilter === destinationFilter &&
        distances.length > 0) {
      return // No need to reload
    }

    setIsLoadingDistances(true)
    try {
      const { distances: pageDistances, pagination } = await loadDistancePage(page, 50, currentSourceFilter, currentDestinationFilter)
      setDistances(pageDistances)
      setDistancePagination(pagination)
      setCurrentDistancePage(page)
    } catch (error) {
      console.error('Error loading distances page:', error)
    } finally {
      setIsLoadingDistances(false)
    }
  }, [isLoadingDistances, sourceFilter, destinationFilter, currentDistancePage, distances.length])

  // Load sources only when needed
  const loadSources = useCallback(async () => {
    if (hasLoadedSources) return
    try {
      const sourcesData = await cachedFetch('/api/sources')
      setSources(sourcesData as Source[])
      setHasLoadedSources(true)
    } catch (error) {
      console.error('Error loading sources:', error)
    }
  }, [hasLoadedSources])

  // Load destinations only when needed
  const loadDestinations = useCallback(async () => {
    if (hasLoadedDestinations) return
    try {
      const destinationsData = await cachedFetch('/api/destinations')
      setDestinations(destinationsData as Destination[])
      setHasLoadedDestinations(true)
    } catch (error) {
      console.error('Error loading destinations:', error)
    }
  }, [hasLoadedDestinations])

  // Load stats only when needed
  const loadStats = useCallback(async () => {
    if (hasLoadedStats) return
    try {
      const statsData = await loadDistanceStats()
      setDistanceStats(statsData)
      setHasLoadedStats(true)
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }, [hasLoadedStats])

  // Load minimal initial data - only stats for sidebar
  const loadInitialData = useCallback(async () => {
    setIsInitialLoading(true)
    try {
      await loadStats()
    } catch (error) {
      console.error('Error loading initial data:', error)
    } finally {
      setIsInitialLoading(false)
    }
  }, [loadStats])

  // Load initial section data after stats are loaded
  useEffect(() => {
    const loadInitialSectionData = async () => {
      if (!isInitialLoading && activeSection === 'calculator') {
        await Promise.all([loadSources(), loadDestinations()])
      }
    }
    loadInitialSectionData()
  }, [isInitialLoading, activeSection, loadSources, loadDestinations])

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
      // Clear distances cache and reload stats
      queryCache.delete('/api/distances')
      const [statsData] = await Promise.all([
        loadDistanceStats()
      ])
      setDistanceStats(statsData)

      // If we're on the distances section, refresh the current page
      if (activeSection === 'distances') {
        await loadDistancesPage(currentDistancePage)
      }
    } catch (error) {
      console.error('Error refreshing distances:', error)
    }
  }

  // Refresh data and clear cache
  const refreshData = async () => {
    clearCache()
    setHasLoadedSources(false)
    setHasLoadedDestinations(false)
    setHasLoadedStats(false)
    await loadInitialData()

    // Force reload current section data (bypass hasLoaded checks)
    if (activeSection === 'calculator' || activeSection === 'manage') {
      try {
        // Force reload sources
        const sourcesData = await cachedFetch('/api/sources')
        setSources(sourcesData as Source[])
        setHasLoadedSources(true)
        
        // Force reload destinations
        const destinationsData = await cachedFetch('/api/destinations')
        setDestinations(destinationsData as Destination[])
        setHasLoadedDestinations(true)
      } catch (error) {
        console.error('Error reloading data:', error)
        // Ensure flags are set to true even on error to prevent infinite loading
        setHasLoadedSources(true)
        setHasLoadedDestinations(true)
      }
    } else if (activeSection === 'distances') {
      await loadDistancesPage(currentDistancePage)
    }
  }

  useEffect(() => {
    loadInitialData()
  }, [loadInitialData]) // Load initial data only once

  // Handle section change - load data only when switching to a section that needs it
  const handleSectionChange = async (section: 'calculator' | 'distances' | 'manage') => {
    setActiveSection(section)

    // Load required data based on section
    if (section === 'calculator') {
      // Calculator needs sources and destinations for dropdowns
      await Promise.all([loadSources(), loadDestinations()])
    } else if (section === 'distances') {
      // Distance matrix needs distances data
      if (distances.length === 0) {
        try {
          await loadDistancesPage(1)
        } catch (error) {
          console.error('Error loading distances on section change:', error)
        }
      }
    } else if (section === 'manage') {
      // Manage section needs sources and destinations
      await Promise.all([loadSources(), loadDestinations()])
    }
  }

  // Calculate statistics for sidebar - use loaded data or defaults
  const totalDistances = distanceStats.calculatedDistances || 0
  const uniqueSources = distanceStats.sources || 0
  const uniqueDestinations = distanceStats.destinations || 0

  if (isInitialLoading) {
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
              <>
                {(!hasLoadedSources || !hasLoadedDestinations) ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <div className="text-sm text-gray-600">Loading calculator data...</div>
                  </div>
                ) : (
                  <Calculator
                    sources={sources}
                    destinations={destinations}
                    distances={distances}
                    calculatedCount={distanceStats.calculatedDistances}
                    onRefresh={refreshDistances}
                    onSourceAdded={addSource}
                    onDestinationAdded={addDestination}
                    onSuccess={success}
                    onError={error}
                    onWarning={warning}
                  />
                )}
              </>
            )}

            {activeSection === 'distances' && (
              <div>
                <>
                  <DistanceMatrix
                    distances={distances}
                    pagination={distancePagination}
                    currentPage={currentDistancePage}
                    onPageChange={loadDistancesPage}
                    sourceFilter={sourceFilter}
                    destinationFilter={destinationFilter}
                    onSourceFilterChange={setSourceFilter}
                    onDestinationFilterChange={setDestinationFilter}
                    isLoading={isLoadingDistances}
                  />
                  {/* {distanceStats.calculatedDistances > 0 && (
                    <div className="mt-4 text-sm text-gray-600">
                      Showing {distances.length} of {distanceStats.calculatedDistances} total distances
                      {distancePagination.total && (
                        <span> • Page {currentDistancePage} of {distancePagination.pages}</span>
                      )}
                    </div>
                  )} */}
                </>
              </div>
            )}

            {activeSection === 'manage' && (
              <>
                {(!hasLoadedSources || !hasLoadedDestinations) ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <div className="text-sm text-gray-600">Loading management data...</div>
                  </div>
                ) : (
                  <ManageData
                    sources={sources}
                    destinations={destinations}
                    onRefresh={refreshData}
                    onSourceDeleted={removeSource}
                    onDestinationDeleted={removeDestination}
                    onSuccess={success}
                    onError={error}
                    onWarning={warning}
                  />
                )}
              </>
            )}
          </div>
        </main>
      </div>
      
      {/* Toast Container */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  )
}
