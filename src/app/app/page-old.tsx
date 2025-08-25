'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'

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

// Searchable Select Component
function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  disabled = false
}: {
  options: Source[] | Destination[]
  value: string
  onChange: (value: string) => void
  placeholder: string
  disabled?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options
    return options.filter(option => {
      const nameMatch = option.name.toLowerCase().includes(searchTerm.toLowerCase())
      const pincodeMatch = 'pincode' in option && option.pincode &&
        option.pincode.toLowerCase().includes(searchTerm.toLowerCase())
      return nameMatch || pincodeMatch
    })
  }, [options, searchTerm])

  const selectedOption = options.find(opt => opt.id.toString() === value)

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-full cursor-default rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-left shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 sm:text-sm"
      >
        <span className="block truncate">
          {selectedOption ? selectedOption.name : placeholder}
        </span>
        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
          <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3z" clipRule="evenodd" />
          </svg>
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full rounded-md bg-white shadow-lg">
          <div className="p-2 border-b">
            <input
              type="text"
              placeholder={`Search ${placeholder.toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="max-h-60 overflow-auto">
            <div className="py-1">
              <button
                onClick={() => {
                  onChange('')
                  setIsOpen(false)
                  setSearchTerm('')
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                {placeholder}
              </button>
              {filteredOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => {
                    onChange(option.id.toString())
                    setIsOpen(false)
                    setSearchTerm('')
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100"
                >
                  <div>
                    <div className="font-medium">{option.name}</div>
                    {'pincode' in option && option.pincode && (
                      <div className="text-xs text-gray-500">Pincode: {option.pincode}</div>
                    )}
                    {option.latitude && option.longitude && (
                      <div className="text-xs text-gray-500">
                        {option.latitude}, {option.longitude}
                      </div>
                    )}
                  </div>
                </button>
              ))}
              {filteredOptions.length === 0 && (
                <div className="px-4 py-2 text-sm text-gray-500">No options found</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AppPage() {
  const [sources, setSources] = useState<Source[]>([])
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [distances, setDistances] = useState<Distance[]>([])
  const [selectedSourceId, setSelectedSourceId] = useState<string>('')
  const [selectedDestinationId, setSelectedDestinationId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [showAddSource, setShowAddSource] = useState(false)
  const [showAddDestination, setShowAddDestination] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeSection, setActiveSection] = useState<'calculator' | 'distances' | 'manage'>('calculator')
  const [sourceSearch, setSourceSearch] = useState('')
  const [destinationSearch, setDestinationSearch] = useState('')
  const router = useRouter()

  // Form states for adding new source/destination
  const [newSource, setNewSource] = useState({
    name: '',
    latitude: '',
    longitude: '',
    address: '',
  })

  const [newDestination, setNewDestination] = useState({
    name: '',
    pincode: '',
    address: '',
    latitude: '',
    longitude: '',
  })

  useEffect(() => {
    fetchSources()
    fetchDestinations()
    fetchExistingDistances()
  }, [])

  const fetchSources = async () => {
    try {
      const response = await fetch('/api/sources')
      if (response.ok) {
        const data = await response.json()
        setSources(data)
      }
    } catch (error) {
      console.error('Error fetching sources:', error)
    }
  }

  const fetchDestinations = async () => {
    try {
      const response = await fetch('/api/destinations')
      if (response.ok) {
        const data = await response.json()
        setDestinations(data)
      }
    } catch (error) {
      console.error('Error fetching destinations:', error)
    }
  }

  const fetchExistingDistances = async () => {
    try {
      const response = await fetch('/api/distances')
      if (response.ok) {
        const data = await response.json()
        setDistances(data)
      }
    } catch (error) {
      console.error('Error fetching existing distances:', error)
    }
  }

  const calculateDistances = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedSourceId) params.append('sourceId', selectedSourceId)
      if (selectedDestinationId) params.append('destinationId', selectedDestinationId)

      // Show appropriate loading message based on selection
      if (!selectedSourceId && !selectedDestinationId) {
        console.log('Calculating distances for all source-destination combinations...')
      } else if (selectedSourceId && !selectedDestinationId) {
        console.log('Calculating distances from selected source to all destinations...')
      } else if (!selectedSourceId && selectedDestinationId) {
        console.log('Calculating distances from all sources to selected destination...')
      } else {
        console.log('Calculating distance for specific source-destination pair...')
      }

      const response = await fetch(`/api/distances?${params}`)
      if (response.ok) {
        const data = await response.json()
        setDistances(data)
      } else {
        const error = await response.json()
        alert(error.error || 'Error calculating distances')
      }
    } catch (error) {
      console.error('Error calculating distances:', error)
      alert('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Filtered distances based on search terms
  const filteredDistances = distances.filter(distance => {
    const sourceMatch = distance.source.name.toLowerCase().includes(sourceSearch.toLowerCase())
    const destinationMatch = distance.destination.name.toLowerCase().includes(destinationSearch.toLowerCase())
    return sourceMatch && destinationMatch
  })

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSource.name || !newSource.latitude || !newSource.longitude) {
      alert('Please fill in all required fields')
      return
    }

    try {
      const response = await fetch('/api/sources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newSource.name,
          latitude: parseFloat(newSource.latitude),
          longitude: parseFloat(newSource.longitude),
          address: newSource.address || null,
        }),
      })

      if (response.ok) {
        setNewSource({ name: '', latitude: '', longitude: '', address: '' })
        setShowAddSource(false)
        fetchSources()
      } else {
        const error = await response.json()
        alert(error.error || 'Error adding source')
      }
    } catch (error) {
      console.error('Error adding source:', error)
      alert('Network error. Please try again.')
    }
  }

  const handleAddDestination = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDestination.name) {
      alert('Please fill in the destination name')
      return
    }

    try {
      const response = await fetch('/api/destinations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newDestination.name,
          pincode: newDestination.pincode || null,
          address: newDestination.address || null,
          latitude: newDestination.latitude ? parseFloat(newDestination.latitude) : null,
          longitude: newDestination.longitude ? parseFloat(newDestination.longitude) : null,
        }),
      })

      if (response.ok) {
        setNewDestination({ name: '', pincode: '', address: '', latitude: '', longitude: '' })
        setShowAddDestination(false)
        fetchDestinations()
      } else {
        const error = await response.json()
        alert(error.error || 'Error adding destination')
      }
    } catch (error) {
      console.error('Error adding destination:', error)
      alert('Network error. Please try again.')
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/')
    } catch (error) {
      console.error('Error logging out:', error)
      router.push('/')
    }
  }

  const geocodeDestinations = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/destinations', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const result = await response.json()
        alert(`Successfully updated coordinates for ${result.updated} out of ${result.total} destinations`)
        // Refresh destinations data
        fetchDestinations()
      } else {
        const error = await response.json()
        alert(error.error || 'Error geocoding destinations')
      }
    } catch (error) {
      console.error('Error geocoding destinations:', error)
      alert('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-80' : 'w-16'} bg-white shadow-lg transition-all duration-300 flex flex-col`}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h1 className={`font-bold text-xl text-gray-800 transition-opacity ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
            Distance Calculator
          </h1>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-md hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sidebarOpen ? "M11 19l-7-7 7-7m8 14l-7-7 7-7" : "M9 5l7 7-7 7"} />
            </svg>
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setActiveSection('calculator')}
            className={`w-full flex items-center px-3 py-3 rounded-md text-left transition-colors ${
              activeSection === 'calculator' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            {sidebarOpen && <span>Calculator</span>}
          </button>

          <button
            onClick={() => setActiveSection('distances')}
            className={`w-full flex items-center px-3 py-3 rounded-md text-left transition-colors ${
              activeSection === 'distances' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            {sidebarOpen && (
              <span>
                Distance Matrix
                {distances.length > 0 && (
                  <span className="ml-2 bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full">
                    {distances.length}
                  </span>
                )}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSection('manage')}
            className={`w-full flex items-center px-3 py-3 rounded-md text-left transition-colors ${
              activeSection === 'manage' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
            </svg>
            {sidebarOpen && <span>Manage Data</span>}
          </button>
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t">
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-3 py-3 rounded-md text-red-600 hover:bg-red-50 transition-colors"
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Main Content Area */}
        <main className="flex-1 overflow-auto p-6">
          {/* Calculator Section */}
          {activeSection === 'calculator' && (
            <div className="max-w-4xl">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Distance Calculator</h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Source Selection */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Source Location</h3>
                  <div className="space-y-4">
                    <SearchableSelect
                      options={sources}
                      value={selectedSourceId}
                      onChange={setSelectedSourceId}
                      placeholder="Select a source"
                    />
                    <button
                      onClick={() => setShowAddSource(!showAddSource)}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      {showAddSource ? 'Cancel' : 'Add New Source'}
                    </button>
                  </div>

                  {showAddSource && (
                    <form onSubmit={handleAddSource} className="mt-6 p-4 bg-gray-50 rounded-lg space-y-4">
                      <h4 className="font-medium text-gray-900">Add New Source</h4>
                      <input
                        type="text"
                        placeholder="Source name"
                        value={newSource.name}
                        onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        required
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <input
                          type="number"
                          step="any"
                          placeholder="Latitude"
                          value={newSource.latitude}
                          onChange={(e) => setNewSource({ ...newSource, latitude: e.target.value })}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          required
                        />
                        <input
                          type="number"
                          step="any"
                          placeholder="Longitude"
                          value={newSource.longitude}
                          onChange={(e) => setNewSource({ ...newSource, longitude: e.target.value })}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          required
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Address (optional)"
                        value={newSource.address}
                        onChange={(e) => setNewSource({ ...newSource, address: e.target.value })}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                      <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                      >
                        Add Source
                      </button>
                    </form>
                  )}
                </div>

                {/* Destination Selection */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Destination</h3>
                  <div className="space-y-4">
                    <SearchableSelect
                      options={destinations}
                      value={selectedDestinationId}
                      onChange={setSelectedDestinationId}
                      placeholder="Select a destination"
                    />
                    <button
                      onClick={() => setShowAddDestination(!showAddDestination)}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      {showAddDestination ? 'Cancel' : 'Add New Destination'}
                    </button>
                  </div>

                  {showAddDestination && (
                    <form onSubmit={handleAddDestination} className="mt-6 p-4 bg-gray-50 rounded-lg space-y-4">
                      <h4 className="font-medium text-gray-900">Add New Destination</h4>
                      <input
                        type="text"
                        placeholder="Destination name"
                        value={newDestination.name}
                        onChange={(e) => setNewDestination({ ...newDestination, name: e.target.value })}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        required
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <input
                          type="text"
                          placeholder="Pincode"
                          value={newDestination.pincode}
                          onChange={(e) => setNewDestination({ ...newDestination, pincode: e.target.value })}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Address"
                          value={newDestination.address}
                          onChange={(e) => setNewDestination({ ...newDestination, address: e.target.value })}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <input
                          type="number"
                          step="any"
                          placeholder="Latitude (optional)"
                          value={newDestination.latitude}
                          onChange={(e) => setNewDestination({ ...newDestination, latitude: e.target.value })}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                        <input
                          type="number"
                          step="any"
                          placeholder="Longitude (optional)"
                          value={newDestination.longitude}
                          onChange={(e) => setNewDestination({ ...newDestination, longitude: e.target.value })}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                      </div>
                      <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                      >
                        Add Destination
                      </button>
                    </form>
                  )}
                </div>
              </div>

              {/* Calculate Button */}
              <div className="text-center mb-8">
                <button
                  onClick={calculateDistances}
                  disabled={isLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-8 py-4 rounded-lg text-lg font-medium transition-colors shadow-lg hover:shadow-xl"
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Calculating...
                    </div>
                  ) : (
                    !selectedSourceId && !selectedDestinationId ? 'Calculate All Distances' :
                    selectedSourceId && !selectedDestinationId ? 'Calculate to All Destinations' :
                    !selectedSourceId && selectedDestinationId ? 'Calculate from All Sources' :
                    'Calculate Distance'
                  )}
                </button>
              </div>

              {/* Quick Results Preview */}
              {distances.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Results Summary ({filteredDistances.length} routes shown{filteredDistances.length !== distances.length && ` of ${distances.length} total`})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {filteredDistances.length > 0 ? Math.min(...filteredDistances.map(d => d.distance)).toFixed(1) : '0'}km
                      </div>
                      <div className="text-sm text-blue-600">Shortest Route</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {filteredDistances.length > 0 ? (filteredDistances.reduce((sum, d) => sum + d.distance, 0) / filteredDistances.length).toFixed(1) : '0'}km
                      </div>
                      <div className="text-sm text-green-600">Average Distance</div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {filteredDistances.length > 0 ? Math.max(...filteredDistances.map(d => d.distance)).toFixed(1) : '0'}km
                      </div>
                      <div className="text-sm text-purple-600">Longest Route</div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={() => setActiveSection('distances')}
                      className="text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      View full distance matrix →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Distance Matrix Section */}
          {activeSection === 'distances' && (
            <div className="max-w-full h-full flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Distance Matrix</h2>
                <div className="text-sm text-gray-500">
                  {filteredDistances.length} routes shown{filteredDistances.length !== distances.length && ` (${distances.length} total)`}
                </div>
              </div>

              {distances.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center flex-1 flex flex-col justify-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2 a2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No distances calculated yet</h3>
                  <p className="text-gray-500 mb-4">Use the calculator to generate distance data</p>
                  <button
                    onClick={() => setActiveSection('calculator')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md transition-colors"
                  >
                    Go to Calculator
                  </button>
                </div>
              ) : filteredDistances.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center flex-1 flex flex-col justify-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No matching results</h3>
                  <p className="text-gray-500 mb-4">Try adjusting your search filters</p>
                  <button
                    onClick={() => {
                      setSourceSearch('')
                      setDestinationSearch('')
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden flex-1 flex flex-col">
                  <div className="flex-1 overflow-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
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
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredDistances.map((distance, index) => (
                          <tr key={distance.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-6 py-4 text-sm">
                              <div className="font-medium text-gray-900">{distance.source.name}</div>
                              <div className="text-gray-500 text-xs">
                                {distance.source.latitude.toFixed(4)}, {distance.source.longitude.toFixed(4)}
                              </div>
                              {distance.source.address && (
                                <div className="text-gray-400 text-xs truncate max-w-xs">{distance.source.address}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <div className="font-medium text-gray-900">{distance.destination.name}</div>
                              {distance.destination.pincode && (
                                <div className="text-gray-500 text-xs">PIN: {distance.destination.pincode}</div>
                              )}
                              {distance.destination.address && (
                                <div className="text-gray-400 text-xs truncate max-w-xs">{distance.destination.address}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm font-semibold text-gray-900">{distance.distance} km</span>
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
              )}
            </div>
          )}

          {/* Data Management Section */}
          {activeSection === 'manage' && (
            <div className="max-w-4xl">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Manage Data</h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sources Management */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Sources ({sources.length})</h3>
                  <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md">
                    <div className="divide-y divide-gray-200">
                      {sources.map((source) => (
                        <div key={source.id} className="p-3 hover:bg-gray-50">
                          <div className="font-medium text-sm text-gray-900">{source.name}</div>
                          <div className="text-xs text-gray-500">
                            {source.latitude}, {source.longitude}
                          </div>
                          {source.address && (
                            <div className="text-xs text-gray-400 truncate">{source.address}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Destinations Management */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Destinations ({destinations.length})</h3>
                  <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md">
                    <div className="divide-y divide-gray-200">
                      {destinations.map((destination) => (
                        <div key={destination.id} className="p-3 hover:bg-gray-50">
                          <div className="font-medium text-sm text-gray-900">{destination.name}</div>
                          {destination.pincode && (
                            <div className="text-xs text-gray-500">PIN: {destination.pincode}</div>
                          )}
                          {destination.address && (
                            <div className="text-xs text-gray-400 truncate">{destination.address}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Statistics */}
              <div className="mt-6 bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Statistics</h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-indigo-600">{sources.length}</div>
                    <div className="text-sm text-gray-500">Sources</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{destinations.length}</div>
                    <div className="text-sm text-gray-500">Destinations</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{distances.length}</div>
                    <div className="text-sm text-gray-500">Calculated Routes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {sources.length * destinations.length}
                    </div>
                    <div className="text-sm text-gray-500">Possible Routes</div>
                  </div>
                </div>
              </div>

              {/* Data Management Tools */}
              <div className="mt-6 bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Data Management Tools</h3>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={geocodeDestinations}
                    disabled={isLoading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-3 rounded-md font-medium transition-colors flex items-center justify-center"
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Geocoding...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Update Destination Coordinates
                      </>
                    )}
                  </button>
                  <div className="text-sm text-gray-600 self-center">
                    This will use Google Maps to find coordinates for destinations that don&apos;t have them yet.
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
