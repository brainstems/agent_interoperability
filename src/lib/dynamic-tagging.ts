/**
 * Dynamic Tagging System
 * Flexible tagging and automated group assignment system
 */

import { supabase } from './supabase'
import { AuditLogger } from './audit-logging'

export type TagType = 'MANUAL' | 'AUTOMATIC' | 'COMPUTED' | 'SYSTEM'
export type TagColor = 'RED' | 'BLUE' | 'GREEN' | 'YELLOW' | 'PURPLE' | 'ORANGE' | 'PINK' | 'GRAY'
export type RuleOperator = 'AND' | 'OR' | 'NOT'
export type ConditionType = 
  | 'FIELD_EQUALS' | 'FIELD_NOT_EQUALS' | 'FIELD_CONTAINS' | 'FIELD_NOT_CONTAINS'
  | 'FIELD_GREATER_THAN' | 'FIELD_LESS_THAN' | 'FIELD_BETWEEN'
  | 'DATE_BEFORE' | 'DATE_AFTER' | 'DATE_BETWEEN'
  | 'HAS_TAG' | 'NOT_HAS_TAG' | 'IN_GROUP' | 'NOT_IN_GROUP'
  | 'ATTENDANCE_COUNT' | 'DONATION_AMOUNT' | 'LAST_ACTIVITY'
  | 'CUSTOM_FIELD' | 'SQL_QUERY'

export interface Tag {
  id?: string
  churchId: string
  name: string
  displayName: string
  description?: string
  category?: string
  tagType?: TagType
  color?: TagColor
  icon?: string
  isActive?: boolean
  isPublic?: boolean
  autoAssign?: boolean
  autoRemove?: boolean
  ruleConfig?: any
  memberCount?: number
  usageCount?: number
  lastUsedAt?: string
  viewRoles?: string[]
  assignRoles?: string[]
  createdBy?: string
  createdAt?: string
  updatedAt?: string
}

export interface MemberTag {
  id?: string
  churchId: string
  profileId: string
  tagId: string
  assignedBy?: string
  assignedAt?: string
  assignedReason?: string
  isAutomatic?: boolean
  expiresAt?: string
  metadata?: Record<string, any>
}

export interface TagRule {
  id?: string
  churchId: string
  tagId: string
  name: string
  description?: string
  isActive?: boolean
  ruleOperator?: RuleOperator
  conditions: TagCondition[]
  runFrequency?: string
  lastRunAt?: string
  nextRunAt?: string
  executionCount?: number
  lastExecutionTimeMs?: number
  affectedMembersCount?: number
  createdBy?: string
  createdAt?: string
  updatedAt?: string
}

export interface TagCondition {
  id?: string
  conditionType: ConditionType
  fieldName?: string
  fieldScope?: string
  valueText?: string
  valueNumber?: number
  valueDate?: string
  valueBoolean?: boolean
  valueArray?: any[]
  operator?: string
  isNegated?: boolean
  conditionGroup?: number
  groupOperator?: RuleOperator
}

export interface SmartList {
  id?: string
  churchId: string
  name: string
  description?: string
  isActive?: boolean
  isPublic?: boolean
  refreshFrequency?: string
  maxMembers?: number
  tagRules?: any
  fieldRules?: any
  customSql?: string
  memberCount?: number
  lastCalculatedAt?: string
  calculationTimeMs?: number
  viewRoles?: string[]
  createdBy?: string
  createdAt?: string
  updatedAt?: string
}

export interface TagSearchFilters {
  category?: string
  tagType?: TagType
  isActive?: boolean
  isPublic?: boolean
  createdBy?: string
}

export interface MemberTagFilters {
  tagId?: string
  profileId?: string
  isAutomatic?: boolean
  assignedBy?: string
  dateRange?: [string, string]
}

