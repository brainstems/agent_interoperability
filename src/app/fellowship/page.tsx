'use client'

import React, { useState } from 'react'
import Layout from '@/components/layout/Layout'
import { useAuth } from '@/contexts/AuthContext'
import { useConnections, useMembers } from '@/hooks/useSupabase'
import { aiAgentService } from '@/lib/ai-agents'
import {
  UserGroupIcon,
  HeartIcon,
  SparklesIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ClockIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

export default function FellowshipPage() {
  const { user, profile } = useAuth()
  const { data: connections, loading: connectionsLoading } = useConnections(user?.id)
  const { members, loading: membersLoading } = useMembers({ isActive: true })
  const [processingMatch, setProcessingMatch] = useState(false)

  const handleFindMatches = async () => {
    if (!user || !profile?.church_id) return
    
    setProcessingMatch(true)
    try {
      await aiAgentService.scheduleMemberMatching(user.id, profile.church_id)
      // The real-time subscription will update the connections automatically
    } catch (error) {
      console.error('Error scheduling member matching:', error)
    } finally {
      setProcessingMatch(false)
    }
  }

  const handleConnectionAction = async (connectionId: string, action: 'connect' | 'dismiss') => {
    // TODO: Implement connection actions
    console.log(`${action} connection:`, connectionId)
  }

  const suggestedConnections = Array.isArray(connections) 
    ? connections.filter(c => c.status === 'SUGGESTED')
    : []

  const activeConnections = Array.isArray(connections)
    ? connections.filter(c => c.status === 'CONNECTED' || c.status === 'ACTIVE')
    : []

  const loading = connectionsLoading || membersLoading

  if (loading) {
    return (
      <Layout>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white shadow rounded-lg h-64"></div>
            ))}
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
              Fellowship & Connections
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Discover meaningful connections within your church community
            </p>
          </div>
          <div className="mt-4 flex md:ml-4 md:mt-0">
            <button
              onClick={handleFindMatches}
              disabled={processingMatch}
              className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
            >
              <SparklesIcon className="h-4 w-4 mr-2" />
              {processingMatch ? 'Finding Matches...' : 'Find New Matches'}
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UserGroupIcon className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Active Connections</dt>
                    <dd className="text-lg font-medium text-gray-900">{activeConnections.length}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <HeartIcon className="h-8 w-8 text-red-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">New Suggestions</dt>
                    <dd className="text-lg font-medium text-gray-900">{suggestedConnections.length}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChatBubbleLeftRightIcon className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Members</dt>
                    <dd className="text-lg font-medium text-gray-900">{members.length}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Suggested Connections */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Suggested Connections
              </h3>
              
              {suggestedConnections.length === 0 ? (
                <div className="text-center py-8">
                  <SparklesIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No suggestions yet</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Click "Find New Matches" to discover potential connections
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {suggestedConnections.map((connection) => {
                    const member = members.find(m => m.id === connection.member_id)
                    if (!member) return null

                    return (
                      <div key={connection.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-600">
                                {member.first_name[0]}{member.last_name[0]}
                              </span>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-gray-900">
                                {member.first_name} {member.last_name}
                              </h4>
                              <p className="text-sm text-gray-500">{member.role}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {connection.match_percentage}% match
                            </span>
                          </div>
                        </div>
                        
                        {connection.connection_reason && (
                          <p className="mt-2 text-sm text-gray-600">
                            {connection.connection_reason}
                          </p>
                        )}
                        
                        {connection.common_interests && connection.common_interests.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-500 mb-1">Common interests:</p>
                            <div className="flex flex-wrap gap-1">
                              {connection.common_interests.map((interest, idx) => (
                                <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {interest}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="mt-4 flex space-x-2">
                          <button
                            onClick={() => handleConnectionAction(connection.id, 'connect')}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                          >
                            <CheckCircleIcon className="h-4 w-4 mr-1" />
                            Connect
                          </button>
                          <button
                            onClick={() => handleConnectionAction(connection.id, 'dismiss')}
                            className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                          >
                            <XMarkIcon className="h-4 w-4 mr-1" />
                            Not Now
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Active Connections */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Your Connections
              </h3>
              
              {activeConnections.length === 0 ? (
                <div className="text-center py-8">
                  <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No connections yet</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Start by accepting some suggested connections above
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeConnections.map((connection) => {
                    const member = members.find(m => m.id === connection.member_id)
                    if (!member) return null

                    return (
                      <div key={connection.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-xs font-medium text-gray-600">
                              {member.first_name[0]}{member.last_name[0]}
                            </span>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">
                              {member.first_name} {member.last_name}
                            </h4>
                            <p className="text-xs text-gray-500">
                              Connected {new Date(connection.connected_at || connection.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircleIcon className="h-3 w-3 mr-1" />
                            Connected
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI Insights */}
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 shadow rounded-lg border border-purple-200">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-purple-900 mb-4">
              Fellowship Insights
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/60 rounded-md p-4">
                <h4 className="text-sm font-medium text-purple-800 mb-2">Connection Opportunities</h4>
                <p className="text-sm text-purple-700">
                  Based on your interests and involvement, you have strong potential connections with 
                  {members.length > 10 ? ' several' : ' a few'} members in similar life stages and ministries.
                </p>
              </div>
              <div className="bg-white/60 rounded-md p-4">
                <h4 className="text-sm font-medium text-purple-800 mb-2">Community Engagement</h4>
                <p className="text-sm text-purple-700">
                  Consider joining small groups or volunteer opportunities to naturally build 
                  relationships with your suggested connections.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
