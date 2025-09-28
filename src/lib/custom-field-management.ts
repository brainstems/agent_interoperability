/**
 * Custom Field Management Service
 * Dynamic custom field definitions and validation system
 */

import { supabase } from './supabase'
import { AuditLogger } from './audit-logging'

export type FieldType = 
  | 'TEXT' | 'TEXTAREA' | 'NUMBER' | 'DECIMAL' | 'DATE' | 'DATETIME' 
  | 'BOOLEAN' | 'SELECT' | 'MULTISELECT' | 'EMAIL' | 'PHONE' | 'URL' 
  | 'FILE' | 'IMAGE' | 'JSON' | 'ENCRYPTED'

export type FieldScope = 'MEMBER' | 'EVENT' | 'GROUP' | 'DONATION' | 'TASK' | 'COMMUNICATION'

export interface FieldOption {
  value: string
  label: string
  description?: string
}

export interface CustomFieldDefinition {
  id?: string
  churchId: string
  name: string
  displayName: string
  description?: string
  fieldType: FieldType
  scope: FieldScope
  isRequired?: boolean
  isUnique?: boolean
  isSearchable?: boolean
  isVisible?: boolean
  isEditable?: boolean
  minLength?: number
  maxLength?: number
  minValue?: number
  maxValue?: number
  regexPattern?: string
  validationMessage?: string
  fieldOptions?: FieldOption[]
  defaultValue?: string
  defaultValueJson?: any
  displayOrder?: number
  groupName?: string
  helpText?: string
  placeholder?: string
  viewRoles?: string[]
  editRoles?: string[]
  createdBy?: string
  createdAt?: string
  updatedAt?: string
}

export interface CustomFieldValue {
  id?: string
  churchId: string
  fieldDefinitionId: string
  recordId: string
  recordType: FieldScope
  textValue?: string
  numberValue?: number
  dateValue?: string
  datetimeValue?: string
  booleanValue?: boolean
  jsonValue?: any
  encryptedValue?: string
  createdAt?: string
  updatedAt?: string
}

export interface FieldTemplate {
  id?: string
  churchId: string
  name: string
  description?: string
  scope: FieldScope
  isPublic?: boolean
  fieldDefinitions: Partial<CustomFieldDefinition>[]
  usageCount?: number
  createdBy?: string
  createdAt?: string
  updatedAt?: string
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

export class CustomFieldManager {
  /**
   * Create a new custom field definition
   */
  static async createFieldDefinition(
    definition: CustomFieldDefinition,
    userId: string
  ): Promise<CustomFieldDefinition> {
    try {
      const { data, error } = await supabase
        .from('custom_field_definitions')
        .insert({
          church_id: definition.churchId,
          name: definition.name,
          display_name: definition.displayName,
          description: definition.description,
          field_type: definition.fieldType,
          scope: definition.scope,
          is_required: definition.isRequired || false,
          is_unique: definition.isUnique || false,
          is_searchable: definition.isSearchable !== false,
          is_visible: definition.isVisible !== false,
          is_editable: definition.isEditable !== false,
          min_length: definition.minLength,
          max_length: definition.maxLength,
          min_value: definition.minValue,
          max_value: definition.maxValue,
          regex_pattern: definition.regexPattern,
          validation_message: definition.validationMessage,
          field_options: definition.fieldOptions || [],
          default_value: definition.defaultValue,
          default_value_json: definition.defaultValueJson,
          display_order: definition.displayOrder || 0,
          group_name: definition.groupName,
          help_text: definition.helpText,
          placeholder: definition.placeholder,
          view_roles: definition.viewRoles || ['ADMIN', 'CLERGY', 'STAFF'],
          edit_roles: definition.editRoles || ['ADMIN', 'CLERGY', 'STAFF'],
          created_by: userId
        })
        .select()
        .single()

      if (error) throw error

      // Log audit event
      await AuditLogger.logEvent({
        churchId: definition.churchId,
        userId,
        action: 'CREATE',
        resourceType: 'custom_field_definition',
        resourceId: data.id,
        resourceName: definition.displayName,
        newValues: data,
        severity: 'LOW',
        description: `Created custom field definition: ${definition.displayName}`
      })

      return this.mapFieldDefinition(data)
    } catch (error) {
      console.error('Failed to create field definition:', error)
      throw error
    }
  }

