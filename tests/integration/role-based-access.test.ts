import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { 
  mapDatabaseRoleToUI,
  hasPermission,
  getUserPermissions,
  getRoleDisplayInfo,
  DatabaseRole,
  UIRoleCategory,
  Permission
} from '@/lib/role-permissions'
import { 
  getFilteredNavigation,
  getHomeRouteForRole,
  UNIFIED_NAVIGATION
} from '@/lib/unified-navigation'

// Mock profile data for different roles
const createMockProfile = (role: DatabaseRole) => ({
  id: 'test-user-id',
  church_id: 'test-church-id',
  first_name: 'Test',
  last_name: 'User',
  email: 'test@example.com',
  phone: null,
  address: null,
  birth_date: null,
  gender: null,
  marital_status: null,
  member_status: 'ACTIVE',
  join_date: null,
  role,
  bio: null,
  photo_url: null,
  interests: null,
  life_events: null,
  connection_preferences: null,
  embedding: null,
  custom_fields: null,
  is_active: true,
  last_login: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
})

describe('Role-Based Access Control System', () => {
  describe('Role Mapping', () => {
    it('should map database roles to UI categories correctly', () => {
      expect(mapDatabaseRoleToUI('ADMIN')).toBe('admin')
      expect(mapDatabaseRoleToUI('CLERGY')).toBe('clergy')
      expect(mapDatabaseRoleToUI('STAFF')).toBe('lay')
      expect(mapDatabaseRoleToUI('VOLUNTEER')).toBe('lay')
      expect(mapDatabaseRoleToUI('MEMBER')).toBe('lay')
      expect(mapDatabaseRoleToUI('VISITOR')).toBe('lay')
    })

    it('should handle invalid roles gracefully', () => {
      expect(mapDatabaseRoleToUI('INVALID' as DatabaseRole)).toBe('lay')
    })
  })

  describe('Permission System', () => {
    const adminProfile = createMockProfile('ADMIN')
    const clergyProfile = createMockProfile('CLERGY')
    const memberProfile = createMockProfile('MEMBER')

    it('should grant admin users all permissions', () => {
      const adminPermissions = getUserPermissions(adminProfile)
      expect(adminPermissions).toContain('crm.members.view')
      expect(adminPermissions).toContain('crm.events.manage')
      expect(adminPermissions).toContain('admin.users.manage')
      expect(adminPermissions).toContain('financial.giving.view')
    })

    it('should grant clergy appropriate permissions', () => {
      const clergyPermissions = getUserPermissions(clergyProfile)
      expect(clergyPermissions).toContain('crm.members.view')
      expect(clergyPermissions).toContain('pastoral.care.manage')
      expect(clergyPermissions).toContain('communications.send')
      expect(clergyPermissions).not.toContain('admin.users.manage')
    })

    it('should grant members limited permissions', () => {
      const memberPermissions = getUserPermissions(memberProfile)
      expect(memberPermissions).toContain('crm.events.view')
      expect(memberPermissions).toContain('crm.groups.view')
      expect(memberPermissions).not.toContain('crm.members.view')
      expect(memberPermissions).not.toContain('financial.giving.view')
    })

    it('should check individual permissions correctly', () => {
      expect(hasPermission(adminProfile, 'admin.users.manage')).toBe(true)
      expect(hasPermission(clergyProfile, 'pastoral.care.manage')).toBe(true)
      expect(hasPermission(memberProfile, 'admin.users.manage')).toBe(false)
    })
  })

  describe('Navigation System', () => {
    it('should filter navigation items based on user role', () => {
      const adminProfile = createMockProfile('ADMIN')
      const clergyProfile = createMockProfile('CLERGY')
      const memberProfile = createMockProfile('MEMBER')

      const adminNav = getFilteredNavigation('admin', adminProfile)
      const clergyNav = getFilteredNavigation('clergy', clergyProfile)
      const memberNav = getFilteredNavigation('lay', memberProfile)

      // Admin should see all navigation items
      expect(adminNav.length).toBeGreaterThan(clergyNav.length)
      expect(adminNav.length).toBeGreaterThan(memberNav.length)

      // Check specific navigation items
      const adminNavIds = adminNav.map(item => item.id)
      const clergyNavIds = clergyNav.map(item => item.id)
      const memberNavIds = memberNav.map(item => item.id)

      expect(adminNavIds).toContain('admin-users')
      expect(clergyNavIds).not.toContain('admin-users')
      expect(memberNavIds).not.toContain('admin-users')

      expect(clergyNavIds).toContain('pastoral-care')
      expect(memberNavIds).not.toContain('pastoral-care')
    })

    it('should provide correct home routes for different roles', () => {
      expect(getHomeRouteForRole('admin')).toBe('/dashboard')
      expect(getHomeRouteForRole('clergy')).toBe('/dashboard')
      expect(getHomeRouteForRole('lay')).toBe('/dashboard')
    })

    it('should include external navigation items with proper URLs', () => {
      const adminProfile = createMockProfile('ADMIN')
      const navigation = getFilteredNavigation('admin', adminProfile)
      
      const externalItems = navigation.filter(item => item.external)
      expect(externalItems.length).toBeGreaterThan(0)
      
      externalItems.forEach(item => {
        expect(item.externalUrl).toBeDefined()
        expect(item.external).toBe(true)
      })
    })
  })

  describe('Role Display Information', () => {
    it('should provide correct display information for each role', () => {
      const adminInfo = getRoleDisplayInfo('admin')
      const clergyInfo = getRoleDisplayInfo('clergy')
      const layInfo = getRoleDisplayInfo('lay')

      expect(adminInfo.category).toBe('admin')
      expect(adminInfo.display).toBe('Administrator')
      expect(adminInfo.color).toContain('red')

      expect(clergyInfo.category).toBe('clergy')
      expect(clergyInfo.display).toBe('Clergy')
      expect(clergyInfo.color).toContain('blue')

      expect(layInfo.category).toBe('lay')
      expect(layInfo.display).toBe('Member')
      expect(layInfo.color).toContain('green')
    })
  })

  describe('Navigation Categories', () => {
    it('should have all required navigation sections', () => {
      const expectedSections = [
        'discernment',
        'financial', 
        'social',
        'pastoral',
        'crm',
        'admin'
      ]

      const actualSections = UNIFIED_NAVIGATION.map(section => section.id)
      expectedSections.forEach(sectionId => {
        expect(actualSections).toContain(sectionId)
      })
    })

    it('should have proper role access defined for each section', () => {
      UNIFIED_NAVIGATION.forEach(section => {
        expect(section.roleAccess).toBeDefined()
        expect(Array.isArray(section.roleAccess)).toBe(true)
        expect(section.roleAccess.length).toBeGreaterThan(0)
      })
    })

    it('should have navigation items with required properties', () => {
      UNIFIED_NAVIGATION.forEach(section => {
        section.items.forEach(item => {
          expect(item.id).toBeDefined()
          expect(item.label).toBeDefined()
          expect(item.icon).toBeDefined()
          expect(item.path).toBeDefined()
          expect(item.description).toBeDefined()
          expect(item.category).toBe(section.id)
        })
      })
    })
  })

  describe('Permission Edge Cases', () => {
    it('should handle demo mode permissions correctly', () => {
      const demoProfile = {
        ...createMockProfile('MEMBER'),
        custom_fields: { demo_mode: true }
      }

      const permissions = getUserPermissions(demoProfile)
      // Demo mode should grant enhanced permissions
      expect(permissions.length).toBeGreaterThan(getUserPermissions(createMockProfile('MEMBER')).length)
    })

    it('should handle null/undefined profile gracefully', () => {
      expect(() => getUserPermissions(null as any)).not.toThrow()
      expect(() => hasPermission(null as any, 'crm.members.view')).not.toThrow()
      expect(hasPermission(null as any, 'crm.members.view')).toBe(false)
    })

    it('should validate permission strings', () => {
      const profile = createMockProfile('ADMIN')
      expect(hasPermission(profile, 'invalid.permission' as Permission)).toBe(false)
    })
  })

  describe('Multi-Codebase Integration', () => {
    it('should include external URLs for cross-codebase navigation', () => {
      const adminProfile = createMockProfile('ADMIN')
      const navigation = getFilteredNavigation('admin', adminProfile)
      
      const embark2Items = navigation.filter(item => 
        item.externalUrl?.includes('embark2-eric') || 
        item.id.includes('embark2')
      )
      
      const sparkItems = navigation.filter(item => 
        item.externalUrl?.includes('spark-fellowship') || 
        item.id.includes('spark')
      )
      
      const vocalItems = navigation.filter(item => 
        item.externalUrl?.includes('vocal-connect') || 
        item.id.includes('vocal')
      )

      expect(embark2Items.length).toBeGreaterThan(0)
      expect(sparkItems.length).toBeGreaterThan(0)
      expect(vocalItems.length).toBeGreaterThan(0)
    })

    it('should properly categorize cross-codebase features', () => {
      const adminProfile = createMockProfile('ADMIN')
      const navigation = getFilteredNavigation('admin', adminProfile)
      
      const discernmentItems = navigation.filter(item => item.category === 'discernment')
      const socialItems = navigation.filter(item => item.category === 'social')
      const pastoralItems = navigation.filter(item => item.category === 'pastoral')

      expect(discernmentItems.length).toBeGreaterThan(0)
      expect(socialItems.length).toBeGreaterThan(0)
      expect(pastoralItems.length).toBeGreaterThan(0)
    })
  })

  describe('Role Hierarchy', () => {
    it('should respect role hierarchy in permissions', () => {
      const adminPermissions = getUserPermissions(createMockProfile('ADMIN'))
      const clergyPermissions = getUserPermissions(createMockProfile('CLERGY'))
      const memberPermissions = getUserPermissions(createMockProfile('MEMBER'))

      // Admin should have more permissions than clergy
      expect(adminPermissions.length).toBeGreaterThan(clergyPermissions.length)
      
      // Clergy should have more permissions than members
      expect(clergyPermissions.length).toBeGreaterThan(memberPermissions.length)
    })

    it('should allow higher roles to access lower role features', () => {
      const adminProfile = createMockProfile('ADMIN')
      const clergyProfile = createMockProfile('CLERGY')

      // Admin should have all clergy permissions
      expect(hasPermission(adminProfile, 'pastoral.care.manage')).toBe(true)
      expect(hasPermission(adminProfile, 'crm.events.manage')).toBe(true)
      
      // Admin should have exclusive admin permissions
      expect(hasPermission(adminProfile, 'admin.users.manage')).toBe(true)
      expect(hasPermission(clergyProfile, 'admin.users.manage')).toBe(false)
    })
  })
})
