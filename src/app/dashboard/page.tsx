'use client'

import React, { useState, useEffect } from 'react'
import Layout from '@/components/layout/Layout'
import { useAuth } from '@/contexts/AuthContext'
import { useSupabaseQuery, useMembers, useEvents } from '@/hooks/useSupabase'
import { Card, CardContent, CardHeader, CardTitle, Button, PageHeader } from '@/components/ui'
import {
  UsersIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'

interface DashboardStats {
  totalMembers: number
  memberGrowth: number
  totalDonations: number
  donationGrowth: number
  upcomingEvents: number
  activeGroups: number
  weeklyAttendance: number
  attendanceGrowth: number
}

interface RecentActivity {
  id: string
  type: 'member' | 'event' | 'donation' | 'group'
  title: string
  description: string
  timestamp: string
}

export default function DashboardPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const { members, loading: membersLoading } = useMembers({ isActive: true })
  const { data: upcomingEvents, loading: eventsLoading } = useEvents({ upcoming: true, limit: 10 })
  
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])

  useEffect(() => {
    if (profile && members) {
      // Calculate stats from real data
      const calculatedStats: DashboardStats = {
        totalMembers: members.length,
        memberGrowth: 5, // TODO: Calculate from historical data
        totalDonations: 12500, // TODO: Get from donations table
        donationGrowth: 3,
        upcomingEvents: Array.isArray(upcomingEvents) ? upcomingEvents.length : 0,
        activeGroups: 8, // TODO: Get from groups table
        weeklyAttendance: 150, // TODO: Get from attendance records
        attendanceGrowth: 5
      }
      setStats(calculatedStats)

      // Generate recent activity from real data
      const activities: RecentActivity[] = [
        ...members.slice(0, 3).map(member => ({
          id: `member-${member.id}`,
          type: 'member' as const,
          title: 'New Member Joined',
          description: `${member.first_name} ${member.last_name} joined the church`,
          timestamp: '2 hours ago'
        })),
        ...(Array.isArray(upcomingEvents) ? upcomingEvents.slice(0, 2).map(event => ({
          id: `event-${event.id}`,
          type: 'event' as const,
          title: 'Event Created',
          description: event.title,
          timestamp: '1 day ago'
        })) : [])
      ]
      setRecentActivity(activities)
    }
  }, [profile, members, upcomingEvents])

  const loading = authLoading || membersLoading || eventsLoading

  const statCards = [
    {
      name: 'Total Members',
      value: stats?.totalMembers || 0,
      change: stats?.memberGrowth || 0,
      icon: UsersIcon,
      color: 'bg-blue-500'
    },
    {
      name: 'Monthly Giving',
      value: `$${(stats?.totalDonations || 0).toLocaleString()}`,
      change: stats?.donationGrowth || 0,
      icon: CurrencyDollarIcon,
      color: 'bg-green-500'
    },
    {
      name: 'Weekly Attendance',
      value: stats?.weeklyAttendance || 0,
      change: stats?.attendanceGrowth || 0,
      icon: ChartBarIcon,
      color: 'bg-purple-500'
    },
    {
      name: 'Active Groups',
      value: stats?.activeGroups || 0,
      change: 0,
      icon: UserGroupIcon,
      color: 'bg-orange-500'
    }
  ]

  if (loading) {
    return (
      <Layout>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white overflow-hidden shadow rounded-lg h-32"></div>
            ))}
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Dashboard"
          subtitle="Welcome back! Here's what's happening at your church."
        >
          <Button>Generate Report</Button>
        </PageHeader>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Card key={stat.name}>
              <CardContent className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className={`inline-flex items-center justify-center p-3 rounded-md ${stat.color}`}>
                      <stat.icon className="h-6 w-6 text-white" aria-hidden="true" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-secondary-500 truncate">{stat.name}</dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-secondary-900">{stat.value}</div>
                        {stat.change !== 0 && (
                          <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                            stat.change > 0 ? 'text-success-600' : 'text-error-600'
                          }`}>
                            {stat.change > 0 ? (
                              <ArrowUpIcon className="self-center flex-shrink-0 h-4 w-4 text-success-500" />
                            ) : (
                              <ArrowDownIcon className="self-center flex-shrink-0 h-4 w-4 text-error-500" />
                            )}
                            <span className="sr-only">{stat.change > 0 ? 'Increased' : 'Decreased'} by</span>
                            {Math.abs(stat.change)}%
                          </div>
                        )}
                      </dd>
                    </dl>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flow-root">
                  <ul role="list" className="-mb-8">
                    {recentActivity.length > 0 ? recentActivity.map((activity, activityIdx) => (
                      <li key={activity.id}>
                        <div className="relative pb-8">
                          {activityIdx !== recentActivity.length - 1 ? (
                            <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                          ) : null}
                          <div className="relative flex space-x-3">
                            <div>
                              <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                                activity.type === 'member' ? 'bg-blue-500' :
                                activity.type === 'event' ? 'bg-purple-500' :
                                activity.type === 'donation' ? 'bg-green-500' : 'bg-orange-500'
                              }`}>
                                {activity.type === 'member' && <UsersIcon className="h-4 w-4 text-white" />}
                                {activity.type === 'event' && <CalendarIcon className="h-4 w-4 text-white" />}
                                {activity.type === 'donation' && <CurrencyDollarIcon className="h-4 w-4 text-white" />}
                                {activity.type === 'group' && <UserGroupIcon className="h-4 w-4 text-white" />}
                              </span>
                            </div>
                            <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                              <div>
                                <p className="text-sm text-gray-900">{activity.title}</p>
                                <p className="text-sm text-gray-500">{activity.description}</p>
                              </div>
                              <div className="whitespace-nowrap text-right text-sm text-gray-500">
                                {activity.timestamp}
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    )) : (
                      <li className="text-center py-8 text-secondary-500">
                        No recent activity to display
                      </li>
                    )}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions & Upcoming Events */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    Add New Member
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    Create Event
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    Record Donation
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    Send Communication
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Events */}
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">Sunday Service</p>
                      <p className="text-sm text-gray-500">Tomorrow at 10:00 AM</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">Bible Study</p>
                      <p className="text-sm text-gray-500">Wednesday at 7:00 PM</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-2 h-2 bg-purple-500 rounded-full"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">Youth Group</p>
                      <p className="text-sm text-gray-500">Friday at 6:30 PM</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Insights */}
            <Card className="bg-gradient-to-br from-primary-50 to-primary-100 border-primary-200">
              <CardHeader>
                <CardTitle className="text-primary-900">AI Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="bg-white/60 rounded-md p-3">
                    <p className="text-sm text-primary-800">
                      <strong>Attendance Trend:</strong> Weekly attendance has grown 5% this month. Consider planning additional seating.
                    </p>
                  </div>
                  <div className="bg-white/60 rounded-md p-3">
                    <p className="text-sm text-primary-800">
                      <strong>Follow-up Needed:</strong> 3 members haven't attended in 4+ weeks. Pastoral care recommended.
                    </p>
                  </div>
                  <div className="bg-white/60 rounded-md p-3">
                    <p className="text-sm text-primary-800">
                      <strong>Giving Pattern:</strong> Monthly giving is 3% above target. Great stewardship!
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  )
}
