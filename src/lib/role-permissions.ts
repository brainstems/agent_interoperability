// Unified Role-Based Access Control System
// Integrates Church CRM 6-role system with embark2-eric 2-role system and simplified 3-role UI categories

export type DatabaseRole = 'ADMIN' | 'CLERGY' | 'STAFF' | 'VOLUNTEER' | 'MEMBER' | 'VISITOR';
export type Embark2EricRole = 'Clergy' | 'Parish';
export type UIRoleCategory = 'admin' | 'clergy' | 'lay';

// Role mapping from database roles to UI categories
export const ROLE_MAPPING: Record<DatabaseRole, UIRoleCategory> = {
  ADMIN: 'admin',
  CLERGY: 'clergy', 
  STAFF: 'lay',
  VOLUNTEER: 'lay',
  MEMBER: 'lay',
  VISITOR: 'lay'
};

// Role mapping from embark2-eric roles to UI categories
export const EMBARK2_ERIC_ROLE_MAPPING: Record<Embark2EricRole, UIRoleCategory> = {
  Clergy: 'clergy',
  Parish: 'lay'
};

// Role mapping from embark2-eric roles to database roles
export const EMBARK2_ERIC_TO_DATABASE_MAPPING: Record<Embark2EricRole, DatabaseRole> = {
  Clergy: 'CLERGY',
  Parish: 'MEMBER'
};

// Role mapping from database roles to embark2-eric roles (for migration)
export const DATABASE_TO_EMBARK2_ERIC_MAPPING: Record<DatabaseRole, Embark2EricRole> = {
  ADMIN: 'Clergy', // Admin maps to Clergy for embark2-eric compatibility
  CLERGY: 'Clergy',
  STAFF: 'Parish',
  VOLUNTEER: 'Parish', 
  MEMBER: 'Parish',
  VISITOR: 'Parish'
};

// Permission definitions for each UI role category
export interface RolePermissions {
  // Core CRM permissions
  viewMembers: boolean;
  editMembers: boolean;
  deleteMembers: boolean;
  viewFinancials: boolean;
  editFinancials: boolean;
  viewReports: boolean;
  editReports: boolean;
  
  // Event management
  viewEvents: boolean;
  createEvents: boolean;
  editEvents: boolean;
  deleteEvents: boolean;
  
  // Communication
  sendCommunications: boolean;
  viewCommunications: boolean;
  bulkCommunications: boolean;
  
  // Groups and ministries
  viewGroups: boolean;
  createGroups: boolean;
  editGroups: boolean;
  manageGroupMembers: boolean;
  
  // Pastoral care
  viewPastoralCare: boolean;
  createPastoralCare: boolean;
  editPastoralCare: boolean;
  
  // System administration
  manageUsers: boolean;
  systemSettings: boolean;
  viewAuditLogs: boolean;
  
  // AI Agent access
  viewAgents: boolean;
  configureAgents: boolean;
  manageWorkflows: boolean;
  
  // Advanced features (from embark2-eric)
  accountingAccess: boolean;
  backgroundChecks: boolean;
  facilityManagement: boolean;
  surveyBuilder: boolean;
  churchCreation: boolean;
}

