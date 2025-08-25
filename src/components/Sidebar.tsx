import { useRouter } from 'next/navigation'

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
  activeSection: 'calculator' | 'distances' | 'manage'
  onSectionChange: (section: 'calculator' | 'distances' | 'manage') => void
  distanceCount: number
  sourceCount: number
  destinationCount: number
}

export default function Sidebar({
  isOpen,
  onToggle,
  activeSection,
  onSectionChange,
  distanceCount,
  sourceCount,
  destinationCount
}: SidebarProps) {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
      router.push('/')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <div className={`${isOpen ? 'w-80' : 'w-16'} bg-gradient-to-b from-slate-50 to-slate-100 border-r border-slate-200 shadow-sm transition-all duration-300 flex flex-col relative`}>
      {/* Sidebar Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        <div className={`transition-all duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 w-0'}`}>
          <h1 className="font-bold text-xl text-slate-800">
            Distance Calculator
          </h1>
          <p className="text-slate-500 text-sm mt-1">Route Management</p>
        </div>
        <button
          onClick={onToggle}
          className={`p-2 rounded-lg hover:bg-slate-200 transition-all duration-200 text-slate-600 hover:text-slate-800 ${
            isOpen ? '' : 'mx-auto'
          }`}
          title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isOpen ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"} />
          </svg>
        </button>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-3">
        <button
          onClick={() => onSectionChange('calculator')}
          className={`w-full flex items-center px-3 py-3 rounded-xl transition-all duration-200 group relative ${
            activeSection === 'calculator'
              ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
          }`}
          title={!isOpen ? 'Calculator' : undefined}
        >
          <div className={`flex items-center ${isOpen ? '' : 'justify-center w-full'}`}>
            <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            {isOpen && <span className="ml-3 font-medium">Calculator</span>}
          </div>
          {!isOpen && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
              Calculator
            </div>
          )}
        </button>

        <button
          onClick={() => onSectionChange('distances')}
          className={`w-full flex items-center px-3 py-3 rounded-xl transition-all duration-200 group relative ${
            activeSection === 'distances'
              ? 'bg-green-50 text-green-700 border border-green-200 shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
          }`}
          title={!isOpen ? 'Distance Matrix' : undefined}
        >
          <div className={`flex items-center ${isOpen ? '' : 'justify-center w-full'}`}>
            <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            {isOpen && (
              <div className="flex items-center justify-between w-full ml-3">
                <span className="font-medium">Distance Matrix</span>
                <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-semibold">
                  {distanceCount}
                </span>
              </div>
            )}
          </div>
          {!isOpen && (
            <>
              <div className="absolute -top-1 -right-1 bg-green-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                {distanceCount > 99 ? '99+' : distanceCount}
              </div>
              <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                Distance Matrix ({distanceCount})
              </div>
            </>
          )}
        </button>

        <button
          onClick={() => onSectionChange('manage')}
          className={`w-full flex items-center px-3 py-3 rounded-xl transition-all duration-200 group relative ${
            activeSection === 'manage'
              ? 'bg-purple-50 text-purple-700 border border-purple-200 shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
          }`}
          title={!isOpen ? 'Manage Data' : undefined}
        >
          <div className={`flex items-center ${isOpen ? '' : 'justify-center w-full'}`}>
            <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
            </svg>
            {isOpen && <span className="ml-3 font-medium">Manage Data</span>}
          </div>
          {!isOpen && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
              Manage Data
            </div>
          )}
        </button>

        {/* Statistics */}
        {isOpen && (
          <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center mb-3">
              <svg className="w-5 h-5 text-slate-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <div className="text-sm font-medium text-slate-700">Statistics</div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 text-sm">Sources</span>
                <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-semibold">{sourceCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 text-sm">Destinations</span>
                <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-semibold">{destinationCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 text-sm">Total Routes</span>
                <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full font-semibold">{distanceCount}</span>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-slate-200">
        <button
          onClick={handleLogout}
          className={`w-full flex items-center px-3 py-3 rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200 group relative ${
            isOpen ? '' : 'justify-center'
          }`}
          title={!isOpen ? 'Logout' : undefined}
        >
          <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {isOpen && <span className="ml-3 font-medium">Logout</span>}
          {!isOpen && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
              Logout
            </div>
          )}
        </button>
      </div>
    </div>
  )
}
