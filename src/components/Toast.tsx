import { useEffect, useState } from 'react'
import { CheckCircleIcon, ExclamationTriangleIcon, XMarkIcon, InformationCircleIcon } from '@heroicons/react/24/outline'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

interface ToastProps {
  toast: Toast
  onClose: (id: string) => void
}

function ToastItem({ toast, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 10)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    // Auto-close timer
    const duration = toast.duration || 4000
    const timer = setTimeout(() => {
      setIsLeaving(true)
      setTimeout(() => {
        onClose(toast.id)
      }, 300) // Wait for exit animation
    }, duration)

    return () => clearTimeout(timer)
  }, [toast.duration, toast.id, onClose])

  const handleClose = () => {
    setIsLeaving(true)
    setTimeout(() => {
      onClose(toast.id)
    }, 300) // Wait for exit animation
  }

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-green-400" />
      case 'error':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
      case 'info':
        return <InformationCircleIcon className="h-5 w-5 text-blue-400" />
      default:
        return <InformationCircleIcon className="h-5 w-5 text-blue-400" />
    }
  }

  const getBackgroundColor = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-50 border-green-200'
      case 'error':
        return 'bg-red-50 border-red-200'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200'
      case 'info':
        return 'bg-blue-50 border-blue-200'
      default:
        return 'bg-blue-50 border-blue-200'
    }
  }

  const getTextColor = () => {
    switch (toast.type) {
      case 'success':
        return 'text-green-800'
      case 'error':
        return 'text-red-800'
      case 'warning':
        return 'text-yellow-800'
      case 'info':
        return 'text-blue-800'
      default:
        return 'text-blue-800'
    }
  }

  return (
    <div
      className={`
        relative flex items-start p-4 mb-3 rounded-lg border shadow-lg transition-all duration-300 ease-in-out
        ${getBackgroundColor()}
        ${isVisible && !isLeaving 
          ? 'transform translate-x-0 opacity-100' 
          : isLeaving
          ? 'transform translate-x-full opacity-0'
          : 'transform translate-x-full opacity-0'
        }
      `}
    >
      <div className="flex-shrink-0">
        {getIcon()}
      </div>
      <div className="ml-3 flex-1">
        <p className={`text-sm font-medium ${getTextColor()}`}>
          {toast.message}
        </p>
      </div>
      <div className="ml-4 flex-shrink-0">
        <button
          onClick={handleClose}
          className={`
            inline-flex rounded-md p-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2
            ${toast.type === 'success' ? 'text-green-500 hover:bg-green-100 focus:ring-green-600' : ''}
            ${toast.type === 'error' ? 'text-red-500 hover:bg-red-100 focus:ring-red-600' : ''}
            ${toast.type === 'warning' ? 'text-yellow-500 hover:bg-yellow-100 focus:ring-yellow-600' : ''}
            ${toast.type === 'info' ? 'text-blue-500 hover:bg-blue-100 focus:ring-blue-600' : ''}
          `}
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

interface ToastContainerProps {
  toasts: Toast[]
  onClose: (id: string) => void
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md w-full pointer-events-none">
      <div className="pointer-events-auto">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={onClose} />
        ))}
      </div>
    </div>
  )
}

export default ToastContainer