export const ROLE_PERMISSIONS: Record<UIRoleCategory, RolePermissions> = {
  admin: {
    // Full access to everything
    viewMembers: true,
    editMembers: true,
    deleteMembers: true,
    viewFinancials: true,
    editFinancials: true,
    viewReports: true,
    editReports: true,
    viewEvents: true,
    createEvents: true,
    editEvents: true,
    deleteEvents: true,
    sendCommunications: true,
    viewCommunications: true,
    bulkCommunications: true,
    viewGroups: true,
    createGroups: true,
    editGroups: true,
    manageGroupMembers: true,
    viewPastoralCare: true,
    createPastoralCare: true,
    editPastoralCare: true,
    manageUsers: true,
    systemSettings: true,
    viewAuditLogs: true,
    viewAgents: true,
    configureAgents: true,
    manageWorkflows: true,
    accountingAccess: true,
    backgroundChecks: true,
    facilityManagement: true,
    surveyBuilder: true,
    churchCreation: true,
  },
  
  clergy: {
    // Pastoral and management access (matches embark2-eric "Clergy" role)
    viewMembers: true,
    editMembers: true,
    deleteMembers: false,
    viewFinancials: true,
    editFinancials: true,
    viewReports: true,
    editReports: true,
    viewEvents: true,
    createEvents: true,
    editEvents: true,
    deleteEvents: true,
    sendCommunications: true,
    viewCommunications: true,
    bulkCommunications: true,
    viewGroups: true,
    createGroups: true,
    editGroups: true,
    manageGroupMembers: true,
    viewPastoralCare: true,
    createPastoralCare: true,
    editPastoralCare: true,
    manageUsers: false,
    systemSettings: false,
    viewAuditLogs: false,
    viewAgents: true,
    configureAgents: false,
    manageWorkflows: true,
    accountingAccess: true,
    backgroundChecks: true,
    facilityManagement: false,
    surveyBuilder: true,
    churchCreation: true,
  },
  
  lay: {
    // Basic access for members, volunteers, staff, parish (matches embark2-eric "Parish" role)
    viewMembers: true,
    editMembers: false,
    deleteMembers: false,
    viewFinancials: false,
    editFinancials: false,
    viewReports: false,
    editReports: false,
    viewEvents: true,
    createEvents: false,
    editEvents: false,
    deleteEvents: false,
    sendCommunications: false,
    viewCommunications: true,
    bulkCommunications: false,
    viewGroups: true,
    createGroups: false,
    editGroups: false,
    manageGroupMembers: false,
    viewPastoralCare: false,
    createPastoralCare: false,
    editPastoralCare: false,
    manageUsers: false,
    systemSettings: false,
    viewAuditLogs: false,
    viewAgents: false,
    configureAgents: false,
    manageWorkflows: false,
    accountingAccess: false,
    backgroundChecks: false,
    facilityManagement: false,
    surveyBuilder: false,
    churchCreation: false,
  }
};

// Enhanced permissions for specific database roles within lay category
export const ENHANCED_LAY_PERMISSIONS: Partial<Record<DatabaseRole, Partial<RolePermissions>>> = {
  STAFF: {
    createEvents: true,
    editEvents: true,
    sendCommunications: true,
    viewReports: true,
  },
  VOLUNTEER: {
    createEvents: true,
    editEvents: true,
  }
};

// Utility functions for Church CRM database roles
export function getDatabaseRoleFromProfile(profile: { role: string }): DatabaseRole {
  return profile.role as DatabaseRole;
}

export function getUIRoleCategoryFromDatabase(databaseRole: DatabaseRole): UIRoleCategory {
  return ROLE_MAPPING[databaseRole];
}

// Utility functions for embark2-eric roles
export function getEmbark2EricRoleFromProfile(profile: { role: string }): Embark2EricRole {
  return profile.role as Embark2EricRole;
}

export function getUIRoleCategoryFromEmbark2Eric(embark2EricRole: Embark2EricRole): UIRoleCategory {
  return EMBARK2_ERIC_ROLE_MAPPING[embark2EricRole];
}

// Universal role detection and permission getter
export function getRolePermissions(role: string): RolePermissions {
  // Handle null/undefined roles
  if (!role) {
    return ROLE_PERMISSIONS['lay'];
  }
  
  const roleString = role;
  
  // Try to detect if it's a database role (UPPERCASE) or embark2-eric role (Capitalized)
  let uiCategory: UIRoleCategory;
  
  if (roleString === roleString.toUpperCase() && Object.keys(ROLE_MAPPING).includes(roleString)) {
    // Database role (UPPERCASE)
    const databaseRole = roleString as DatabaseRole;
    uiCategory = getUIRoleCategoryFromDatabase(databaseRole);
    
    // Apply enhanced permissions for specific database roles
    if (uiCategory === 'lay' && ENHANCED_LAY_PERMISSIONS[databaseRole]) {
      return {
        ...ROLE_PERMISSIONS[uiCategory],
        ...ENHANCED_LAY_PERMISSIONS[databaseRole]
      };
    }
  } else if (Object.keys(EMBARK2_ERIC_ROLE_MAPPING).includes(roleString)) {
    // Embark2-eric role (Capitalized)
    const embark2EricRole = roleString as Embark2EricRole;
    uiCategory = getUIRoleCategoryFromEmbark2Eric(embark2EricRole);
  } else {
    // Fallback to lay permissions for unknown roles
    uiCategory = 'lay';
  }
  
  return ROLE_PERMISSIONS[uiCategory];
}

export function hasPermission(
  profile: { role: DatabaseRole | string; custom_fields?: any } | null,
  permission: keyof RolePermissions
): boolean {
  if (!profile) return false;
  
  const rolePermissions = getRolePermissions(profile.role.toString());
  
  // Check if user has demo mode for enhanced permissions
  if (profile.custom_fields?.demo_mode) {
    return true; // Demo mode grants all permissions
  }
  
  return rolePermissions[permission] === true;
}