  /**
   * Update a custom field definition
   */
  static async updateFieldDefinition(
    id: string,
    updates: Partial<CustomFieldDefinition>,
    userId: string
  ): Promise<CustomFieldDefinition> {
    try {
      // Get current definition for audit
      const { data: current } = await supabase
        .from('custom_field_definitions')
        .select()
        .eq('id', id)
        .single()

      const { data, error } = await supabase
        .from('custom_field_definitions')
        .update({
          display_name: updates.displayName,
          description: updates.description,
          is_required: updates.isRequired,
          is_unique: updates.isUnique,
          is_searchable: updates.isSearchable,
          is_visible: updates.isVisible,
          is_editable: updates.isEditable,
          min_length: updates.minLength,
          max_length: updates.maxLength,
          min_value: updates.minValue,
          max_value: updates.maxValue,
          regex_pattern: updates.regexPattern,
          validation_message: updates.validationMessage,
          field_options: updates.fieldOptions,
          default_value: updates.defaultValue,
          default_value_json: updates.defaultValueJson,
          display_order: updates.displayOrder,
          group_name: updates.groupName,
          help_text: updates.helpText,
          placeholder: updates.placeholder,
          view_roles: updates.viewRoles,
          edit_roles: updates.editRoles
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
        resourceType: 'custom_field_definition',
        resourceId: id,
        resourceName: data.display_name,
        oldValues: current,
        newValues: data,
        severity: 'LOW',
        description: `Updated custom field definition: ${data.display_name}`
      })

      return this.mapFieldDefinition(data)
    } catch (error) {
      console.error('Failed to update field definition:', error)
      throw error
    }
  }

  /**
   * Delete a custom field definition
   */
  static async deleteFieldDefinition(id: string, userId: string): Promise<void> {
    try {
      // Get current definition for audit
      const { data: current } = await supabase
        .from('custom_field_definitions')
        .select()
        .eq('id', id)
        .single()

      const { error } = await supabase
        .from('custom_field_definitions')
        .delete()
        .eq('id', id)

      if (error) throw error

      // Log audit event
      if (current) {
        await AuditLogger.logEvent({
          churchId: current.church_id,
          userId,
          action: 'DELETE',
          resourceType: 'custom_field_definition',
          resourceId: id,
          resourceName: current.display_name,
          oldValues: current,
          severity: 'MEDIUM',
          description: `Deleted custom field definition: ${current.display_name}`
        })
      }
    } catch (error) {
      console.error('Failed to delete field definition:', error)
      throw error
    }
  }

  /**
   * Get field definitions for a scope
   */
  static async getFieldDefinitions(
    churchId: string,
    scope: FieldScope,
    filters: {
      isVisible?: boolean
      groupName?: string
      isSearchable?: boolean
    } = {}
  ): Promise<CustomFieldDefinition[]> {
    try {
      let query = supabase
        .from('custom_field_definitions')
        .select()
        .eq('church_id', churchId)
        .eq('scope', scope)

      if (filters.isVisible !== undefined) {
        query = query.eq('is_visible', filters.isVisible)
      }

      if (filters.groupName) {
        query = query.eq('group_name', filters.groupName)
      }

      if (filters.isSearchable !== undefined) {
        query = query.eq('is_searchable', filters.isSearchable)
      }

      query = query.order('display_order').order('display_name')

      const { data, error } = await query

      if (error) throw error

      return (data || []).map(this.mapFieldDefinition)
    } catch (error) {
      console.error('Failed to get field definitions:', error)
      throw error
    }
  }

