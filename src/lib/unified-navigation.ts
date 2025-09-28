// Unified Navigation System for Multi-Codebase Integration
// Integrates embark2-eric, spark-fellowship, vocal-connect-ai, and windsurf-project

import { UIRoleCategory, hasPermission } from './role-permissions';

export interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  description: string;
  requiredPermissions?: string[];
  external?: boolean;
  externalUrl?: string;
  codebase?: 'embark2-eric' | 'spark-fellowship' | 'vocal-connect' | 'windsurf-project';
  category: 'discernment' | 'financial' | 'social' | 'pastoral' | 'crm' | 'admin';
}

export interface NavigationSection {
  id: string;
  label: string;
  icon: string;
  items: NavigationItem[];
  roleAccess: UIRoleCategory[];
}

// Comprehensive navigation structure organized by functional categories
export const UNIFIED_NAVIGATION: NavigationSection[] = [
  {
    id: 'discernment',
    label: 'Discernment & Planning',
    icon: 'compass',
    roleAccess: ['admin', 'clergy'],
    items: [
      {
        id: 'church-assessment',
        label: 'Church Assessment',
        icon: 'clipboard-check',
        path: '/church-assessment',
        description: 'Comprehensive church health and capacity assessment',
        requiredPermissions: ['surveyBuilder'],
        external: true,
        codebase: 'embark2-eric',
        category: 'discernment'
      },
      {
        id: 'community-assessment',
        label: 'Community Assessment',
        icon: 'users',
        path: '/community-assessment',
        description: 'Analyze community demographics and needs',
        requiredPermissions: ['surveyBuilder'],
        external: true,
        codebase: 'embark2-eric',
        category: 'discernment'
      },
      {
        id: 'research-summary',
        label: 'Research Summary',
        icon: 'chart-bar',
        path: '/research-summary',
        description: 'Compiled research insights and recommendations',
        requiredPermissions: ['viewReports'],
        external: true,
        codebase: 'embark2-eric',
        category: 'discernment'
      },
      {
        id: 'narrative-build',
        label: 'Mission Statement Builder',
        icon: 'document-text',
        path: '/narrative-build',
        description: 'AI-assisted mission statement and vision development',
        requiredPermissions: ['surveyBuilder'],
        external: true,
        codebase: 'embark2-eric',
        category: 'discernment'
      },
      {
        id: 'strategic-planning',
        label: 'Strategic Planning',
        icon: 'map',
        path: '/plan-build',
        description: 'Comprehensive strategic plan development',
        requiredPermissions: ['surveyBuilder'],
        external: true,
        codebase: 'embark2-eric',
        category: 'discernment'
      }
    ]
  },
  {
    id: 'financial',
    label: 'Financial Management',
    icon: 'currency-dollar',
    roleAccess: ['admin', 'clergy'],
    items: [
      {
        id: 'giving-management',
        label: 'Giving & Donations',
        icon: 'gift',
        path: '/giving',
        description: 'Track donations, pledges, and giving patterns',
        requiredPermissions: ['viewFinancials'],
        codebase: 'windsurf-project',
        category: 'financial'
      },
      {
        id: 'pledges',
        label: 'Pledge Management',
        icon: 'handshake',
        path: '/pledges',
        description: 'Manage member pledges and commitments',
        requiredPermissions: ['viewFinancials'],
        codebase: 'windsurf-project',
        category: 'financial'
      },
      {
        id: 'accounting',
        label: 'Accounting Suite',
        icon: 'calculator',
        path: '/accounting',
        description: 'Full accounting and financial reporting',
        requiredPermissions: ['accountingAccess'],
        external: true,
        codebase: 'embark2-eric',
        category: 'financial'
      },
      {
        id: 'fundraising',
        label: 'Fundraising Campaigns',
        icon: 'trending-up',
        path: '/crowdfunding-marketplace',
        description: 'Create and manage fundraising campaigns',
        requiredPermissions: ['accountingAccess'],
        external: true,
        codebase: 'embark2-eric',
        category: 'financial'
      }
    ]
  },
  {
    id: 'social',
    label: 'Fellowship & Community',
    icon: 'user-group',
    roleAccess: ['admin', 'clergy', 'lay'],
    items: [
      {
        id: 'my-profile',
        label: 'My Profile',
        icon: 'user-circle',
        path: '/my-profile',
        description: 'Manage personal profile and connections',
        external: true,
        codebase: 'spark-fellowship',
        category: 'social'
      },
      {
        id: 'connections',
        label: 'Community Connections',
        icon: 'link',
        path: '/connections',
        description: 'Discover and connect with other members',
        external: true,
        codebase: 'spark-fellowship',
        category: 'social'
      },
      {
        id: 'ministry-involvement',
        label: 'Ministry Involvement',
        icon: 'heart',
        path: '/ministry',
        description: 'Find and join ministry opportunities',
        external: true,
        codebase: 'spark-fellowship',
        category: 'social'
      },
      {
        id: 'content-library',
        label: 'Resource Library',
        icon: 'book-open',
        path: '/content-library',
        description: 'Access spiritual resources and content',
        external: true,
        codebase: 'spark-fellowship',
        category: 'social'
      },
      {
        id: 'fellowship-crm',
        label: 'Fellowship Management',
        icon: 'users',
        path: '/fellowship',
        description: 'Manage fellowship groups and activities',
        requiredPermissions: ['viewGroups'],
        codebase: 'windsurf-project',
        category: 'social'
      }
    ]
  },
  {
    id: 'pastoral',
    label: 'Pastoral Care',
    icon: 'heart',
    roleAccess: ['admin', 'clergy'],
    items: [
      {
        id: 'pastoral-care-crm',
        label: 'Pastoral Care Tracking',
        icon: 'clipboard-heart',
        path: '/pastoral-care',
        description: 'Track pastoral visits and care activities',
        requiredPermissions: ['viewPastoralCare'],
        codebase: 'windsurf-project',
        category: 'pastoral'
      },
      {
        id: 'call-processing',
        label: 'Enhanced Call Processing',
        icon: 'phone',
        path: '/call-processing',
        description: 'AI-powered call management and follow-up',
        requiredPermissions: ['viewPastoralCare'],
        external: true,
        codebase: 'vocal-connect',
        category: 'pastoral'
      },
      {
        id: 'micro-volunteering',
        label: 'Micro-Volunteering',
        icon: 'hand-raised',
        path: '/micro-volunteering',
        description: 'Coordinate small volunteer opportunities',
        requiredPermissions: ['viewPastoralCare'],
        external: true,
        codebase: 'vocal-connect',
        category: 'pastoral'
      },
      {
        id: 'volunteer-onboarding',
        label: 'Volunteer Onboarding',
        icon: 'user-plus',
        path: '/volunteer-onboarding',
        description: 'Streamlined volunteer recruitment and training',
        requiredPermissions: ['manageGroupMembers'],
        external: true,
        codebase: 'vocal-connect',
        category: 'pastoral'
      }
    ]
  },
  {
    id: 'crm',
    label: 'Church Management',
    icon: 'building-office',
    roleAccess: ['admin', 'clergy'],
    items: [
      {
        id: 'dashboard',
        label: 'CRM Dashboard',
        icon: 'chart-pie',
        path: '/dashboard',
        description: 'Overview of church metrics and activities',
        requiredPermissions: ['viewReports'],
        codebase: 'windsurf-project',
        category: 'crm'
      },
      {
        id: 'members',
        label: 'Member Management',
        icon: 'users',
        path: '/members',
        description: 'Comprehensive member database and tracking',
        requiredPermissions: ['viewMembers'],
        codebase: 'windsurf-project',
        category: 'crm'
      },
      {
        id: 'events',
        label: 'Event Management',
        icon: 'calendar',
        path: '/events',
        description: 'Plan, schedule, and manage church events',
        requiredPermissions: ['viewEvents'],
        codebase: 'windsurf-project',
        category: 'crm'
      },
      {
        id: 'groups',
        label: 'Group Management',
        icon: 'user-group',
        path: '/groups',
        description: 'Manage small groups and ministries',
        requiredPermissions: ['viewGroups'],
        codebase: 'windsurf-project',
        category: 'crm'
      },
      {
        id: 'communications',
        label: 'Communications',
        icon: 'mail',
        path: '/communications',
        description: 'Send emails, SMS, and announcements',
        requiredPermissions: ['sendCommunications'],
        codebase: 'windsurf-project',
        category: 'crm'
      },
      {
        id: 'tasks',
        label: 'Task Management',
        icon: 'check-circle',
        path: '/tasks',
        description: 'Track follow-ups and administrative tasks',
        requiredPermissions: ['viewPastoralCare'],
        codebase: 'windsurf-project',
        category: 'crm'
      },
      {
        id: 'contact-history',
        label: 'Contact History',
        icon: 'clock',
        path: '/contact-history',
        description: 'Track all member interactions and communications',
        requiredPermissions: ['viewMembers'],
        codebase: 'windsurf-project',
        category: 'crm'
      },
      {
        id: 'photos',
        label: 'Photo Management',
        icon: 'camera',
        path: '/photos',
        description: 'Organize and share church photos and media',
        requiredPermissions: ['viewEvents'],
        codebase: 'windsurf-project',
        category: 'crm'
      }
    ]
  },
  {
    id: 'admin',
    label: 'Administration',
    icon: 'cog',
    roleAccess: ['admin'],
    items: [
      {
        id: 'workflows',
        label: 'Workflow Automation',
        icon: 'arrows-right-left',
        path: '/workflows',
        description: 'Automate church processes and communications',
        requiredPermissions: ['manageWorkflows'],
        codebase: 'windsurf-project',
        category: 'admin'
      },
      {
        id: 'user-management',
        label: 'User Management',
        icon: 'users-cog',
        path: '/admin',
        description: 'Manage user accounts and permissions',
        requiredPermissions: ['manageUsers'],
        external: true,
        codebase: 'spark-fellowship',
        category: 'admin'
      },
      {
        id: 'custom-fields',
        label: 'Custom Fields',
        icon: 'squares-plus',
        path: '/admin/custom-fields',
        description: 'Manage custom field definitions and validation',
        requiredPermissions: ['systemSettings'],
        codebase: 'windsurf-project',
        category: 'admin'
      },
      {
        id: 'tags-automation',
        label: 'Tags & Automation',
        icon: 'tag',
        path: '/admin/tags',
        description: 'Manage tags and automated tagging rules',
        requiredPermissions: ['systemSettings'],
        codebase: 'windsurf-project',
        category: 'admin'
      },
      {
        id: 'audit-logs',
        label: 'Audit & Security',
        icon: 'shield-check',
        path: '/admin/audit',
        description: 'Monitor system activities and security events',
        requiredPermissions: ['systemSettings'],
        codebase: 'windsurf-project',
        category: 'admin'
      },
      {
        id: 'smart-lists',
        label: 'Smart Lists',
        icon: 'list-bullet',
        path: '/admin/smart-lists',
        description: 'Create dynamic member lists with custom criteria',
        requiredPermissions: ['systemSettings'],
        codebase: 'windsurf-project',
        category: 'admin'
      },
      {
        id: 'permissions',
        label: 'Permissions & Access',
        icon: 'key',
        path: '/admin/permissions',
        description: 'Manage user roles, permissions, and access controls',
        requiredPermissions: ['manageUsers'],
        codebase: 'windsurf-project',
        category: 'admin'
      },
      {
        id: 'system-settings',
        label: 'System Settings',
        icon: 'adjustments',
        path: '/settings',
        description: 'Configure system-wide settings and preferences',
        requiredPermissions: ['systemSettings'],
        codebase: 'windsurf-project',
        category: 'admin'
      }
    ]
  }
];

