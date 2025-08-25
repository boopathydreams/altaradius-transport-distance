import { useState, useMemo, useEffect } from 'react'
import {
  ChartBarIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  SparklesIcon,
  BeakerIcon
} from '@heroicons/react/24/outline'

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

interface PaginationInfo {
  page: number
  limit: number
  total: number
  pages: number
  hasMore: boolean
}

interface DistanceMatrixProps {
  distances: Distance[]
  pagination?: PaginationInfo
  currentPage?: number
  onPageChange?: (page: number) => void
}

export default function DistanceMatrix({
  distances,
  pagination,
  currentPage = 1,
  onPageChange
}: DistanceMatrixProps) {
  const [sourceSearch, setSourceSearch] = useState('')
  const [destinationSearch, setDestinationSearch] = useState('')
  // Remove client-side pagination state since we use server-side now
  const [itemsPerPage] = useState(50)

  // Filter distances based on search terms (client-side filtering of current page)
  const filteredDistances = useMemo(() => {
    return distances.filter(distance =>
      distance.source.name.toLowerCase().includes(sourceSearch.toLowerCase()) &&
      distance.destination.name.toLowerCase().includes(destinationSearch.toLowerCase())
    )
  }, [distances, sourceSearch, destinationSearch])

  // Use server-side pagination data
  const totalItems = pagination?.total || filteredDistances.length
  const totalPages = pagination?.pages || 1
  const paginatedDistances = filteredDistances // All distances from current page

  // Analytics calculations
  const analytics = useMemo(() => {
    if (filteredDistances.length === 0) {
      return {
        shortest: 0,
        longest: 0,
        average: 0,
        total: 0,
        totalDuration: 0,
        averageDuration: 0
      }
    }

    const distances = filteredDistances.map(d => d.distance)
    const durations = filteredDistances.map(d => d.duration || 0).filter(d => d > 0)

    return {
      shortest: Math.min(...distances),
      longest: Math.max(...distances),
      average: distances.reduce((sum, d) => sum + d, 0) / distances.length,
      total: distances.reduce((sum, d) => sum + d, 0),
      totalDuration: durations.reduce((sum, d) => sum + d, 0),
      averageDuration: durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0
    }
  }, [filteredDistances])

  // Reset page when filters change (for server-side pagination, notify parent)
  useEffect(() => {
    if (onPageChange && currentPage !== 1) {
      onPageChange(1)
    }
  }, [sourceSearch, destinationSearch, onPageChange, currentPage])

  const handlePageChange = (page: number) => {
    if (onPageChange && page !== currentPage) {
      onPageChange(Math.max(1, Math.min(page, totalPages)))
    }
  }

  const clearFilters = () => {
    setSourceSearch('')
    setDestinationSearch('')
    if (onPageChange && currentPage !== 1) {
      onPageChange(1)
    }
  }

  if (distances.length === 0) {
    return (
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-2 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Distance Matrix
            </h1>
            <SparklesIcon className="h-5 w-5 text-yellow-500" />
          </div>
          <p className="text-gray-600 text-lg">View and analyze calculated distances between sources and destinations</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl p-8 mb-6">
              <BeakerIcon className="h-16 w-16 text-indigo-500 mx-auto mb-4" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">No distances calculated yet</h3>
            <p className="text-gray-600 text-lg mb-6">
              Start by using the calculator to generate distance data between your sources and destinations.
            </p>
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
              <p className="text-indigo-700 font-medium">💡 Tip: Use the Calculator page to add sources, destinations, and calculate distances!</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (filteredDistances.length === 0) {
    return (
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-2 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Distance Matrix
            </h1>
            <div className="bg-orange-100 px-3 py-1 rounded-full">
              <span className="text-sm font-medium text-orange-800">0 of {distances.length} routes</span>
            </div>
          </div>
          <p className="text-gray-600 text-lg">View and analyze calculated distances between sources and destinations</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="bg-gradient-to-r from-orange-100 to-red-100 rounded-2xl p-8 mb-6">
              <MagnifyingGlassIcon className="h-16 w-16 text-orange-500 mx-auto mb-4" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">No matching results</h3>
            <p className="text-gray-600 text-lg mb-6">
              No routes match your current search criteria. Try adjusting your filters to see more results.
            </p>
            <button
              onClick={clearFilters}
              className="bg-gradient-to-r from-orange-600 to-red-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-orange-700 hover:to-red-700 transition-all duration-200 transform hover:scale-105 flex items-center space-x-2 mx-auto"
            >
              <XMarkIcon className="h-5 w-5" />
              <span>Clear All Filters</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto h-screen flex flex-col p-4">
      {/* Header */}
      <div className="mb-4 flex-shrink-0">
        <div className="flex items-center space-x-3 mb-2">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-2 rounded-lg">
            <ChartBarIcon className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Distance Matrix
          </h1>
          <div className="bg-green-100 px-3 py-1 rounded-full">
            <span className="text-sm font-medium text-green-800">
              {filteredDistances.length} {filteredDistances.length === distances.length ? 'routes' : `of ${distances.length} routes`}
            </span>
          </div>
        </div>
        <p className="text-gray-600 text-lg">View and analyze calculated distances between sources and destinations</p>
      </div>

      {/* Simple Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4 flex-shrink-0">
        <div className="bg-blue-50 p-3 rounded-lg text-center">
          <div className="text-lg font-bold text-blue-600">{analytics.shortest.toFixed(1)}km</div>
          <div className="text-xs text-blue-600">Shortest Route</div>
        </div>
        <div className="bg-green-50 p-3 rounded-lg text-center">
          <div className="text-lg font-bold text-green-600">{analytics.average.toFixed(1)}km</div>
          <div className="text-xs text-green-600">Average Distance</div>
        </div>
        <div className="bg-purple-50 p-3 rounded-lg text-center">
          <div className="text-lg font-bold text-purple-600">{analytics.longest.toFixed(1)}km</div>
          <div className="text-xs text-purple-600">Longest Route</div>
        </div>
        <div className="bg-indigo-50 p-3 rounded-lg text-center">
          <div className="text-lg font-bold text-indigo-600">{filteredDistances.length}</div>
          <div className="text-xs text-indigo-600">Total Routes</div>
        </div>
      </div>

      {/* Distance Matrix Table - Flexible Height */}
      <div className="bg-white rounded-lg shadow overflow-hidden flex-1 flex flex-col min-h-0 mb-4">
        {/* Table Header */}
        <div className="overflow-x-auto flex-shrink-0">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Source
                  <div className="mt-1">
                    <input
                      type="text"
                      placeholder="Search sources..."
                      value={sourceSearch}
                      onChange={(e) => setSourceSearch(e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Destination
                  <div className="mt-1">
                    <input
                      type="text"
                      placeholder="Search destinations..."
                      value={destinationSearch}
                      onChange={(e) => setDestinationSearch(e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Distance (km)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  To & Fro (2x)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  + 40% (1.4x T&F)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Updated
                </th>
              </tr>
            </thead>
          </table>
        </div>

        {/* Scrollable Table Body - Fills Available Height */}
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="min-w-full">
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedDistances.map((distance, index) => (
                <tr key={distance.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 text-sm">
                    <div className="font-medium text-gray-900">{distance.source.name}</div>
                    <div className="text-gray-500 text-xs">
                      {distance.source.latitude.toFixed(4)}, {distance.source.longitude.toFixed(4)}
                    </div>
                    {/* {distance.source.address && (
                      <div className="text-gray-400 text-xs truncate max-w-xs">{distance.source.address}</div>
                    )} */}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="font-medium text-gray-900">{distance.destination.name}</div>
                    {distance.destination.pincode && (
                      <div className="text-gray-500 text-xs">PIN: {distance.destination.pincode}</div>
                    )}
                    {/* {distance.destination.address && (
                      <div className="text-gray-400 text-xs truncate max-w-xs">{distance.destination.address}</div>
                    )} */}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-semibold text-gray-900">{distance.distance.toFixed(1)} km</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {distance.duration ? `${Math.round(distance.duration)} min` : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-semibold text-blue-900">
                      {(distance.distance * 2).toFixed(1)} km
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-semibold text-green-900">
                      {(distance.distance * 2 * 1.4).toFixed(1)} km
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {distance.directionsUrl ? (
                      <a
                        href={distance.directionsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 13l-6-3m6 3V4" />
                        </svg>
                        Directions
                      </a>
                    ) : (
                      <span className="text-gray-400">N/A</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(distance.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enhanced Pagination - Fixed at Bottom */}
      <div className="bg-white rounded-lg shadow p-4 flex-shrink-0">
        <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
          <div className="text-sm text-gray-700">
            Showing page {currentPage} of {totalPages} • {paginatedDistances.length} distances on this page • {totalItems} total
          </div>

          <div className="flex items-center space-x-4">
            {/* Note: Items per page is controlled by server now */}
            <div className="text-sm text-gray-500">
              {itemsPerPage} per page
            </div>

            {/* Navigation controls */}
            {totalPages > 1 && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                <span className="px-3 py-2 text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
