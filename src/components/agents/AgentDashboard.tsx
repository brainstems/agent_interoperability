'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { crewaiService, type CrewAIExecution, type AgentConfig, type CrewConfig } from '../../lib/crewai-service'
import { 
  PlayIcon, 
  StopIcon, 
  ClockIcon, 
  CheckCircleIcon, 
  ExclamationCircleIcon,
  CpuChipIcon,
  UsersIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'

export default function AgentDashboard() {
  const { profile } = useAuth()
  const [agents, setAgents] = useState<AgentConfig[]>([])
  const [crews, setCrews] = useState<CrewConfig[]>([])
  const [executions, setExecutions] = useState<CrewAIExecution[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCrew, setSelectedCrew] = useState<string>('')
  const [executionInputs, setExecutionInputs] = useState<Record<string, any>>({})
  const [isExecuting, setIsExecuting] = useState(false)

  useEffect(() => {
    if (!profile?.church_id) return

    const fetchData = async () => {
      try {
        const [agentsData, crewsData, executionsData] = await Promise.all([
          crewaiService.getAgents(profile.church_id),
          crewaiService.getCrews(profile.church_id),
          crewaiService.getExecutions(profile.church_id)
        ])

        setAgents(agentsData)
        setCrews(crewsData)
        setExecutions(executionsData)
      } catch (error) {
        console.error('Error fetching agent data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    // Subscribe to real-time execution updates
    const subscription = crewaiService.subscribeToExecutions(profile.church_id, (execution) => {
      setExecutions(prev => {
        const index = prev.findIndex(e => e.id === execution.id)
        if (index >= 0) {
          const updated = [...prev]
          updated[index] = execution
          return updated
        } else {
          return [execution, ...prev]
        }
      })
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [profile?.church_id])

  const handleExecuteCrew = async () => {
    if (!selectedCrew || !profile?.church_id) return

    setIsExecuting(true)
    try {
      await crewaiService.executeCrew(
        selectedCrew,
        profile.church_id,
        executionInputs,
        profile.id
      )
      
      // Reset form
      setSelectedCrew('')
      setExecutionInputs({})
    } catch (error) {
      console.error('Error executing crew:', error)
    } finally {
      setIsExecuting(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'RUNNING':
        return <ClockIcon className="h-5 w-5 text-blue-500 animate-spin" />
      case 'FAILED':
        return <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
      default:
        return <ClockIcon className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      case 'RUNNING':
        return 'bg-blue-100 text-blue-800'
      case 'FAILED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-5">
        <h3 className="text-lg leading-6 font-medium text-gray-900">AI Agent Dashboard</h3>
        <p className="mt-2 max-w-4xl text-sm text-gray-500">
          Monitor and manage AI agents and crew workflows for your church operations.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CpuChipIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Agents</dt>
                  <dd className="text-lg font-medium text-gray-900">{agents.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UsersIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Available Crews</dt>
                  <dd className="text-lg font-medium text-gray-900">{crews.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Executions</dt>
                  <dd className="text-lg font-medium text-gray-900">{executions.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Execute Crew Form */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Execute Crew Workflow</h3>
          
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="crew-select" className="block text-sm font-medium text-gray-700">
                Select Crew
              </label>
              <select
                id="crew-select"
                value={selectedCrew}
                onChange={(e) => setSelectedCrew(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="">Choose a crew...</option>
                {crews.map((crew) => (
                  <option key={crew.id} value={crew.name}>
                    {crew.name} - {crew.description}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="inputs" className="block text-sm font-medium text-gray-700">
                Inputs (JSON)
              </label>
              <textarea
                id="inputs"
                rows={3}
                value={JSON.stringify(executionInputs, null, 2)}
                onChange={(e) => {
                  try {
                    setExecutionInputs(JSON.parse(e.target.value || '{}'))
                  } catch {
                    // Invalid JSON, ignore
                  }
                }}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder='{"member_id": "123", "priority": "HIGH"}'
              />
            </div>
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={handleExecuteCrew}
              disabled={!selectedCrew || isExecuting}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExecuting ? (
                <>
                  <ClockIcon className="h-4 w-4 mr-2 animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <PlayIcon className="h-4 w-4 mr-2" />
                  Execute Crew
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Agents List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Active Agents</h3>
          
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <div key={agent.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-900">{agent.name}</h4>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{agent.role}</p>
                <p className="text-xs text-gray-500 mb-2">{agent.goal}</p>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Tools: {agent.tools.length}</span>
                  <span>Max Iter: {agent.max_iterations}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Executions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Executions</h3>
          
          <div className="flow-root">
            <ul role="list" className="-mb-8">
              {executions.slice(0, 10).map((execution, index) => (
                <li key={execution.id}>
                  <div className="relative pb-8">
                    {index !== executions.slice(0, 10).length - 1 && (
                      <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                    )}
                    <div className="relative flex space-x-3">
                      <div className="flex h-8 w-8 items-center justify-center">
                        {getStatusIcon(execution.status)}
                      </div>
                      <div className="flex min-w-0 flex-1 justify-between space-x-4">
                        <div>
                          <p className="text-sm text-gray-900">
                            <span className="font-medium">{execution.crew_name}</span>
                          </p>
                          <p className="text-sm text-gray-500">
                            {execution.result ? execution.result.substring(0, 100) + '...' : 'No result yet'}
                          </p>
                        </div>
                        <div className="whitespace-nowrap text-right text-sm text-gray-500">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(execution.status)}`}>
                            {execution.status}
                          </span>
                          <div className="mt-1">
                            {execution.started_at && new Date(execution.started_at).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