// Role-based home page routing
export function getHomePageForRole(role: string): string {
  const uiCategory = role === role.toUpperCase() ? 
    (role === 'ADMIN' ? 'admin' : role === 'CLERGY' ? 'clergy' : 'lay') :
    (role === 'Clergy' ? 'clergy' : 'lay');
    
  switch (uiCategory) {
    case 'admin':
      return '/dashboard'; // CRM dashboard for admins
    case 'clergy':
      return '/clergy-home'; // Embark2-eric clergy home with integrated navigation
    case 'lay':
      return '/parish-home'; // Embark2-eric parish home with social features
    default:
      return '/dashboard';
  }
}

// Filter navigation items based on user role and permissions
export function getNavigationForRole(role: string): NavigationSection[] {
  const uiCategory = role === role.toUpperCase() ? 
    (role === 'ADMIN' ? 'admin' : role === 'CLERGY' ? 'clergy' : 'lay') :
    (role === 'Clergy' ? 'clergy' : 'lay');
    
  return UNIFIED_NAVIGATION
    .filter(section => section.roleAccess.includes(uiCategory))
    .map(section => ({
      ...section,
      items: section.items.filter(item => {
        // For now, just filter by role access since we don't have profile context
        // Permission checking will be done at the component level
        return true;
      })
    }))
    .filter(section => section.items.length > 0);
}

