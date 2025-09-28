'use client'

import React, { useState, useEffect } from 'react'
import Layout from '@/components/layout/Layout'
import { Card, Button, Input, Badge, Table, TableHeader, TableBody, TableHead, TableRow, TableCell, PageHeader } from '@/components/ui'
import MemberForm from '@/components/forms/MemberForm'
import { getMemberStatusBadge, formatDate, getInitials } from '@/lib/utils'
import {
  MagnifyingGlassIcon,
  PlusIcon,
  FunnelIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline'

interface Member {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  memberStatus: string
  joinDate: string
  lastAttendance: string
  family?: {
    familyName: string
  }
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showMemberForm, setShowMemberForm] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)

  useEffect(() => {
    fetchMembers()
  }, [currentPage, searchTerm, statusFilter])

  const fetchMembers = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        search: searchTerm,
        ...(statusFilter !== 'all' && { status: statusFilter })
      })

      const response = await fetch(`/api/members?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setMembers(data.data || [])
        setTotalPages(data.pagination?.totalPages || 1)
      }
    } catch (error) {
      console.error('Failed to fetch members:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateMember = async (memberData: any) => {
    const response = await fetch('/api/members', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(memberData)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create member')
    }

    await fetchMembers()
  }

  const handleEditMember = async (memberData: any) => {
    if (!editingMember) return

    const response = await fetch(`/api/members/${editingMember.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(memberData)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update member')
    }

    await fetchMembers()
    setEditingMember(null)
  }

  const openEditForm = (member: Member) => {
    setEditingMember(member)
    setShowMemberForm(true)
  }

  const closeForm = () => {
    setShowMemberForm(false)
    setEditingMember(null)
  }


  if (loading) {
    return (
      <Layout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 loading-skeleton w-1/4"></div>
          <div className="h-10 loading-skeleton"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 loading-skeleton"></div>
          ))}
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          title="Members"
          subtitle="A list of all members in your church including their contact information and status."
        >
          <button
            type="button"
            onClick={() => setShowMemberForm(true)}
            className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <PlusIcon className="h-4 w-4 inline mr-1" />
            Add Member
          </button>
        </PageHeader>

        {/* Filters */}
        <Card>
          <div className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <MagnifyingGlassIcon className="h-5 w-5 text-secondary-400" aria-hidden="true" />
                  </div>
                  <Input
                    type="text"
                    className="pl-10"
                    placeholder="Search members..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="sm:w-48">
                <select
                  className="form-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="VISITOR">Visitor</option>
                  <option value="MEMBER">Member</option>
                </select>
              </div>
            </div>
          </div>
        </Card>

        {/* Members Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Family</TableHead>
                <TableHead>Last Attendance</TableHead>
                <TableHead className="relative">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-secondary-300 flex items-center justify-center text-secondary-600 font-medium text-sm">
                          {getInitials(member.firstName, member.lastName)}
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="font-medium text-secondary-900">
                          {member.firstName} {member.lastName}
                        </div>
                        <div className="text-secondary-500">Joined {formatDate(member.joinDate)}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center text-secondary-500">
                        <EnvelopeIcon className="h-4 w-4 mr-2 text-secondary-400" />
                        {member.email}
                      </div>
                      {member.phone && (
                        <div className="flex items-center text-secondary-500">
                          <PhoneIcon className="h-4 w-4 mr-2 text-secondary-400" />
                          {member.phone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getMemberStatusBadge(member.memberStatus)}>
                      {member.memberStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-secondary-500">
                    {member.family?.familyName || '-'}
                  </TableCell>
                  <TableCell className="text-secondary-500">
                    {member.lastAttendance ? formatDate(member.lastAttendance) : 'Never'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => openEditForm(member)}
                    >
                      <EllipsisVerticalIcon className="h-5 w-5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <Card>
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex flex-1 justify-between sm:hidden">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-secondary-700">
                    Showing page <span className="font-medium">{currentPage}</span> of{' '}
                    <span className="font-medium">{totalPages}</span>
                  </p>
                </div>
                <div>
                  <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="rounded-r-none"
                    >
                      Previous
                    </Button>
                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
                      const page = i + 1
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "primary" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="rounded-none"
                        >
                          {page}
                        </Button>
                      )
                    })}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="rounded-l-none"
                    >
                      Next
                    </Button>
                  </nav>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Member Form Modal */}
      <MemberForm
        isOpen={showMemberForm}
        onClose={closeForm}
        onSubmit={editingMember ? handleEditMember : handleCreateMember}
        member={editingMember || undefined}
        isEditing={!!editingMember}
      />
    </Layout>
  )
}
