import { useState, useCallback } from 'react'
import type { Toast, ToastType } from '../components/Toast'

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: ToastType = 'info', duration?: number) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9)
    const toast: Toast = {
      id,
      message,
      type,
      duration
    }

    setToasts(prevToasts => [...prevToasts, toast])

    return id
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id))
  }, [])

  const clearAllToasts = useCallback(() => {
    setToasts([])
  }, [])

  // Convenience methods
  const success = useCallback((message: string, duration?: number) => {
    return showToast(message, 'success', duration)
  }, [showToast])

  const error = useCallback((message: string, duration?: number) => {
    return showToast(message, 'error', duration)
  }, [showToast])

  const warning = useCallback((message: string, duration?: number) => {
    return showToast(message, 'warning', duration)
  }, [showToast])

  const info = useCallback((message: string, duration?: number) => {
    return showToast(message, 'info', duration)
  }, [showToast])

  return {
    toasts,
    showToast,
    removeToast,
    clearAllToasts,
    success,
    error,
    warning,
    info
  }
}

export default useToast