// Filter navigation items based on user role and permissions with profile
export function getFilteredNavigation(role: string, profile: any = null): NavigationSection[] {
  const uiCategory = role === role.toUpperCase() ? 
    (role === 'ADMIN' ? 'admin' : role === 'CLERGY' ? 'clergy' : 'lay') :
    (role === 'Clergy' ? 'clergy' : 'lay');
    
  return UNIFIED_NAVIGATION
    .filter(section => section.roleAccess.includes(uiCategory))
    .map(section => ({
      ...section,
      items: section.items.filter(item => {
        if (!item.requiredPermissions) return true;
        if (!profile) return true; // Allow access if no profile provided
        return item.requiredPermissions.every(permission =>
          hasPermission(profile, permission as any)
        );
      })
    }))
    .filter(section => section.items.length > 0);
}

// Generate external URLs for cross-codebase navigation
export function getExternalUrl(item: NavigationItem): string {
  const baseUrls = {
    'embark2-eric': process.env.NEXT_PUBLIC_EMBARK2_ERIC_URL || 'http://localhost:5173',
    'spark-fellowship': process.env.NEXT_PUBLIC_SPARK_FELLOWSHIP_URL || 'http://localhost:5174',
    'vocal-connect': process.env.NEXT_PUBLIC_VOCAL_CONNECT_URL || 'http://localhost:5175',
    'windsurf-project': process.env.NEXT_PUBLIC_WINDSURF_PROJECT_URL || 'http://localhost:3000'
  };
  
  if (item.external && item.codebase) {
    return `${baseUrls[item.codebase]}${item.path}`;
  }
  
  return item.path;
}