export class DynamicTaggingManager {
  /**
   * Create a new tag
   */
  static async createTag(tag: Tag, userId: string): Promise<Tag> {
    try {
      const { data, error } = await supabase
        .from('tags')
        .insert({
          church_id: tag.churchId,
          name: tag.name,
          display_name: tag.displayName,
          description: tag.description,
          category: tag.category,
          tag_type: tag.tagType || 'MANUAL',
          color: tag.color || 'BLUE',
          icon: tag.icon,
          is_active: tag.isActive !== false,
          is_public: tag.isPublic !== false,
          auto_assign: tag.autoAssign || false,
          auto_remove: tag.autoRemove || false,
          rule_config: tag.ruleConfig,
          view_roles: tag.viewRoles || ['ADMIN', 'CLERGY', 'STAFF', 'VOLUNTEER'],
          assign_roles: tag.assignRoles || ['ADMIN', 'CLERGY', 'STAFF'],
          created_by: userId
        })
        .select()
        .single()

      if (error) throw error

      // Log audit event
      await AuditLogger.logEvent({
        churchId: tag.churchId,
        userId,
        action: 'CREATE',
        resourceType: 'tag',
        resourceId: data.id,
        resourceName: tag.displayName,
        newValues: data,
        severity: 'LOW',
        description: `Created tag: ${tag.displayName}`
      })

      return this.mapTag(data)
    } catch (error) {
      console.error('Failed to create tag:', error)
      throw error
    }
  }