// Get all permissions for a user profile
export function getUserPermissions(profile: { role: DatabaseRole | string; custom_fields?: any } | null): (keyof RolePermissions)[] {
  if (!profile) return [];
  
  const rolePermissions = getRolePermissions(profile.role.toString());
  
  // Get all permissions that are set to true
  const permissions = Object.entries(rolePermissions)
    .filter(([_, hasAccess]) => hasAccess === true)
    .map(([permission, _]) => permission as keyof RolePermissions);
  
  // Add demo mode permissions if applicable
  if (profile.custom_fields?.demo_mode) {
    // Demo mode gets all permissions
    return Object.keys(rolePermissions) as (keyof RolePermissions)[];
  }
  
  return permissions;
}

// Get role display information
export function getRoleDisplayInfo(role: UIRoleCategory): { category: UIRoleCategory; display: string; color: string } {
  const displayMap = {
    admin: { category: 'admin' as UIRoleCategory, display: 'Administrator', color: 'bg-red-100 text-red-800' },
    clergy: { category: 'clergy' as UIRoleCategory, display: 'Clergy', color: 'bg-blue-100 text-blue-800' },
    lay: { category: 'lay' as UIRoleCategory, display: 'Member', color: 'bg-green-100 text-green-800' }
  };
  
  return displayMap[role] || displayMap.lay;
}

// Role-based styling helpers (integrating embark2-eric approach)
export function getRoleColorScheme(role: string) {
  const uiCategory = role === role.toUpperCase() && Object.keys(ROLE_MAPPING).includes(role)
    ? getUIRoleCategoryFromDatabase(role as DatabaseRole)
    : getUIRoleCategoryFromEmbark2Eric(role as Embark2EricRole);
    
  switch (uiCategory) {
    case 'admin':
      return {
        primary: 'bg-red-600 text-white',
        secondary: 'bg-red-100 text-red-800',
        accent: 'border-red-500',
        hover: 'hover:bg-red-700'
      };
    case 'clergy':
      return {
        primary: 'bg-blue-600 text-white',
        secondary: 'bg-blue-100 text-blue-800', 
        accent: 'border-blue-500',
        hover: 'hover:bg-blue-700'
      };
    case 'lay':
      return {
        primary: 'bg-green-600 text-white',
        secondary: 'bg-green-100 text-green-800',
        accent: 'border-green-500', 
        hover: 'hover:bg-green-700'
      };
  }
}

// Demo mode integration (from embark2-eric)
export function shouldGrantEnhancedAccess(
  role: string,
  isDemoMode: boolean = false
): boolean {
  if (isDemoMode && (role === 'CLERGY' || role === 'Clergy')) {
    return true; // Grant enhanced access in demo mode
  }
  return role === 'ADMIN' || role === 'Clergy';
}

// Migration helpers
export function migrateEmbark2EricRoleToDatabase(embark2EricRole: Embark2EricRole): DatabaseRole {
  return EMBARK2_ERIC_TO_DATABASE_MAPPING[embark2EricRole];
}

export function migrateDatabaseRoleToEmbark2Eric(databaseRole: DatabaseRole): Embark2EricRole {
  return DATABASE_TO_EMBARK2_ERIC_MAPPING[databaseRole];
}

// Navigation helpers (from embark2-eric pattern)
export function getHomeRouteForRole(role: string): string {
  const uiCategory = role === role.toUpperCase() && Object.keys(ROLE_MAPPING).includes(role)
    ? getUIRoleCategoryFromDatabase(role as DatabaseRole)
    : getUIRoleCategoryFromEmbark2Eric(role as Embark2EricRole);
    
  switch (uiCategory) {
    case 'admin':
      return '/admin-home';
    case 'clergy':
      return '/clergy-home';
    case 'lay':
      return '/parish-home';
    default:
      return '/dashboard';
  }
}

// Export Permission type after RolePermissions interface is defined
export type Permission = keyof RolePermissions;

// Main mapping function used by components
export function mapDatabaseRoleToUI(role: DatabaseRole | string): UIRoleCategory {
  if (typeof role === 'string') {
    // Handle both database roles and embark2-eric roles
    if (role === role.toUpperCase() && Object.keys(ROLE_MAPPING).includes(role)) {
      return ROLE_MAPPING[role as DatabaseRole];
    } else if (Object.keys(EMBARK2_ERIC_ROLE_MAPPING).includes(role)) {
      return EMBARK2_ERIC_ROLE_MAPPING[role as Embark2EricRole];
    } else {
      return 'lay'; // Default fallback
    }
  }
  return ROLE_MAPPING[role];
}