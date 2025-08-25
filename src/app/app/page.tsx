'use client'

import { useState, useEffect } from 'react'
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

// Function to load all distances with pagination
const loadAllDistances = async (): Promise<Distance[]> => {
  const allDistances: Distance[] = []
  let page = 1
  let hasMore = true
  
  while (hasMore) {
    try {
      const response = await fetch(`/api/distances?page=${page}&limit=1000`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.distances) {
        allDistances.push(...data.distances)
        hasMore = data.pagination?.hasMore || false
        page++
        
        console.log(`Loaded page ${page - 1}: ${data.distances.length} distances, total so far: ${allDistances.length}`)
      } else {
        hasMore = false
      }
    } catch (error) {
      console.error(`Error loading distances page ${page}:`, error)
      hasMore = false
    }
  }
  
  console.log(`Finished loading all distances: ${allDistances.length} total`)
  return allDistances
}

export default function AppPage() {
  const [sources, setSources] = useState<Source[]>([])
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [distances, setDistances] = useState<Distance[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeSection, setActiveSection] = useState<'calculator' | 'distances' | 'manage'>('calculator')
  const [isLoading, setIsLoading] = useState(true)

  // Clear cache function for fresh data
  const clearCache = () => {
    queryCache.clear()
    console.log('Cache cleared')
  }

  // Load data with caching
  const loadData = async () => {
    setIsLoading(true)
    try {
      const [sourcesData, destinationsData, distancesData] = await Promise.all([
        cachedFetch('/api/sources'),
        cachedFetch('/api/destinations'),
        loadAllDistances() // Use new paginated function for distances
      ])

      setSources(sourcesData as Source[])
      setDestinations(destinationsData as Destination[])
      setDistances(distancesData as Distance[])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

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
  }, [])

  // Calculate statistics for sidebar
  const totalDistances = distances.length
  const uniqueSources = new Set(distances.map(d => d.source.id)).size
  const uniqueDestinations = new Set(distances.map(d => d.destination.id)).size

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
        onSectionChange={setActiveSection}
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
                onRefresh={refreshDistances}
                onSourceAdded={addSource}
                onDestinationAdded={addDestination}
              />
            )}

            {activeSection === 'distances' && (
              <DistanceMatrix
                distances={distances}
              />
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
