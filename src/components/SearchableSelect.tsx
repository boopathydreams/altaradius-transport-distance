import { useState, useMemo, useRef, useEffect } from 'react'

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

interface SearchableSelectProps {
  options: Source[] | Destination[]
  value: string
  onChange: (value: string) => void
  placeholder: string
  disabled?: boolean
  label?: string
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
  label
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options
    return options.filter(option => {
      const nameMatch = option.name.toLowerCase().includes(searchTerm.toLowerCase())
      const pincodeMatch = 'pincode' in option && option.pincode &&
        option.pincode.toLowerCase().includes(searchTerm.toLowerCase())
      const addressMatch = option.address &&
        option.address.toLowerCase().includes(searchTerm.toLowerCase())
      return nameMatch || pincodeMatch || addressMatch
    })
  }, [options, searchTerm])

  const selectedOption = options.find(opt => opt.id.toString() === value)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchTerm('')
        setFocusedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setFocusedIndex(prev =>
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusedIndex(prev =>
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
          const selectedOption = filteredOptions[focusedIndex]
          onChange(selectedOption.id.toString())
          setIsOpen(false)
          setSearchTerm('')
          setFocusedIndex(-1)
        }
        break
      case 'Escape':
        setIsOpen(false)
        setSearchTerm('')
        setFocusedIndex(-1)
        break
    }
  }

  const handleSelect = (option: Source | Destination) => {
    onChange(option.id.toString())
    setIsOpen(false)
    setSearchTerm('')
    setFocusedIndex(-1)
  }

  const handleClear = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation()
    onChange('')
    setIsOpen(false)
    setSearchTerm('')
    setFocusedIndex(-1)
  }

  const toggleDropdown = () => {
    if (disabled) return
    setIsOpen(!isOpen)
    setSearchTerm('')
    setFocusedIndex(-1)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {label}
        </label>
      )}

      {/* Main Select Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={toggleDropdown}
        onKeyDown={handleKeyDown}
        className={`
          relative w-full min-h-[42px] px-3 py-2 text-left
          bg-white border rounded-lg shadow-sm
          transition-all duration-200 ease-in-out
          ${disabled
            ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
            : isOpen
              ? 'border-blue-500 ring-2 ring-blue-100 shadow-md'
              : 'border-slate-300 hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
          }
        `}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            {selectedOption ? (
              <div>
                <div className="font-medium text-slate-900 truncate">
                  {selectedOption.name}
                </div>
                {'pincode' in selectedOption && selectedOption.pincode && (
                  <div className="text-xs text-slate-500 truncate">
                    PIN: {selectedOption.pincode}
                  </div>
                )}
                {'latitude' in selectedOption && selectedOption.latitude && selectedOption.longitude && (
                  <div className="text-xs text-slate-500 truncate">
                    {selectedOption.latitude.toFixed(4)}, {selectedOption.longitude.toFixed(4)}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-slate-500 truncate">{placeholder}</span>
            )}
          </div>

          <div className="flex items-center space-x-1 ml-2">
            {/* Clear Button - using div to avoid nested button issue */}
            {selectedOption && !disabled && (
              <div
                onClick={handleClear}
                className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                title="Clear selection"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleClear(e)
                  }
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}

            {/* Dropdown Arrow */}
            <div className="text-slate-400">
              <svg
                className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-80 overflow-hidden">
          {/* Search Input */}
          <div className="p-3 border-b border-slate-100 bg-slate-50">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                placeholder={`Search ${placeholder.toLowerCase()}...`}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setFocusedIndex(-1)
                }}
                onKeyDown={handleKeyDown}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-64 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              <>
                {filteredOptions.map((option, index) => (
                  <button
                    key={option.id}
                    onClick={() => handleSelect(option)}
                    className={`
                      w-full px-4 py-3 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none
                      transition-colors duration-150
                      ${focusedIndex === index ? 'bg-blue-50' : ''}
                      ${selectedOption?.id === option.id ? 'bg-blue-100 text-blue-900' : 'text-slate-900'}
                    `}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {option.name}
                        </div>

                        {/* Additional Info */}
                        <div className="mt-1 space-y-1">
                          {'pincode' in option && option.pincode && (
                            <div className="text-xs text-slate-500">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
                                PIN: {option.pincode}
                              </span>
                            </div>
                          )}
                          {'latitude' in option && option.latitude && option.longitude && (
                            <div className="text-xs text-slate-500">
                              📍 {option.latitude.toFixed(4)}, {option.longitude.toFixed(4)}
                            </div>
                          )}
                          {/* {option.address && (
                            <div className="text-xs text-slate-500 truncate">
                              📍 {option.address}
                            </div>
                          )} */}
                        </div>
                      </div>

                      {/* Selected Indicator */}
                      {selectedOption?.id === option.id && (
                        <div className="flex-shrink-0 ml-2">
                          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </>
            ) : (
              <div className="px-4 py-8 text-center">
                <div className="text-slate-400 mb-2">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.41-1.007-5.849-2.613M16.5 17.5L15 16m1.5 1.5l1.5 1.5M16.5 17.5L18 19" />
                  </svg>
                </div>
                <div className="text-sm text-slate-500">No options found</div>
                {searchTerm && (
                  <div className="text-xs text-slate-400 mt-1">
                    Try searching with different keywords
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer with count */}
          {filteredOptions.length > 0 && (
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-100">
              <div className="text-xs text-slate-500">
                {filteredOptions.length} of {options.length} options
                {searchTerm && ` matching "${searchTerm}"`}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
