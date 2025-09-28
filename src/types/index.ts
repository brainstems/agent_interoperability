import { 
  User, 
  Member, 
  Church, 
  Group, 
  Event, 
  Donation, 
  Communication, 
  CheckIn,
  UserRole,
  Gender,
  MaritalStatus,
  MemberStatus,
  GroupType,
  EventType,
  PaymentMethod,
  CommunicationType,
  CommunicationStatus
} from '@prisma/client'

// Extended types with relations
export interface MemberWithRelations extends Member {
  user?: User | null
  church: Church
  familyMembers?: any[]
  groupMembers?: any[]
  donations?: Donation[]
  eventRegistrations?: any[]
  eventAttendance?: any[]
  checkIns?: CheckIn[]
  communicationRecipients?: any[]
  notes?: any[]
  backgroundChecks?: any[]
  volunteerAssignments?: any[]
  _count?: {
    donations: number
    checkIns: number
    groupMembers: number
    notes?: number
  }
}

export interface GroupWithRelations extends Group {
  church: Church
  members?: any[]
  leaders?: any[]
  _count?: {
    members: number
    leaders?: number
  }
}

export interface EventWithRelations extends Event {
  church: Church
  registrations?: any[]
  attendance?: any[]
  checkIns?: CheckIn[]
  _count?: {
    registrations: number
    attendance: number
    checkIns: number
  }
}

export interface DonationWithRelations extends Donation {
  church: Church
  member: Member
  fund: any
}

export interface CommunicationWithRelations extends Communication {
  church: Church
  sender: User
  recipients?: any[]
  _count?: {
    recipients: number
  }
}

export interface CheckInWithRelations extends CheckIn {
  church: Church
  member: Member
  event: Event
  checkedInBy: User
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Form Types
export interface CreateMemberForm {
  firstName: string
  lastName: string
  email?: string
  phone?: string
  address?: string
  birthDate?: string
  gender?: Gender
  maritalStatus?: MaritalStatus
  memberStatus?: MemberStatus
  customFields?: Record<string, any>
}

export interface CreateGroupForm {
  name: string
  description?: string
  groupType: GroupType
  meetingSchedule?: string
  location?: string
  isActive?: boolean
}

export interface CreateEventForm {
  title: string
  description?: string
  startDateTime: string
  endDateTime: string
  location?: string
  eventType: EventType
  registrationRequired?: boolean
  maxAttendees?: number
}

export interface CreateDonationForm {
  memberId: string
  fundId: string
  amount: number
  donationDate: string
  paymentMethod: PaymentMethod
  checkNumber?: string
  notes?: string
  isRecurring?: boolean
}

export interface CreateCommunicationForm {
  subject: string
  content: string
  communicationType: CommunicationType
  recipientIds: string[]
  scheduledFor?: string
}

export interface CreateCheckInForm {
  memberId: string
  eventId: string
  securityCode?: string
  notes?: string
}

// Dashboard Types
export interface DashboardStats {
  overview: {
    totalMembers: number
    newMembersThisPeriod: number
    activeGroups: number
    upcomingEvents: number
    recentCheckIns: number
    recentCommunications: number
  }
  memberStats: Record<string, number>
  donationStats: {
    totalThisPeriod: number
    countThisPeriod: number
    totalAllTime: number
    trends: any[]
  }
  topDonors: any[]
  recentEvents: any[]
  attendanceTrends: any[]
  groupStats: {
    totalActive: number
    membershipDistribution: any[]
  }
}

// Event Types
export interface EventData {
  type: string
  payload: any
  timestamp: Date
  source: string
}

// Search and Filter Types
export interface MemberFilters {
  memberStatus?: MemberStatus[]
  gender?: Gender[]
  maritalStatus?: MaritalStatus[]
  groupId?: string
  ageRange?: [number, number]
}

export interface GroupFilters {
  groupType?: GroupType[]
  isActive?: boolean
}

export interface EventFilters {
  eventType?: EventType[]
  location?: string
  dateRange?: [string, string]
}

export interface DonationFilters {
  fundId?: string
  memberId?: string
  paymentMethod?: PaymentMethod[]
  dateRange?: [string, string]
  amountRange?: [number, number]
}

export interface CommunicationFilters {
  communicationType?: CommunicationType[]
  status?: CommunicationStatus[]
  dateRange?: [string, string]
}

export interface CheckInFilters {
  eventId?: string
  memberId?: string
  dateRange?: [string, string]
}

// Authentication Types
export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  role?: UserRole
  churchName?: string
  churchAddress?: string
  churchPhone?: string
  churchEmail?: string
}

export interface AuthUser extends User {
  memberProfile?: Member | null
}

export interface AuthResponse {
  user: AuthUser
  token: string
}

// Utility Types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>
