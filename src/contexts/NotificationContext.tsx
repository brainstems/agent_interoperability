'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'
import Notification, { NotificationProps } from '../components/ui/Notification'

interface NotificationContextType {
  showNotification: (notification: Omit<NotificationProps, 'isVisible' | 'onClose'>) => void
  showSuccess: (title: string, message?: string) => void
  showError: (title: string, message?: string) => void
  showWarning: (title: string, message?: string) => void
  showInfo: (title: string, message?: string) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export const useNotification = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider')
  }
  return context
}

interface NotificationProviderProps {
  children: ReactNode
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Array<NotificationProps & { id: string }>>([])

  const showNotification = (notification: Omit<NotificationProps, 'isVisible' | 'onClose'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newNotification = {
      ...notification,
      id,
      isVisible: true,
      onClose: () => removeNotification(id)
    }
    
    setNotifications(prev => [...prev, newNotification])
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id))
  }

  const showSuccess = (title: string, message?: string) => {
    showNotification({ type: 'success', title, message })
  }

  const showError = (title: string, message?: string) => {
    showNotification({ type: 'error', title, message })
  }

  const showWarning = (title: string, message?: string) => {
    showNotification({ type: 'warning', title, message })
  }

  const showInfo = (title: string, message?: string) => {
    showNotification({ type: 'info', title, message })
  }

  return (
    <NotificationContext.Provider value={{
      showNotification,
      showSuccess,
      showError,
      showWarning,
      showInfo
    }}>
      {children}
      
      {/* Render notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-4">
        {notifications.map((notification) => (
          <Notification
            key={notification.id}
            {...notification}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  )
}
