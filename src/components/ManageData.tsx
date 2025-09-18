import { useState } from 'react'
import { TrashIcon } from '@heroicons/react/24/outline'

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

interface ManageDataProps {
  sources: Source[]
  destinations: Destination[]
  onRefresh: () => void
  onSourceDeleted?: (sourceId: number) => void
  onDestinationDeleted?: (destinationId: number) => void
  onSuccess?: (message: string, duration?: number) => void
  onError?: (message: string, duration?: number) => void
  onWarning?: (message: string, duration?: number) => void
}

export default function ManageData({
  sources,
  destinations,
  onRefresh,
  onSourceDeleted,
  onDestinationDeleted,
  onSuccess,
  onError,
  onWarning
}: ManageDataProps) {
  const [activeTab, setActiveTab] = useState<'sources' | 'destinations' | 'tools'>('sources')
  const [isLoading, setIsLoading] = useState(false)
  const [batchPincodes, setBatchPincodes] = useState('')
  const [geocodingProgress, setGeocodingProgress] = useState<string>('')

  // Edit states
  const [editingSourceId, setEditingSourceId] = useState<number | null>(null)
  const [editingDestinationId, setEditingDestinationId] = useState<number | null>(null)
  const [editSourceData, setEditSourceData] = useState({ name: '', address: '', latitude: '', longitude: '' })
  const [editDestinationData, setEditDestinationData] = useState({ name: '', pincode: '', address: '', latitude: '', longitude: '' })

  const handleDeleteSource = async (id: number) => {
    const source = sources.find(s => s.id === id)
    const sourceName = source ? source.name : `Source #${id}`

    if (!confirm(`Are you sure you want to delete "${sourceName}"?\n\nThis will also delete ALL related distance calculations.\n\nThis action cannot be undone.`)) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/sources/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        const result = await response.json()
        // Use callback to update parent state efficiently
        if (onSourceDeleted) {
          onSourceDeleted(id)
        } else {
          await onRefresh()
        }

        // Show success message with details
        onSuccess?.(`Successfully deleted "${result.sourceName}" and ${result.deletedDistances} related distance calculations.`)
      } else {
        const error = await response.json()
        onError?.(`Failed to delete source: ${error.error}`)
      }
    } catch (error) {
      console.error('Error deleting source:', error)
      onError?.('Error deleting source. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteDestination = async (id: number) => {
    const destination = destinations.find(d => d.id === id)
    const destinationName = destination ? destination.name : `Destination #${id}`

    if (!confirm(`Are you sure you want to delete "${destinationName}"?\n\nThis will also delete ALL related distance calculations.\n\nThis action cannot be undone.`)) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/destinations/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        const result = await response.json()
        // Use callback to update parent state efficiently
        if (onDestinationDeleted) {
          onDestinationDeleted(id)
        } else {
          await onRefresh()
        }

        // Show success message with details
        onSuccess?.(`Successfully deleted "${result.destinationName}" and ${result.deletedDistances} related distance calculations.`)
      } else {
        const error = await response.json()
        onError?.(`Failed to delete destination: ${error.error}`)
      }
    } catch (error) {
      console.error('Error deleting destination:', error)
      onError?.('Error deleting destination. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Edit functions
  const handleEditSource = (source: Source) => {
    setEditingSourceId(source.id)
    setEditSourceData({
      name: source.name,
      address: source.address || '',
      latitude: source.latitude?.toString() || '',
      longitude: source.longitude?.toString() || ''
    })
  }

  const handleSaveSource = async () => {
    if (!editingSourceId) return

    setIsLoading(true)
    let success = false
    try {
      const response = await fetch(`/api/sources/${editingSourceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editSourceData.name,
          address: editSourceData.address,
          latitude: editSourceData.latitude ? parseFloat(editSourceData.latitude) : null,
          longitude: editSourceData.longitude ? parseFloat(editSourceData.longitude) : null,
        })
      })

      if (response.ok) {
        success = true
        setEditingSourceId(null)
        await onRefresh()
      } else {
        const error = await response.json()
        onError?.(`Failed to update source: ${error.error}`)
      }
    } catch (error) {
      console.error('Error updating source:', error)
      onError?.('Error updating source. Please try again.')
    } finally {
      setIsLoading(false)
      // Show success message after loading is complete
      if (success) {
        onSuccess?.('Source updated successfully')
      }
    }
  }

  const handleEditDestination = (destination: Destination) => {
    setEditingDestinationId(destination.id)
    setEditDestinationData({
      name: destination.name,
      pincode: destination.pincode || '',
      address: destination.address || '',
      latitude: destination.latitude?.toString() || '',
      longitude: destination.longitude?.toString() || ''
    })
  }

  const handleSaveDestination = async () => {
    if (!editingDestinationId) return

    setIsLoading(true)
    let success = false
    let warningMessage = ''
    try {
      const response = await fetch(`/api/destinations/${editingDestinationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editDestinationData.name,
          pincode: editDestinationData.pincode,
          address: editDestinationData.address,
          latitude: editDestinationData.latitude ? parseFloat(editDestinationData.latitude) : null,
          longitude: editDestinationData.longitude ? parseFloat(editDestinationData.longitude) : null,
        })
      })

      if (response.ok) {
        success = true
        setEditingDestinationId(null)
        await onRefresh()
      } else {
        const error = await response.json()
        if (error.warning) {
          success = true // Still a success, just with a warning
          warningMessage = error.warning
          setEditingDestinationId(null)
          await onRefresh()
        } else {
          onError?.(`Failed to update destination: ${error.error}`)
        }
      }
    } catch (error) {
      console.error('Error updating destination:', error)
      onError?.('Error updating destination. Please try again.')
    } finally {
      setIsLoading(false)
      // Show messages after loading is complete
      if (success) {
        if (warningMessage) {
          onWarning?.(`Warning: ${warningMessage}`)
        } else {
          onSuccess?.('Destination updated successfully')
        }
      }
    }
  }

  const handleClearAllDistances = async () => {
    if (!confirm('Are you sure you want to clear all distance calculations? This cannot be undone.')) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/distances', {
        method: 'DELETE'
      })

      if (response.ok) {
        await onRefresh()
        onSuccess?.('All distances cleared successfully')
      } else {
        onError?.('Failed to clear distances')
      }
    } catch (error) {
      console.error('Error clearing distances:', error)
      onError?.('Error clearing distances')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBatchGeocode = async () => {
    if (!batchPincodes.trim()) {
      onError?.('Please enter pincodes to geocode')
      return
    }

    const pincodes = batchPincodes.split('\n').map(p => p.trim()).filter(p => p)

    if (pincodes.length === 0) {
      onError?.('Please enter valid pincodes')
      return
    }

    setIsLoading(true)
    setGeocodingProgress('Starting batch geocoding...')

    try {
      let successCount = 0
      let failCount = 0

      for (let i = 0; i < pincodes.length; i++) {
        const pincode = pincodes[i]
        setGeocodingProgress(`Processing ${pincode} (${i + 1}/${pincodes.length})`)

        try {
          const response = await fetch('/api/destinations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: `Location ${pincode}`,
              pincode,
              address: null,
              latitude: null,
              longitude: null
            })
          })

          if (response.ok) {
            successCount++
          } else {
            failCount++
          }
        } catch (error) {
          console.error(`Error geocoding ${pincode}:`, error)
          failCount++
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      setGeocodingProgress(`Completed! ${successCount} success, ${failCount} failed`)
      await onRefresh()

      if (failCount === 0) {
        setBatchPincodes('')
      }
    } catch (error) {
      console.error('Batch geocoding error:', error)
      setGeocodingProgress('Batch geocoding failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateGeocoding = async () => {
    // Find destinations without coordinates
    const destinationsWithoutCoords = destinations.filter(dest =>
      !dest.latitude || !dest.longitude
    )

    if (destinationsWithoutCoords.length === 0) {
      onWarning?.('All destinations already have coordinates!')
      return
    }

    if (!confirm(`Update geocoding for ${destinationsWithoutCoords.length} destinations without coordinates?`)) {
      return
    }

    setIsLoading(true)
    setGeocodingProgress('Starting geocoding update...')

    try {
      const response = await fetch('/api/destinations', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const result = await response.json()
        setGeocodingProgress(`Completed! ${result.updated} out of ${result.total} destinations updated successfully`)
        await onRefresh()
      } else {
        setGeocodingProgress('Geocoding update failed')
      }
    } catch (error) {
      console.error('Geocoding update error:', error)
      setGeocodingProgress('Geocoding update failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-full">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Manage Data</h2>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('sources')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'sources'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Sources ({sources.length})
          </button>
          <button
            onClick={() => setActiveTab('destinations')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'destinations'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Destinations ({destinations.length})
          </button>
          <button
            onClick={() => setActiveTab('tools')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'tools'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Data Tools
          </button>
        </nav>
      </div>

      {/* Actions Bar */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              {activeTab === 'sources'
                ? `Managing ${sources.length} source locations`
                : `Managing ${destinations.length} destinations`
              }
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
            >
              Refresh
            </button>
            <button
              onClick={handleClearAllDistances}
              disabled={isLoading}
              className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
            >
              Clear All Distances
            </button>
          </div>
        </div>
      </div>

      {/* Sources Tab */}
      {activeTab === 'sources' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Source Locations</h3>
            <p className="text-sm text-gray-500 mt-1">
              Manage your source locations. Deleting a source will remove all related distance calculations.
            </p>
          </div>

          {sources.length === 0 ? (
            <div className="p-8 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No sources found</h3>
              <p className="text-gray-500">Add sources using the calculator section.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Coordinates
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 text-gray-500">
                  {sources.map((source) => (
                    <tr key={source.id} className="hover:bg-gray-50">
                      {editingSourceId === source.id ? (
                        // Edit mode
                        <>
                          <td className="px-6 py-4">
                            <input
                              type="text"
                              value={editSourceData.name}
                              onChange={(e) => setEditSourceData({ ...editSourceData, name: e.target.value })}
                              className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              placeholder="Source name"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <input
                              type="text"
                              value={editSourceData.address}
                              onChange={(e) => setEditSourceData({ ...editSourceData, address: e.target.value })}
                              className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              placeholder="Address"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex space-x-1">
                              <input
                                type="number"
                                step="any"
                                value={editSourceData.latitude}
                                onChange={(e) => setEditSourceData({ ...editSourceData, latitude: e.target.value })}
                                className="w-20 border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="Lat"
                              />
                              <input
                                type="number"
                                step="any"
                                value={editSourceData.longitude}
                                onChange={(e) => setEditSourceData({ ...editSourceData, longitude: e.target.value })}
                                className="w-20 border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="Long"
                              />
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            <button
                              onClick={handleSaveSource}
                              disabled={isLoading}
                              className="inline-flex items-center px-3 py-1 border border-green-200 rounded-md text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 hover:text-green-800 disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingSourceId(null)}
                              disabled={isLoading}
                              className="inline-flex items-center px-3 py-1 border border-gray-200 rounded-md text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </td>
                        </>
                      ) : (
                        // Display mode
                        <>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{source.name}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{source.address}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {source.latitude.toFixed(6)}, {source.longitude.toFixed(6)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            <button
                              onClick={() => handleEditSource(source)}
                              disabled={isLoading}
                              className="inline-flex items-center px-3 py-1 border border-blue-200 rounded-md text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 disabled:opacity-50"
                              title={`Edit ${source.name}`}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteSource(source.id)}
                              disabled={isLoading}
                              className="inline-flex items-center px-3 py-1 border border-red-200 rounded-md text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              title={`Delete ${source.name} and all related distances`}
                            >
                              <TrashIcon className="w-4 h-4 mr-1" />
                              Delete
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Destinations Tab */}
      {activeTab === 'destinations' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Destinations</h3>
            <p className="text-sm text-gray-500 mt-1">
              Manage your destinations. Deleting a destination will remove all related distance calculations.
            </p>
          </div>

          {destinations.length === 0 ? (
            <div className="p-8 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No destinations found</h3>
              <p className="text-gray-500">Add destinations using the calculator section.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pincode
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Coordinates
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 text-gray-500">
                  {destinations.map((destination) => (
                    <tr key={destination.id} className="hover:bg-gray-50">
                      {editingDestinationId === destination.id ? (
                        // Edit mode
                        <>
                          <td className="px-6 py-4">
                            <input
                              type="text"
                              value={editDestinationData.name}
                              onChange={(e) => setEditDestinationData({ ...editDestinationData, name: e.target.value })}
                              className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              placeholder="Destination name"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <input
                              type="text"
                              value={editDestinationData.pincode}
                              onChange={(e) => setEditDestinationData({ ...editDestinationData, pincode: e.target.value })}
                              className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              placeholder="Pincode"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <input
                              type="text"
                              value={editDestinationData.address}
                              onChange={(e) => setEditDestinationData({ ...editDestinationData, address: e.target.value })}
                              className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              placeholder="Address"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex space-x-1">
                              <input
                                type="number"
                                step="any"
                                value={editDestinationData.latitude}
                                onChange={(e) => setEditDestinationData({ ...editDestinationData, latitude: e.target.value })}
                                className="w-20 border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="Lat"
                              />
                              <input
                                type="number"
                                step="any"
                                value={editDestinationData.longitude}
                                onChange={(e) => setEditDestinationData({ ...editDestinationData, longitude: e.target.value })}
                                className="w-20 border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="Long"
                              />
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            <button
                              onClick={handleSaveDestination}
                              disabled={isLoading}
                              className="inline-flex items-center px-3 py-1 border border-green-200 rounded-md text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 hover:text-green-800 disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingDestinationId(null)}
                              disabled={isLoading}
                              className="inline-flex items-center px-3 py-1 border border-gray-200 rounded-md text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </td>
                        </>
                      ) : (
                        // Display mode
                        <>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{destination.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{destination.pincode || '-'}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{destination.address || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {destination.latitude && destination.longitude
                                ? `${destination.latitude.toFixed(6)}, ${destination.longitude.toFixed(6)}`
                                : '-'
                              }
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            <button
                              onClick={() => handleEditDestination(destination)}
                              disabled={isLoading}
                              className="inline-flex items-center px-3 py-1 border border-blue-200 rounded-md text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 disabled:opacity-50"
                              title={`Edit ${destination.name}`}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteDestination(destination.id)}
                              disabled={isLoading}
                              className="inline-flex items-center px-3 py-1 border border-red-200 rounded-md text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              title={`Delete ${destination.name} and all related distances`}
                            >
                              <TrashIcon className="w-4 h-4 mr-1" />
                              Delete
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tools Tab */}
      {activeTab === 'tools' && (
        <div className="space-y-6">
          {/* Update Geocoding */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Update Geocoding</h3>
              <p className="text-sm text-gray-500 mt-1">
                Update coordinates for destinations without latitude/longitude using Google Maps API.
              </p>
            </div>

            <div className="p-6">
              {(() => {
                const destinationsWithoutCoords = destinations.filter(dest =>
                  !dest.latitude || !dest.longitude
                )
                return (
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-md p-4">
                      <p className="text-sm text-gray-700">
                        <strong>{destinationsWithoutCoords.length}</strong> destinations need coordinate updates
                      </p>
                      {destinationsWithoutCoords.length > 0 && (
                        <div className="mt-2 text-xs text-gray-600">
                          {destinationsWithoutCoords.slice(0, 3).map(dest => dest.name).join(', ')}
                          {destinationsWithoutCoords.length > 3 && ` and ${destinationsWithoutCoords.length - 3} more...`}
                        </div>
                      )}
                    </div>

                    {geocodingProgress && (
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                        <p className="text-sm text-blue-700">{geocodingProgress}</p>
                      </div>
                    )}

                    <button
                      onClick={handleUpdateGeocoding}
                      disabled={isLoading || destinationsWithoutCoords.length === 0}
                      className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? 'Updating...' : 'Update Geocoding'}
                    </button>
                  </div>
                )
              })()}
            </div>
          </div>

          {/* Batch Geocoding */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Batch Geocoding</h3>
              <p className="text-sm text-gray-500 mt-1">
                Add multiple destinations by entering pincodes. One pincode per line.
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter Pincodes (one per line)
                </label>
                <textarea
                  value={batchPincodes}
                  onChange={(e) => setBatchPincodes(e.target.value)}
                  placeholder="110001&#10;500032&#10;400001&#10;600001"
                  rows={6}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={isLoading}
                />
              </div>

              {geocodingProgress && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <p className="text-sm text-blue-700">{geocodingProgress}</p>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={handleBatchGeocode}
                  disabled={isLoading || !batchPincodes.trim()}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Processing...' : 'Start Batch Geocoding'}
                </button>
                <button
                  onClick={() => {
                    setBatchPincodes('')
                    setGeocodingProgress('')
                  }}
                  disabled={isLoading}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