// Quick access items for dashboard widgets
export const QUICK_ACCESS_ITEMS = {
  clergy: [
    'church-assessment',
    'members',
    'pastoral-care-crm',
    'events',
    'giving-management'
  ],
  lay: [
    'my-profile',
    'connections',
    'ministry-involvement',
    'events',
    'content-library'
  ],
  admin: [
    'dashboard',
    'members',
    'workflows',
    'user-management',
    'system-settings'
  ]
};

// Navigation breadcrumbs for cross-codebase context
export interface BreadcrumbItem {
  label: string;
  path: string;
  external?: boolean;
}

export function generateBreadcrumbs(currentPath: string, codebase?: string): BreadcrumbItem[] {
  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Home', path: '/' }
  ];
  
  // Find the current navigation item
  const allItems = UNIFIED_NAVIGATION.flatMap(section => section.items);
  const currentItem = allItems.find(item => item.path === currentPath);
  
  if (currentItem) {
    const section = UNIFIED_NAVIGATION.find(s => s.items.includes(currentItem));
    if (section) {
      breadcrumbs.push({
        label: section.label,
        path: `/${section.id}`,
        external: currentItem.external
      });
    }
    
    breadcrumbs.push({
      label: currentItem.label,
      path: currentItem.path,
      external: currentItem.external
    });
  }
  
  return breadcrumbs;
}


// Get appropriate home route based on user role
export function getHomeRouteForRole(role: UIRoleCategory): string {
  switch (role) {
    case 'admin':
    case 'clergy':
    case 'lay':
      return '/dashboard';
    default:
      return '/dashboard';
  }
}

