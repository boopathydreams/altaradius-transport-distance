import { useState, useEffect } from 'react'
import SearchableSelect from './SearchableSelect'
import {
  CalculatorIcon,
  MapPinIcon,
  PlusIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XMarkIcon,
  GlobeAltIcon,
  RocketLaunchIcon,
  ChartBarIcon,
  BuildingOfficeIcon,
  HomeIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { SparklesIcon } from '@heroicons/react/24/solid'

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

interface CalculatorProps {
  sources: Source[]
  destinations: Destination[]
  distances: Distance[]
  calculatedCount?: number // Optional prop for calculated routes count
  onRefresh: () => void
  onSourceAdded?: (newSource: Source) => void
  onDestinationAdded?: (newDestination: Destination) => void
}

interface ResultState {
  type: 'success' | 'error'
  distance?: Distance
  message?: string
}

export default function Calculator({
  sources,
  destinations,
  distances,
  calculatedCount,
  onRefresh,
  onSourceAdded,
  onDestinationAdded
}: CalculatorProps) {
  const [selectedSourceId, setSelectedSourceId] = useState<string>('')
  const [selectedDestinationId, setSelectedDestinationId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingRoute, setIsCheckingRoute] = useState(false)
  const [showAddSource, setShowAddSource] = useState(false)
  const [showAddDestination, setShowAddDestination] = useState(false)
  const [newSourceName, setNewSourceName] = useState('')
  const [newSourceLatitude, setNewSourceLatitude] = useState('')
  const [newSourceLongitude, setNewSourceLongitude] = useState('')
  const [newSourceAddress, setNewSourceAddress] = useState('')
  const [newDestinationName, setNewDestinationName] = useState('')
  const [newDestinationPincode, setNewDestinationPincode] = useState('')
  const [newDestinationAddress, setNewDestinationAddress] = useState('')
  const [newDestinationLatitude, setNewDestinationLatitude] = useState('')
  const [newDestinationLongitude, setNewDestinationLongitude] = useState('')
  const [result, setResult] = useState<ResultState | null>(null)

  // Check for existing distance when source/destination changes
  useEffect(() => {
    const checkExistingDistance = async () => {
      // Only check if both values are selected and not empty, and we have data loaded
      if (selectedSourceId && selectedDestinationId &&
          selectedSourceId !== '' && selectedDestinationId !== '' &&
          sources.length > 0 && destinations.length > 0) {
        console.log('Checking route for:', selectedSourceId, '->', selectedDestinationId)
        setIsCheckingRoute(true)
        setResult(null) // Clear previous results while checking
        try {
          const response = await fetch(`/api/distances/check?sourceId=${selectedSourceId}&destinationId=${selectedDestinationId}`)
          if (response.ok) {
            const data = await response.json()
            if (data.exists && data.distance) {
              console.log('Found existing distance:', data.distance)
              setResult({
                type: 'success',
                distance: data.distance
              })
            } else {
              console.log('No existing distance found')
              setResult(null)
            }
          } else {
            console.error('Error checking existing distance:', response.status)
            setResult(null)
          }
        } catch (error) {
          console.error('Error checking existing distance:', error)
          setResult(null)
        } finally {
          setIsCheckingRoute(false)
        }
      } else {
        // Clear states when no valid selection or data not loaded
        setResult(null)
        setIsCheckingRoute(false)
      }
    }

    // Add a small debounce to prevent rapid calls
    const timeoutId = setTimeout(checkExistingDistance, 100)
    return () => clearTimeout(timeoutId)
  }, [selectedSourceId, selectedDestinationId, sources.length, destinations.length])

  // Helper to check if route already exists (now uses API)
  const [existingRoute, setExistingRoute] = useState<Distance | null>(null)

  // Update existing route when result changes
  useEffect(() => {
    if (result && result.type === 'success' && result.distance) {
      setExistingRoute(result.distance)
    } else {
      setExistingRoute(null)
    }
  }, [result])

  const handleCalculateDistance = async () => {
    setIsLoading(true)
    setResult(null)

    try {
      const params = new URLSearchParams()
      if (selectedSourceId) params.append('sourceId', selectedSourceId)
      if (selectedDestinationId) params.append('destinationId', selectedDestinationId)

      // Show appropriate loading message based on selection
      if (!selectedSourceId && !selectedDestinationId) {
        console.log('Calculating missing distances in batches...')
        params.append('batch', 'true')
      } else if (selectedSourceId && !selectedDestinationId) {
        console.log('Calculating distances from selected source to all destinations...')
      } else if (!selectedSourceId && selectedDestinationId) {
        console.log('Calculating distances from all sources to selected destination...')
      } else {
        console.log('Calculating distance for specific source-destination pair...')
      }

      // Use the new calculate endpoint for on-demand calculations
      const response = await fetch(`/api/calculate?${params}`, {
        method: 'POST'
      })

      if (response.ok) {
        const data = await response.json()
        if (selectedSourceId && selectedDestinationId && Array.isArray(data) && data.length > 0) {
          // Single distance calculation
          setResult({
            type: 'success',
            distance: data[0]
          })
        } else if (data.message) {
          // Batch calculation response
          setResult({
            type: 'success',
            message: data.message
          })
        } else {
          // Bulk calculation
          setResult({
            type: 'success',
            message: `Successfully processed ${Array.isArray(data) ? data.length : 0} distance calculations.`
          })
        }
        onRefresh()
      } else {
        const error = await response.json()
        setResult({
          type: 'error',
          message: error.error || 'Error calculating distances'
        })
      }
    } catch (error) {
      console.error('Error calculating distances:', error)
      setResult({
        type: 'error',
        message: 'Network error. Please try again.'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddSource = async () => {
    if (!newSourceName.trim() || !newSourceLatitude.trim() || !newSourceLongitude.trim()) {
      setResult({
        type: 'error',
        message: 'Please fill in all required fields (name, latitude, longitude)'
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSourceName.trim(),
          latitude: parseFloat(newSourceLatitude),
          longitude: parseFloat(newSourceLongitude),
          address: newSourceAddress.trim() || null
        })
      })

      if (response.ok) {
        const newSource = await response.json()
        setNewSourceName('')
        setNewSourceLatitude('')
        setNewSourceLongitude('')
        setNewSourceAddress('')
        setShowAddSource(false)
        setSelectedSourceId(newSource.id.toString())
        setResult({
          type: 'success',
          message: `Successfully added source: ${newSource.name}`
        })
        // Use callback to update parent state efficiently
        if (onSourceAdded) {
          onSourceAdded(newSource)
        } else {
          onRefresh()
        }
      } else {
        const error = await response.json()
        setResult({
          type: 'error',
          message: error.error || 'Failed to add source'
        })
      }
    } catch (error) {
      console.error('Error adding source:', error)
      setResult({
        type: 'error',
        message: 'Network error. Please try again.'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddDestination = async () => {
    if (!newDestinationName.trim()) {
      setResult({
        type: 'error',
        message: 'Please provide the destination name'
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/destinations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newDestinationName.trim(),
          pincode: newDestinationPincode.trim() || null,
          address: newDestinationAddress.trim() || null,
          latitude: newDestinationLatitude.trim() ? parseFloat(newDestinationLatitude) : null,
          longitude: newDestinationLongitude.trim() ? parseFloat(newDestinationLongitude) : null
        })
      })

      if (response.ok) {
        const newDestination = await response.json()
        setNewDestinationName('')
        setNewDestinationPincode('')
        setNewDestinationAddress('')
        setNewDestinationLatitude('')
        setNewDestinationLongitude('')
        setShowAddDestination(false)
        setSelectedDestinationId(newDestination.id.toString())
        setResult({
          type: 'success',
          message: `Successfully added destination: ${newDestination.name}`
        })
        // Use callback to update parent state efficiently
        if (onDestinationAdded) {
          onDestinationAdded(newDestination)
        } else {
          onRefresh()
        }
      } else {
        const error = await response.json()
        setResult({
          type: 'error',
          message: error.error || 'Failed to add destination'
        })
      }
    } catch (error) {
      console.error('Error adding destination:', error)
      setResult({
        type: 'error',
        message: 'Network error. Please try again.'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const clearResult = () => {
    setResult(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-lg">
              <CalculatorIcon className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Distance Calculator
            </h1>
            <SparklesIcon className="h-5 w-5 text-yellow-500" />
          </div>
          <p className="text-gray-600 text-lg">Calculate distances between sources and destinations with precision</p>
        </div>

        {/* Statistics Dashboard */}
        <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 font-medium text-sm">Sources</p>
                <p className="text-2xl font-bold text-blue-700">{sources.length}</p>
              </div>
              <HomeIcon className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-xl border border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-600 font-medium text-sm">Destinations</p>
                <p className="text-2xl font-bold text-red-700">{destinations.length}</p>
              </div>
              <BuildingOfficeIcon className="h-8 w-8 text-red-500" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 font-medium text-sm">Calculated Routes</p>
                <p className="text-2xl font-bold text-green-700">{calculatedCount ?? distances.length}</p>
              </div>
              <ChartBarIcon className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 font-medium text-sm">Possible Routes</p>
                <p className="text-2xl font-bold text-purple-700">{sources.length * destinations.length}</p>
              </div>
              <GlobeAltIcon className="h-8 w-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Efficiency Tip */}
        {/* <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-4 mb-6">
          <div className="flex items-start space-x-3">
            <CheckCircleIcon className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-green-800 mb-1">💡 Efficient Workflow</h3>
              <p className="text-sm text-green-700">
                Add sources and destinations instantly without page reloads. Then use the <strong>&ldquo;Calculate Distance&rdquo;</strong> button to compute routes when ready.
              </p>
            </div>
          </div>
        </div> */}

        {/* Main Calculator Card */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-visible mb-8">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-8 py-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center space-x-2">
            <RocketLaunchIcon className="h-5 w-5 text-blue-500" />
            <span>Calculate Distance</span>
          </h2>
          <p className="text-gray-600 mt-1">Select source and destination to calculate the distance between them</p>
        </div>

        <div className="p-8 min-h-96">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Source Selection */}
            <div className="space-y-4 relative">
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                  <MapPinIcon className="h-4 w-4 text-green-500" />
                  <span>Select Source Location</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowAddSource(!showAddSource)}
                  className="inline-flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-500 font-medium"
                >
                  <PlusIcon className="h-4 w-4" />
                  <span>Add New</span>
                </button>
              </div>

              <div className="relative z-20">
                <SearchableSelect
                  options={sources}
                  value={selectedSourceId}
                  onChange={setSelectedSourceId}
                  placeholder="Select a source location..."
                  label="Source Location"
                  disabled={isLoading}
                />
              </div>

              {/* Add New Source Form */}
              {showAddSource && (
                <div className="mt-4 p-6 bg-green-50 rounded-xl border border-green-200">
                  <h4 className="font-semibold text-green-800 mb-4 flex items-center space-x-2">
                    <PlusIcon className="h-4 w-4" />
                    <span>Add New Source</span>
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-green-700 mb-1">Source Name</label>
                      <input
                        type="text"
                        placeholder="e.g., Main Office, Warehouse A"
                        value={newSourceName}
                        onChange={(e) => setNewSourceName(e.target.value)}
                        className="w-full border border-green-200 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-green-700 mb-1">Latitude</label>
                        <input
                          type="number"
                          step="any"
                          placeholder="e.g., 40.7128"
                          value={newSourceLatitude}
                          onChange={(e) => setNewSourceLatitude(e.target.value)}
                          className="w-full border border-green-200 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-green-700 mb-1">Longitude</label>
                        <input
                          type="number"
                          step="any"
                          placeholder="e.g., -74.0060"
                          value={newSourceLongitude}
                          onChange={(e) => setNewSourceLongitude(e.target.value)}
                          className="w-full border border-green-200 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-green-700 mb-1">Address (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g., 123 Business St, City, State, Country"
                        value={newSourceAddress}
                        onChange={(e) => setNewSourceAddress(e.target.value)}
                        className="w-full border border-green-200 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={handleAddSource}
                        disabled={isLoading}
                        className="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center space-x-2"
                      >
                        {isLoading ? (
                          <ArrowPathIcon className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircleIcon className="h-4 w-4" />
                        )}
                        <span>{isLoading ? 'Adding...' : 'Add Source'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddSource(false)}
                        className="px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center space-x-1"
                      >
                        <XMarkIcon className="h-4 w-4" />
                        <span>Cancel</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Destination Selection */}
            <div className="space-y-4 relative">
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                  <MapPinIcon className="h-4 w-4 text-red-500" />
                  <span>Select Destination</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowAddDestination(!showAddDestination)}
                  className="inline-flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-500 font-medium"
                >
                  <PlusIcon className="h-4 w-4" />
                  <span>Add New</span>
                </button>
              </div>

              <div className="relative z-20">
                <SearchableSelect
                  options={destinations}
                  value={selectedDestinationId}
                  onChange={setSelectedDestinationId}
                  placeholder="Select a destination location..."
                  label="Destination Location"
                  disabled={isLoading}
                />
              </div>

              {/* Add New Destination Form */}
              {showAddDestination && (
                <div className="mt-4 p-6 bg-red-50 rounded-xl border border-red-200">
                  <h4 className="font-semibold text-red-800 mb-4 flex items-center space-x-2">
                    <PlusIcon className="h-4 w-4" />
                    <span>Add New Destination</span>
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-red-700 mb-1">Destination Name</label>
                      <input
                        type="text"
                        placeholder="e.g., Customer Location, Store Branch"
                        value={newDestinationName}
                        onChange={(e) => setNewDestinationName(e.target.value)}
                        className="w-full border border-red-200 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-red-700 mb-1">Pincode</label>
                      <input
                        type="text"
                        placeholder="e.g., 110001, 500032"
                        value={newDestinationPincode}
                        onChange={(e) => setNewDestinationPincode(e.target.value)}
                        className="w-full border border-red-200 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-red-700 mb-1">Address (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g., 456 Customer Ave, City, State, Country"
                        value={newDestinationAddress}
                        onChange={(e) => setNewDestinationAddress(e.target.value)}
                        className="w-full border border-red-200 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-red-700 mb-1">Latitude (Optional)</label>
                        <input
                          type="number"
                          step="any"
                          placeholder="e.g., 28.6139"
                          value={newDestinationLatitude}
                          onChange={(e) => setNewDestinationLatitude(e.target.value)}
                          className="w-full border border-red-200 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-red-700 mb-1">Longitude (Optional)</label>
                        <input
                          type="number"
                          step="any"
                          placeholder="e.g., 77.2090"
                          value={newDestinationLongitude}
                          onChange={(e) => setNewDestinationLongitude(e.target.value)}
                          className="w-full border border-red-200 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        />
                      </div>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={handleAddDestination}
                        disabled={isLoading}
                        className="flex-1 bg-red-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center space-x-2"
                      >
                        {isLoading ? (
                          <ArrowPathIcon className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircleIcon className="h-4 w-4" />
                        )}
                        <span>{isLoading ? 'Adding...' : 'Add Destination'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddDestination(false)}
                        className="px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center space-x-1"
                      >
                        <XMarkIcon className="h-4 w-4" />
                        <span>Cancel</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="text-center">
            <button
              type="button"
              onClick={handleCalculateDistance}
              disabled={isLoading || isCheckingRoute || (!!selectedSourceId && !!selectedDestinationId && existingRoute !== null)}
              className={`${
                (!!selectedSourceId && !!selectedDestinationId && existingRoute)
                  ? 'bg-gray-400 cursor-not-allowed'
                  : isCheckingRoute
                  ? 'bg-yellow-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 hover:scale-105'
              } text-white px-8 py-4 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform flex items-center space-x-3 shadow-lg mx-auto`}
            >
              {isLoading ? (
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
              ) : isCheckingRoute ? (
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
              ) : (!!selectedSourceId && !!selectedDestinationId && existingRoute) ? (
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
              ) : (
                <CalculatorIcon className="h-5 w-5" />
              )}
              <span>
                {isLoading ? 'Calculating...' :
                 isCheckingRoute ? 'Checking Route...' :
                 (!!selectedSourceId && !!selectedDestinationId && existingRoute) ? 'Route Already Available' : (
                  !selectedSourceId && !selectedDestinationId ? 'Calculate All Distances' :
                  selectedSourceId && !selectedDestinationId ? 'Calculate to All Destinations' :
                  !selectedSourceId && selectedDestinationId ? 'Calculate from All Sources' :
                  'Calculate Distance'
                )}
              </span>
            </button>
          </div>

          {/* Result Display - Integrated within form */}
          {(result || isCheckingRoute) && (
            <div className={`mt-6 rounded-xl shadow-lg border-2 overflow-hidden ${
              isCheckingRoute
                ? 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-300'
                : result?.type === 'success'
                ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-300'
                : 'bg-gradient-to-br from-red-50 to-red-100 border-red-300'
            }`}>
              <div className={`px-6 py-4 border-b flex items-center justify-between ${
                isCheckingRoute
                  ? 'bg-yellow-100 border-yellow-200'
                  : result?.type === 'success'
                  ? 'bg-green-100 border-green-200'
                  : 'bg-red-100 border-red-200'
              }`}>
                <div className="flex items-center space-x-3">
                  {isCheckingRoute ? (
                    <ArrowPathIcon className="h-6 w-6 text-yellow-600 animate-spin" />
                  ) : result?.type === 'success' ? (
                    <CheckCircleIcon className="h-6 w-6 text-green-600" />
                  ) : (
                    <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                  )}
                  <h3 className={`font-semibold text-lg ${
                    isCheckingRoute
                      ? 'text-yellow-800'
                      : result?.type === 'success' ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {isCheckingRoute
                      ? '🔍 Checking Route Availability'
                      : result?.type === 'success' ? '🎯 Route Information' : '❌ Calculation Failed'}
                  </h3>
                </div>
                {!isCheckingRoute && (
                  <button
                    type="button"
                    onClick={clearResult}
                    className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-white/50"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                )}
              </div>

              {isCheckingRoute ? (
                <div className="p-6">
                  <div className="flex items-center justify-center space-x-3">
                    <ArrowPathIcon className="h-5 w-5 text-yellow-600 animate-spin" />
                    <p className="text-yellow-700 font-medium">Checking if route already exists...</p>
                  </div>
                </div>
              ) : result?.type === 'success' && result.distance ? (
                <div className="p-6">
                  {/* Route Summary */}
                  <div className="bg-white rounded-xl p-4 mb-4 border border-green-200 shadow-sm">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="font-medium text-gray-700">{result.distance.source.name}</span>
                      </div>
                      <div className="flex-1 border-t border-gray-300 mx-2 relative">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                            {result.distance.distance} km
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="font-medium text-gray-700">{result.distance.destination.name}</span>
                      </div>
                    </div>
                  </div>

                  {/* Distance & Duration Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-white rounded-lg p-4 border border-blue-200 shadow-sm">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <MapPinIcon className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-gray-600 text-sm">Total Distance</p>
                          <p className="text-xl font-bold text-blue-600">{result.distance.distance} km</p>
                        </div>
                      </div>
                    </div>

                    {result.distance.duration && (
                      <div className="bg-white rounded-lg p-4 border border-purple-200 shadow-sm">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-purple-100 rounded-lg">
                            <ClockIcon className="h-5 w-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-gray-600 text-sm">Estimated Duration</p>
                            <p className="text-xl font-bold text-purple-600">{result.distance.duration} mins</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* View Directions Button */}
                  {result.distance.directionsUrl && (
                    <div className="text-center">
                      <a
                        href={result.distance.directionsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-2 bg-gradient-to-r from-green-600 to-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:from-green-700 hover:to-blue-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
                      >
                        <GlobeAltIcon className="h-5 w-5" />
                        <span>View Directions</span>
                      </a>
                    </div>
                  )}
                </div>
              ) : result && (
                <div className="p-6">
                  <div className="flex items-start space-x-3">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-red-700 font-medium">{result.message}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  )
}
