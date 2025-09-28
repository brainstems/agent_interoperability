'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import AgentDashboard from '@/components/agents/AgentDashboard'
import AutomatedAgentMonitor from '@/components/agents/AutomatedAgentMonitor'

export default function AgentsPage() {
  const { user, profile, loading } = useAuth()
  const [viewMode, setViewMode] = useState<'crewai' | 'automated' | 'legacy'>('crewai')

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || !profile) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
        <p className="mt-2 text-gray-600">You must be logged in to view this page.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Agents</h1>
          <p className="mt-2 text-gray-600">
            Manage and monitor AI-powered church management workflows
          </p>
        </div>
        
        <div className="flex rounded-lg border border-gray-300 p-1">
          <button
            onClick={() => setViewMode('crewai')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'crewai'
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            CrewAI Dashboard
          </button>
          <button
            onClick={() => setViewMode('automated')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'automated'
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            Automated Agents
          </button>
          <button
            onClick={() => setViewMode('legacy')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'legacy'
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            Legacy Monitor
          </button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'crewai' ? (
        <AgentDashboard />
      ) : viewMode === 'automated' ? (
        <AutomatedAgentMonitor />
      ) : (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">Legacy Monitor</h3>
          <p className="mt-2 text-gray-600">Legacy agent monitoring will be available soon.</p>
        </div>
      )}
    </div>
  )
}