// Get icon component from icon name
export function getIconComponent(iconName: string): React.ComponentType<React.SVGProps<SVGSVGElement>> {
  // Import heroicons dynamically based on icon name
  const iconMap: Record<string, any> = {
    'home': require('@heroicons/react/24/outline').HomeIcon,
    'users': require('@heroicons/react/24/outline').UsersIcon,
    'calendar': require('@heroicons/react/24/outline').CalendarIcon,
    'currency-dollar': require('@heroicons/react/24/outline').CurrencyDollarIcon,
    'user-group': require('@heroicons/react/24/outline').UserGroupIcon,
    'chat-bubble-left-right': require('@heroicons/react/24/outline').ChatBubbleLeftRightIcon,
    'clipboard-document-check': require('@heroicons/react/24/outline').ClipboardDocumentCheckIcon,
    'chart-bar': require('@heroicons/react/24/outline').ChartBarIcon,
    'cog': require('@heroicons/react/24/outline').CogIcon,
    'heart': require('@heroicons/react/24/outline').HeartIcon,
    'book-open': require('@heroicons/react/24/outline').BookOpenIcon,
    'megaphone': require('@heroicons/react/24/outline').MegaphoneIcon,
    'shield-check': require('@heroicons/react/24/outline').ShieldCheckIcon,
    'academic-cap': require('@heroicons/react/24/outline').AcademicCapIcon,
    'hand-raised': require('@heroicons/react/24/outline').HandRaisedIcon,
    'clipboard-check': require('@heroicons/react/24/outline').ClipboardDocumentCheckIcon,
    'compass': require('@heroicons/react/24/outline').CompassIcon,
    'light-bulb': require('@heroicons/react/24/outline').LightBulbIcon,
    'document-text': require('@heroicons/react/24/outline').DocumentTextIcon,
    'banknotes': require('@heroicons/react/24/outline').BanknotesIcon,
    'calculator': require('@heroicons/react/24/outline').CalculatorIcon,
    'presentation-chart-line': require('@heroicons/react/24/outline').PresentationChartLineIcon,
    'phone': require('@heroicons/react/24/outline').PhoneIcon,
    'envelope': require('@heroicons/react/24/outline').EnvelopeIcon,
    'user-circle': require('@heroicons/react/24/outline').UserCircleIcon,
    'link': require('@heroicons/react/24/outline').LinkIcon,
    'building-office': require('@heroicons/react/24/outline').BuildingOfficeIcon,
    'photo': require('@heroicons/react/24/outline').PhotoIcon,
    'clipboard-document-list': require('@heroicons/react/24/outline').ClipboardDocumentListIcon,
    'squares-plus': require('@heroicons/react/24/outline').Squares2X2Icon,
    'cpu-chip': require('@heroicons/react/24/outline').CpuChipIcon,
    'wrench-screwdriver': require('@heroicons/react/24/outline').WrenchScrewdriverIcon,
    'tag': require('@heroicons/react/24/outline').TagIcon,
    'chart-pie': require('@heroicons/react/24/outline').ChartPieIcon,
    'gift': require('@heroicons/react/24/outline').GiftIcon,
    'handshake': require('@heroicons/react/24/outline').HandshakeIcon,
    'trending-up': require('@heroicons/react/24/outline').TrendingUpIcon,
    'clipboard-heart': require('@heroicons/react/24/outline').HeartIcon,
    'user-plus': require('@heroicons/react/24/outline').UserPlusIcon,
    'check-circle': require('@heroicons/react/24/outline').CheckCircleIcon,
    'clock': require('@heroicons/react/24/outline').ClockIcon,
    'camera': require('@heroicons/react/24/outline').CameraIcon,
    'arrows-right-left': require('@heroicons/react/24/outline').ArrowsRightLeftIcon,
    'users-cog': require('@heroicons/react/24/outline').UsersIcon,
    'mail': require('@heroicons/react/24/outline').EnvelopeIcon,
    'map': require('@heroicons/react/24/outline').MapIcon,
    'adjustments': require('@heroicons/react/24/outline').AdjustmentsHorizontalIcon,
    'list-bullet': require('@heroicons/react/24/outline').ListBulletIcon,
    'key': require('@heroicons/react/24/outline').KeyIcon
  };
  
  return iconMap[iconName] || require('@heroicons/react/24/outline').QuestionMarkCircleIcon;
}