  /**
   * Update a tag
   */
  static async updateTag(id: string, updates: Partial<Tag>, userId: string): Promise<Tag> {
    try {
      // Get current tag for audit
      const { data: current } = await supabase
        .from('tags')
        .select()
        .eq('id', id)
        .single()

      const { data, error } = await supabase
        .from('tags')
        .update({
          display_name: updates.displayName,
          description: updates.description,
          category: updates.category,
          color: updates.color,
          icon: updates.icon,
          is_active: updates.isActive,
          is_public: updates.isPublic,
          auto_assign: updates.autoAssign,
          auto_remove: updates.autoRemove,
          rule_config: updates.ruleConfig,
          view_roles: updates.viewRoles,
          assign_roles: updates.assignRoles
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      // Log audit event
      await AuditLogger.logEvent({
        churchId: data.church_id,
        userId,
        action: 'UPDATE',
        resourceType: 'tag',
        resourceId: id,
        resourceName: data.display_name,
        oldValues: current,
        newValues: data,
        severity: 'LOW',
        description: `Updated tag: ${data.display_name}`
      })

      return this.mapTag(data)
    } catch (error) {
      console.error('Failed to update tag:', error)
      throw error
    }
  }

  /**
   * Delete a tag
   */
  static async deleteTag(id: string, userId: string): Promise<void> {
    try {
      // Get current tag for audit
      const { data: current } = await supabase
        .from('tags')
        .select()
        .eq('id', id)
        .single()

      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', id)

      if (error) throw error

      // Log audit event
      if (current) {
        await AuditLogger.logEvent({
          churchId: current.church_id,
          userId,
          action: 'DELETE',
          resourceType: 'tag',
          resourceId: id,
          resourceName: current.display_name,
          oldValues: current,
          severity: 'MEDIUM',
          description: `Deleted tag: ${current.display_name}`
        })
      }
    } catch (error) {
      console.error('Failed to delete tag:', error)
      throw error
    }
  }

  /**
   * Get tags with filtering
   */
  static async getTags(
    churchId: string,
    filters: TagSearchFilters = {}
  ): Promise<Tag[]> {
    try {
      let query = supabase
        .from('tags')
        .select()
        .eq('church_id', churchId)

      if (filters.category) {
        query = query.eq('category', filters.category)
      }

      if (filters.tagType) {
        query = query.eq('tag_type', filters.tagType)
      }

      if (filters.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive)
      }

      if (filters.isPublic !== undefined) {
        query = query.eq('is_public', filters.isPublic)
      }

      if (filters.createdBy) {
        query = query.eq('created_by', filters.createdBy)
      }

      query = query.order('category').order('display_name')

      const { data, error } = await query

      if (error) throw error

      return (data || []).map(this.mapTag)
    } catch (error) {
      console.error('Failed to get tags:', error)
      throw error
    }
  }

  /**
   * Assign tag to member
   */
  static async assignTagToMember(
    churchId: string,
    profileId: string,
    tagId: string,
    assignedBy: string,
    reason?: string,
    isAutomatic = false
  ): Promise<void> {
    try {
      const { error } = await supabase.rpc('assign_tag_to_member', {
        p_church_id: churchId,
        p_profile_id: profileId,
        p_tag_id: tagId,
        p_assigned_by: assignedBy,
        p_reason: reason,
        p_is_automatic: isAutomatic
      })

      if (error) throw error

      // Log audit event
      await AuditLogger.logEvent({
        churchId,
        userId: assignedBy,
        action: 'CREATE',
        resourceType: 'member_tag',
        resourceId: profileId,
        resourceName: `Tag assignment`,
        newValues: { profileId, tagId, reason, isAutomatic },
        severity: 'LOW',
        description: `Assigned tag to member${isAutomatic ? ' (automatic)' : ''}`
      })
    } catch (error) {
      console.error('Failed to assign tag to member:', error)
      throw error
    }
  }

  /**
   * Remove tag from member
   */
  static async removeTagFromMember(
    profileId: string,
    tagId: string,
    userId: string,
    churchId: string
  ): Promise<void> {
    try {
      const { error } = await supabase.rpc('remove_tag_from_member', {
        p_profile_id: profileId,
        p_tag_id: tagId
      })

      if (error) throw error

      // Log audit event
      await AuditLogger.logEvent({
        churchId,
        userId,
        action: 'DELETE',
        resourceType: 'member_tag',
        resourceId: profileId,
        resourceName: `Tag removal`,
        oldValues: { profileId, tagId },
        severity: 'LOW',
        description: `Removed tag from member`
      })
    } catch (error) {
      console.error('Failed to remove tag from member:', error)
      throw error
    }
  }

  /**
   * Get member tags
   */
  static async getMemberTags(
    churchId: string,
    filters: MemberTagFilters = {}
  ): Promise<MemberTag[]> {
    try {
      let query = supabase
        .from('member_tags')
        .select(`
          *,
          tag:tags(id, name, display_name, color, icon),
          profile:profiles(id, first_name, last_name, email),
          assigned_by_user:profiles!member_tags_assigned_by_fkey(id, first_name, last_name)
        `)
        .eq('church_id', churchId)

      if (filters.tagId) {
        query = query.eq('tag_id', filters.tagId)
      }

      if (filters.profileId) {
        query = query.eq('profile_id', filters.profileId)
      }

      if (filters.isAutomatic !== undefined) {
        query = query.eq('is_automatic', filters.isAutomatic)
      }

      if (filters.assignedBy) {
        query = query.eq('assigned_by', filters.assignedBy)
      }

      if (filters.dateRange) {
        query = query
          .gte('assigned_at', filters.dateRange[0])
          .lte('assigned_at', filters.dateRange[1])
      }

      query = query.order('assigned_at', { ascending: false })

      const { data, error } = await query

      if (error) throw error

      return (data || []).map(this.mapMemberTag)
    } catch (error) {
      console.error('Failed to get member tags:', error)
      throw error
    }
  }

  /**
   * Get tags for a specific member
   */
  static async getTagsForMember(
    churchId: string,
    profileId: string
  ): Promise<Tag[]> {
    try {
      const { data, error } = await supabase
        .from('member_tags')
        .select(`
          tag:tags(*)
        `)
        .eq('church_id', churchId)
        .eq('profile_id', profileId)

      if (error) throw error

      return (data || [])
        .map(item => item.tag)
        .filter(tag => tag)
        .map(this.mapTag)
    } catch (error) {
      console.error('Failed to get tags for member:', error)
      throw error
    }
  }

  /**
   * Get members with a specific tag
   */
  static async getMembersWithTag(
    churchId: string,
    tagId: string,
    limit = 50,
    offset = 0
  ): Promise<{ members: any[], total: number }> {
    try {
      const { data, error, count } = await supabase
        .from('member_tags')
        .select(`
          *,
          profile:profiles(*)
        `, { count: 'exact' })
        .eq('church_id', churchId)
        .eq('tag_id', tagId)
        .range(offset, offset + limit - 1)
        .order('assigned_at', { ascending: false })

      if (error) throw error

      return {
        members: (data || []).map(item => ({
          ...item.profile,
          tagAssignment: {
            assignedAt: item.assigned_at,
            assignedBy: item.assigned_by,
            assignedReason: item.assigned_reason,
            isAutomatic: item.is_automatic
          }
        })),
        total: count || 0
      }
    } catch (error) {
      console.error('Failed to get members with tag:', error)
      throw error
    }
  }

  /**
   * Create tag rule
   */
  static async createTagRule(rule: TagRule, userId: string): Promise<TagRule> {
    try {
      const { data, error } = await supabase
        .from('tag_rules')
        .insert({
          church_id: rule.churchId,
          tag_id: rule.tagId,
          name: rule.name,
          description: rule.description,
          is_active: rule.isActive !== false,
          rule_operator: rule.ruleOperator || 'AND',
          conditions: rule.conditions,
          run_frequency: rule.runFrequency || 'daily',
          created_by: userId
        })
        .select()
        .single()

      if (error) throw error

      // Log audit event
      await AuditLogger.logEvent({
        churchId: rule.churchId,
        userId,
        action: 'CREATE',
        resourceType: 'tag_rule',
        resourceId: data.id,
        resourceName: rule.name,
        newValues: data,
        severity: 'LOW',
        description: `Created tag rule: ${rule.name}`
      })

      return this.mapTagRule(data)
    } catch (error) {
      console.error('Failed to create tag rule:', error)
      throw error
    }
  }

  /**
   * Execute tag rule
   */
  static async executeTagRule(ruleId: string, userId: string): Promise<number> {
    try {
      const { data: affectedCount, error } = await supabase.rpc('execute_tag_rule', {
        p_rule_id: ruleId
      })

      if (error) throw error

      // Log audit event
      const { data: rule } = await supabase
        .from('tag_rules')
        .select('church_id, name')
        .eq('id', ruleId)
        .single()

      if (rule) {
        await AuditLogger.logEvent({
          churchId: rule.church_id,
          userId,
          action: 'UPDATE',
          resourceType: 'tag_rule_execution',
          resourceId: ruleId,
          resourceName: `Rule execution: ${rule.name}`,
          newValues: { affectedCount },
          severity: 'LOW',
          description: `Executed tag rule affecting ${affectedCount} members`
        })
      }

      return affectedCount || 0
    } catch (error) {
      console.error('Failed to execute tag rule:', error)
      throw error
    }
  }

  /**
   * Create smart list
   */
  static async createSmartList(list: SmartList, userId: string): Promise<SmartList> {
    try {
      const { data, error } = await supabase
        .from('smart_lists')
        .insert({
          church_id: list.churchId,
          name: list.name,
          description: list.description,
          is_active: list.isActive !== false,
          is_public: list.isPublic !== false,
          refresh_frequency: list.refreshFrequency || 'daily',
          max_members: list.maxMembers,
          tag_rules: list.tagRules,
          field_rules: list.fieldRules,
          custom_sql: list.customSql,
          view_roles: list.viewRoles || ['ADMIN', 'CLERGY', 'STAFF'],
          created_by: userId
        })
        .select()
        .single()

      if (error) throw error

      // Log audit event
      await AuditLogger.logEvent({
        churchId: list.churchId,
        userId,
        action: 'CREATE',
        resourceType: 'smart_list',
        resourceId: data.id,
        resourceName: list.name,
        newValues: data,
        severity: 'LOW',
        description: `Created smart list: ${list.name}`
      })

      return this.mapSmartList(data)
    } catch (error) {
      console.error('Failed to create smart list:', error)
      throw error
    }
  }

  /**
   * Calculate smart list members
   */
  static async calculateSmartList(listId: string, userId: string): Promise<number> {
    try {
      const { data: memberCount, error } = await supabase.rpc('calculate_smart_list', {
        p_smart_list_id: listId
      })

      if (error) throw error

      // Log audit event
      const { data: list } = await supabase
        .from('smart_lists')
        .select('church_id, name')
        .eq('id', listId)
        .single()

      if (list) {
        await AuditLogger.logEvent({
          churchId: list.church_id,
          userId,
          action: 'UPDATE',
          resourceType: 'smart_list_calculation',
          resourceId: listId,
          resourceName: `List calculation: ${list.name}`,
          newValues: { memberCount },
          severity: 'LOW',
          description: `Calculated smart list with ${memberCount} members`
        })
      }

      return memberCount || 0
    } catch (error) {
      console.error('Failed to calculate smart list:', error)
      throw error
    }
  }

  /**
   * Search members by tags
   */
  static async searchMembersByTags(
    churchId: string,
    tagNames: string[],
    operator: 'AND' | 'OR' = 'AND'
  ): Promise<string[]> {
    try {
      let query = supabase
        .from('member_tags')
        .select('profile_id')
        .eq('church_id', churchId)

      if (operator === 'AND') {
        // For AND operation, we need members who have ALL specified tags
        // This requires a more complex query
        const { data, error } = await supabase
          .from('member_tags')
          .select(`
            profile_id,
            tag:tags!inner(name)
          `)
          .eq('church_id', churchId)
          .in('tag.name', tagNames)

        if (error) throw error

        // Group by profile_id and count tags
        const profileTagCounts: Record<string, number> = {}
        data?.forEach(item => {
          profileTagCounts[item.profile_id] = (profileTagCounts[item.profile_id] || 0) + 1
        })

        // Return profiles that have all required tags
        return Object.entries(profileTagCounts)
          .filter(([_, count]) => count === tagNames.length)
          .map(([profileId]) => profileId)
      } else {
        // For OR operation, we need members who have ANY of the specified tags
        const { data, error } = await supabase
          .from('member_tags')
          .select(`
            profile_id,
            tag:tags!inner(name)
          `)
          .eq('church_id', churchId)
          .in('tag.name', tagNames)

        if (error) throw error

        // Return unique profile IDs
        return Array.from(new Set(data?.map(item => item.profile_id) || []))
      }
    } catch (error) {
      console.error('Failed to search members by tags:', error)
      throw error
    }
  }

  /**
   * Get tag usage statistics
   */
  static async getTagUsageStats(churchId: string): Promise<Record<string, any>> {
    try {
      const { data, error } = await supabase
        .from('tags')
        .select(`
          id,
          name,
          display_name,
          member_count,
          usage_count,
          tag_type,
          category,
          created_at
        `)
        .eq('church_id', churchId)
        .order('member_count', { ascending: false })

      if (error) throw error

      const stats = {
        totalTags: data?.length || 0,
        totalAssignments: data?.reduce((sum, tag) => sum + (tag.member_count || 0), 0) || 0,
        mostUsedTags: data?.slice(0, 10) || [],
        tagsByType: data?.reduce((acc, tag) => {
          acc[tag.tag_type] = (acc[tag.tag_type] || 0) + 1
          return acc
        }, {} as Record<string, number>) || {},
        tagsByCategory: data?.reduce((acc, tag) => {
          const category = tag.category || 'Uncategorized'
          acc[category] = (acc[category] || 0) + 1
          return acc
        }, {} as Record<string, number>) || {}
      }

      return stats
    } catch (error) {
      console.error('Failed to get tag usage stats:', error)
      throw error
    }
  }

  /**
   * Helper method to map database record to Tag
   */
  private static mapTag(data: any): Tag {
    return {
      id: data.id,
      churchId: data.church_id,
      name: data.name,
      displayName: data.display_name,
      description: data.description,
      category: data.category,
      tagType: data.tag_type,
      color: data.color,
      icon: data.icon,
      isActive: data.is_active,
      isPublic: data.is_public,
      autoAssign: data.auto_assign,
      autoRemove: data.auto_remove,
      ruleConfig: data.rule_config,
      memberCount: data.member_count,
      usageCount: data.usage_count,
      lastUsedAt: data.last_used_at,
      viewRoles: data.view_roles,
      assignRoles: data.assign_roles,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }
  }

  /**
   * Helper method to map database record to MemberTag
   */
  private static mapMemberTag(data: any): MemberTag {
    return {
      id: data.id,
      churchId: data.church_id,
      profileId: data.profile_id,
      tagId: data.tag_id,
      assignedBy: data.assigned_by,
      assignedAt: data.assigned_at,
      assignedReason: data.assigned_reason,
      isAutomatic: data.is_automatic,
      expiresAt: data.expires_at,
      metadata: data.metadata
    }
  }

  /**
   * Helper method to map database record to TagRule
   */
  private static mapTagRule(data: any): TagRule {
    return {
      id: data.id,
      churchId: data.church_id,
      tagId: data.tag_id,
      name: data.name,
      description: data.description,
      isActive: data.is_active,
      ruleOperator: data.rule_operator,
      conditions: data.conditions,
      runFrequency: data.run_frequency,
      lastRunAt: data.last_run_at,
      nextRunAt: data.next_run_at,
      executionCount: data.execution_count,
      lastExecutionTimeMs: data.last_execution_time_ms,
      affectedMembersCount: data.affected_members_count,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }
  }

  /**
   * Helper method to map database record to SmartList
   */
  private static mapSmartList(data: any): SmartList {
    return {
      id: data.id,
      churchId: data.church_id,
      name: data.name,
      description: data.description,
      isActive: data.is_active,
      isPublic: data.is_public,
      refreshFrequency: data.refresh_frequency,
      maxMembers: data.max_members,
      tagRules: data.tag_rules,
      fieldRules: data.field_rules,
      customSql: data.custom_sql,
      memberCount: data.member_count,
      lastCalculatedAt: data.last_calculated_at,
      calculationTimeMs: data.calculation_time_ms,
      viewRoles: data.view_roles,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }
  }
}

export default DynamicTaggingManager
