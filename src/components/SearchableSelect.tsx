import { useState, useMemo } from 'react'

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
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  disabled = false
}: SearchableSelectProps) {
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
            <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </span>
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 max-h-80 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
          <div className="sticky top-0 bg-white border-b px-3 py-2 z-10">
            <input
              type="text"
              className="w-full border-0 px-0 py-1 text-slate-900 placeholder-slate-500 focus:ring-0 sm:text-sm"
              placeholder={`Search ${placeholder.toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="max-h-64 overflow-auto">
            {filteredOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => {
                  onChange(option.id.toString())
                  setIsOpen(false)
                  setSearchTerm('')
                }}
                className="relative w-full cursor-default select-none py-2 pl-3 pr-9 text-left hover:bg-slate-50 hover:text-slate-900 transition-colors duration-150"
              >
                <div>
                  <span className="block truncate font-medium">{option.name}</span>
                  {'pincode' in option && option.pincode && (
                    <div className="text-xs text-slate-500 hover:text-slate-600">
                      PIN: {option.pincode}
                    </div>
                  )}
                  {'latitude' in option && option.latitude && option.longitude && (
                    <div className="text-xs text-slate-500 hover:text-slate-600">
                      {option.latitude}, {option.longitude}
                    </div>
                  )}
                </div>
              </button>
            ))}
            {filteredOptions.length === 0 && (
              <div className="px-4 py-2 text-sm text-slate-500">No options found</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