  /**
   * Set custom field value
   */
  static async setFieldValue(
    churchId: string,
    fieldDefinitionId: string,
    recordId: string,
    recordType: FieldScope,
    value: any,
    userId?: string
  ): Promise<void> {
    try {
      // Validate the value first
      const validation = await this.validateFieldValue(fieldDefinitionId, value)
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`)
      }

      // Use the database function to set the value
      const { error } = await supabase.rpc('set_custom_field_value', {
        p_church_id: churchId,
        p_field_definition_id: fieldDefinitionId,
        p_record_id: recordId,
        p_record_type: recordType,
        p_value: typeof value === 'string' ? value : JSON.stringify(value)
      })

      if (error) throw error

      // Log audit event if userId provided
      if (userId) {
        await AuditLogger.logEvent({
          churchId,
          userId,
          action: 'UPDATE',
          resourceType: 'custom_field_value',
          resourceId: recordId,
          resourceName: `Custom field value for ${recordType}`,
          newValues: { fieldDefinitionId, value },
          severity: 'LOW',
          description: `Updated custom field value`
        })
      }
    } catch (error) {
      console.error('Failed to set field value:', error)
      throw error
    }
  }

  /**
   * Get custom field values for a record
   */
  static async getFieldValues(
    churchId: string,
    recordType: FieldScope,
    recordId: string
  ): Promise<Record<string, any>> {
    try {
      const { data, error } = await supabase.rpc('get_custom_fields_for_record', {
        p_church_id: churchId,
        p_record_type: recordType,
        p_record_id: recordId
      })

      if (error) throw error

      return data || {}
    } catch (error) {
      console.error('Failed to get field values:', error)
      throw error
    }
  }

  /**
   * Validate field value against definition
   */
  static async validateFieldValue(
    fieldDefinitionId: string,
    value: any
  ): Promise<ValidationResult> {
    try {
      const { data: isValid, error } = await supabase.rpc('validate_custom_field_value', {
        p_field_definition_id: fieldDefinitionId,
        p_value: typeof value === 'string' ? value : JSON.stringify(value)
      })

      if (error) throw error

      return {
        isValid: isValid || false,
        errors: isValid ? [] : ['Value does not meet field requirements']
      }
    } catch (error) {
      console.error('Failed to validate field value:', error)
      return {
        isValid: false,
        errors: ['Validation error occurred']
      }
    }
  }

  /**
   * Create field template
   */
  static async createTemplate(
    template: FieldTemplate,
    userId: string
  ): Promise<FieldTemplate> {
    try {
      const { data, error } = await supabase
        .from('custom_field_templates')
        .insert({
          church_id: template.churchId,
          name: template.name,
          description: template.description,
          scope: template.scope,
          is_public: template.isPublic || false,
          field_definitions: template.fieldDefinitions,
          created_by: userId
        })
        .select()
        .single()

      if (error) throw error

      // Log audit event
      await AuditLogger.logEvent({
        churchId: template.churchId,
        userId,
        action: 'CREATE',
        resourceType: 'custom_field_template',
        resourceId: data.id,
        resourceName: template.name,
        newValues: data,
        severity: 'LOW',
        description: `Created custom field template: ${template.name}`
      })

      return this.mapTemplate(data)
    } catch (error) {
      console.error('Failed to create template:', error)
      throw error
    }
  }

  /**
   * Apply template to create field definitions
   */
  static async applyTemplate(
    churchId: string,
    templateId: string,
    scope: FieldScope,
    userId: string
  ): Promise<number> {
    try {
      const { data: createdCount, error } = await supabase.rpc('apply_field_template', {
        p_church_id: churchId,
        p_template_id: templateId,
        p_scope: scope
      })

      if (error) throw error

      // Log audit event
      await AuditLogger.logEvent({
        churchId,
        userId,
        action: 'CREATE',
        resourceType: 'custom_field_definition',
        resourceName: `Template application`,
        newValues: { templateId, scope, createdCount },
        severity: 'LOW',
        description: `Applied template to create ${createdCount} field definitions`
      })

      return createdCount || 0
    } catch (error) {
      console.error('Failed to apply template:', error)
      throw error
    }
  }

  /**
   * Get available templates
   */
  static async getTemplates(
    churchId: string,
    scope?: FieldScope
  ): Promise<FieldTemplate[]> {
    try {
      let query = supabase
        .from('custom_field_templates')
        .select()
        .or(`church_id.eq.${churchId},is_public.eq.true`)

      if (scope) {
        query = query.eq('scope', scope)
      }

      query = query.order('name')

      const { data, error } = await query

      if (error) throw error

      return (data || []).map(this.mapTemplate)
    } catch (error) {
      console.error('Failed to get templates:', error)
      throw error
    }
  }

  /**
   * Search records by custom field values
   */
  static async searchByCustomFields(
    churchId: string,
    recordType: FieldScope,
    searchCriteria: Record<string, any>
  ): Promise<string[]> {
    try {
      const conditions = Object.entries(searchCriteria).map(([fieldName, value]) => {
        return `cfd.name.eq.${fieldName},cfv.text_value.ilike.%${value}%`
      })

      const { data, error } = await supabase
        .from('custom_field_values')
        .select(`
          record_id,
          field_definition:custom_field_definitions!inner(name)
        `)
        .eq('church_id', churchId)
        .eq('record_type', recordType)
        .or(conditions.join(','))

      if (error) throw error

      // Extract unique record IDs
      const recordIds = Array.from(new Set((data || []).map(item => item.record_id)))
      return recordIds
    } catch (error) {
      console.error('Failed to search by custom fields:', error)
      throw error
    }
  }

  /**
   * Get field usage statistics
   */
  static async getFieldUsageStats(
    churchId: string,
    scope: FieldScope
  ): Promise<Record<string, { totalRecords: number; filledRecords: number; fillRate: number }>> {
    try {
      const { data, error } = await supabase
        .from('custom_field_definitions')
        .select(`
          id,
          name,
          display_name,
          values:custom_field_values(count)
        `)
        .eq('church_id', churchId)
        .eq('scope', scope)

      if (error) throw error

      // Get total record count for the scope
      let totalQuery
      switch (scope) {
        case 'MEMBER':
          totalQuery = supabase.from('profiles').select('id', { count: 'exact' }).eq('church_id', churchId)
          break
        case 'EVENT':
          totalQuery = supabase.from('events').select('id', { count: 'exact' }).eq('church_id', churchId)
          break
        case 'GROUP':
          totalQuery = supabase.from('groups').select('id', { count: 'exact' }).eq('church_id', churchId)
          break
        default:
          totalQuery = Promise.resolve({ count: 0 })
      }

      const { count: totalRecords } = await totalQuery
      const stats: Record<string, any> = {}

      for (const field of data || []) {
        const filledRecords = field.values?.[0]?.count || 0
        stats[field.name] = {
          totalRecords: totalRecords || 0,
          filledRecords,
          fillRate: totalRecords ? (filledRecords / totalRecords) * 100 : 0
        }
      }

      return stats
    } catch (error) {
      console.error('Failed to get field usage stats:', error)
      throw error
    }
  }

  /**
   * Helper method to map database record to CustomFieldDefinition
   */
  private static mapFieldDefinition(data: any): CustomFieldDefinition {
    return {
      id: data.id,
      churchId: data.church_id,
      name: data.name,
      displayName: data.display_name,
      description: data.description,
      fieldType: data.field_type,
      scope: data.scope,
      isRequired: data.is_required,
      isUnique: data.is_unique,
      isSearchable: data.is_searchable,
      isVisible: data.is_visible,
      isEditable: data.is_editable,
      minLength: data.min_length,
      maxLength: data.max_length,
      minValue: data.min_value,
      maxValue: data.max_value,
      regexPattern: data.regex_pattern,
      validationMessage: data.validation_message,
      fieldOptions: data.field_options,
      defaultValue: data.default_value,
      defaultValueJson: data.default_value_json,
      displayOrder: data.display_order,
      groupName: data.group_name,
      helpText: data.help_text,
      placeholder: data.placeholder,
      viewRoles: data.view_roles,
      editRoles: data.edit_roles,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }
  }

  /**
   * Helper method to map database record to FieldTemplate
   */
  private static mapTemplate(data: any): FieldTemplate {
    return {
      id: data.id,
      churchId: data.church_id,
      name: data.name,
      description: data.description,
      scope: data.scope,
      isPublic: data.is_public,
      fieldDefinitions: data.field_definitions,
      usageCount: data.usage_count,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }
  }
}

export default CustomFieldManager
