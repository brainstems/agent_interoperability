export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      churches: {
        Row: {
          id: string
          name: string
          address: Json | null
          phone: string | null
          email: string | null
          website: string | null
          description: string | null
          timezone: string
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          address?: Json | null
          phone?: string | null
          email?: string | null
          website?: string | null
          description?: string | null
          timezone?: string
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          address?: Json | null
          phone?: string | null
          email?: string | null
          website?: string | null
          description?: string | null
          timezone?: string
          settings?: Json
          created_at?: string
          updated_at?: string
        }
      }
      crewai_agents: {
        Row: {
          id: string
          church_id: string
          name: string
          role: string
          goal: string
          backstory: string
          tools: string[]
          allow_delegation: boolean
          max_iterations: number
          memory_enabled: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          church_id: string
          name: string
          role: string
          goal: string
          backstory: string
          tools?: string[]
          allow_delegation?: boolean
          max_iterations?: number
          memory_enabled?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          church_id?: string
          name?: string
          role?: string
          goal?: string
          backstory?: string
          tools?: string[]
          allow_delegation?: boolean
          max_iterations?: number
          memory_enabled?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      crewai_crews: {
        Row: {
          id: string
          church_id: string
          name: string
          description: string
          process: string
          memory_enabled: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          church_id: string
          name: string
          description: string
          process?: string
          memory_enabled?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          church_id?: string
          name?: string
          description?: string
          process?: string
          memory_enabled?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      crewai_tasks: {
        Row: {
          id: string
          crew_id: string
          name: string
          description: string
          expected_output: string
          agent_role: string
          tools: string[]
          execution_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          crew_id: string
          name: string
          description: string
          expected_output: string
          agent_role: string
          tools?: string[]
          execution_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          crew_id?: string
          name?: string
          description?: string
          expected_output?: string
          agent_role?: string
          tools?: string[]
          execution_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      crewai_tools: {
        Row: {
          id: string
          church_id: string
          name: string
          description: string
          tool_type: string
          configuration: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          church_id: string
          name: string
          description: string
          tool_type: string
          configuration?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          church_id?: string
          name?: string
          description?: string
          tool_type?: string
          configuration?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      crewai_executions: {
        Row: {
          id: string
          crew_id: string
          church_id: string
          user_id: string | null
          status: string
          inputs: Json
          result: string | null
          error: string | null
          metadata: Json
          started_at: string
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          crew_id: string
          church_id: string
          user_id?: string | null
          status?: string
          inputs?: Json
          result?: string | null
          error?: string | null
          metadata?: Json
          started_at?: string
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          crew_id?: string
          church_id?: string
          user_id?: string | null
          status?: string
          inputs?: Json
          result?: string | null
          error?: string | null
          metadata?: Json
          started_at?: string
          completed_at?: string | null
          created_at?: string
        }
      }
      crewai_logs: {
        Row: {
          id: string
          agent_id: string | null
          church_id: string
          level: string
          message: string
          metadata: Json
          timestamp: string
          created_at: string
        }
        Insert: {
          id?: string
          agent_id?: string | null
          church_id: string
          level: string
          message: string
          metadata?: Json
          timestamp?: string
          created_at?: string
        }
        Update: {
          id?: string
          agent_id?: string | null
          church_id?: string
          level?: string
          message?: string
          metadata?: Json
          timestamp?: string
          created_at?: string
        }
      }
      crewai_memory: {
        Row: {
          id: string
          agent_name: string
          church_id: string
          memory_type: string
          content: Json
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          agent_name: string
          church_id: string
          memory_type: string
          content: Json
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          agent_name?: string
          church_id?: string
          memory_type?: string
          content?: Json
          metadata?: Json
          created_at?: string
        }
      }
      crewai_crew_agents: {
        Row: {
          id: string
          crew_id: string
          agent_id: string
          created_at: string
        }
        Insert: {
          id?: string
          crew_id: string
          agent_id: string
          created_at?: string
        }
        Update: {
          id?: string
          crew_id?: string
          agent_id?: string
          created_at?: string
        }
      }
      crewai_agent_tools: {
        Row: {
          id: string
          agent_id: string
          tool_id: string
          created_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          tool_id: string
          created_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          tool_id?: string
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          church_id: string
          first_name: string
          last_name: string
          email: string | null
          phone: string | null
          address: Json | null
          birth_date: string | null
          gender: Database['public']['Enums']['gender'] | null
          marital_status: Database['public']['Enums']['marital_status'] | null
          member_status: Database['public']['Enums']['member_status']
          join_date: string | null
          role: Database['public']['Enums']['user_role']
          bio: string | null
          photo_url: string | null
          interests: string[] | null
          life_events: Json
          connection_preferences: Json
          embedding: string | null
          custom_fields: Json
          is_active: boolean
          last_login: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          church_id: string
          first_name: string
          last_name: string
          email?: string | null
          phone?: string | null
          address?: Json | null
          birth_date?: string | null
          gender?: Database['public']['Enums']['gender'] | null
          marital_status?: Database['public']['Enums']['marital_status'] | null
          member_status?: Database['public']['Enums']['member_status']
          join_date?: string | null
          role?: Database['public']['Enums']['user_role']
          bio?: string | null
          photo_url?: string | null
          interests?: string[] | null
          life_events?: Json
          connection_preferences?: Json
          embedding?: string | null
          custom_fields?: Json
          is_active?: boolean
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          church_id?: string
          first_name?: string
          last_name?: string
          email?: string | null
          phone?: string | null
          address?: Json | null
          birth_date?: string | null
          gender?: Database['public']['Enums']['gender'] | null
          marital_status?: Database['public']['Enums']['marital_status'] | null
          member_status?: Database['public']['Enums']['member_status']
          join_date?: string | null
          role?: Database['public']['Enums']['user_role']
          bio?: string | null
          photo_url?: string | null
          interests?: string[] | null
          life_events?: Json
          connection_preferences?: Json
          embedding?: string | null
          custom_fields?: Json
          is_active?: boolean
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      events: {
        Row: {
          id: string
          church_id: string
          title: string
          description: string | null
          event_type: Database['public']['Enums']['event_type']
          start_datetime: string
          end_datetime: string
          location: string | null
          max_attendees: number | null
          registration_required: boolean
          registration_deadline: string | null
          is_public: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          church_id: string
          title: string
          description?: string | null
          event_type?: Database['public']['Enums']['event_type']
          start_datetime: string
          end_datetime: string
          location?: string | null
          max_attendees?: number | null
          registration_required?: boolean
          registration_deadline?: string | null
          is_public?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          church_id?: string
          title?: string
          description?: string | null
          event_type?: Database['public']['Enums']['event_type']
          start_datetime?: string
          end_datetime?: string
          location?: string | null
          max_attendees?: number | null
          registration_required?: boolean
          registration_deadline?: string | null
          is_public?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      connections: {
        Row: {
          id: string
          church_id: string
          user_id: string
          member_id: string
          connection_reason: string | null
          match_percentage: number | null
          connection_strength: number | null
          suggested_engagement: string | null
          common_interests: string[] | null
          status: Database['public']['Enums']['connection_status']
          privacy: Database['public']['Enums']['visibility_level']
          contacted_at: string | null
          connected_at: string | null
          archived_at: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          church_id: string
          user_id: string
          member_id: string
          connection_reason?: string | null
          match_percentage?: number | null
          connection_strength?: number | null
          suggested_engagement?: string | null
          common_interests?: string[] | null
          status?: Database['public']['Enums']['connection_status']
          privacy?: Database['public']['Enums']['visibility_level']
          contacted_at?: string | null
          connected_at?: string | null
          archived_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          church_id?: string
          user_id?: string
          member_id?: string
          connection_reason?: string | null
          match_percentage?: number | null
          connection_strength?: number | null
          suggested_engagement?: string | null
          common_interests?: string[] | null
          status?: Database['public']['Enums']['connection_status']
          privacy?: Database['public']['Enums']['visibility_level']
          contacted_at?: string | null
          connected_at?: string | null
          archived_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      agent_tasks: {
        Row: {
          id: string
          church_id: string | null
          task_type: string
          payload: Json
          status: string
          priority: number
          scheduled_at: string
          started_at: string | null
          completed_at: string | null
          attempts: number
          max_attempts: number
          last_error: string | null
          result: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          church_id?: string | null
          task_type: string
          payload?: Json
          status?: string
          priority?: number
          scheduled_at?: string
          started_at?: string | null
          completed_at?: string | null
          attempts?: number
          max_attempts?: number
          last_error?: string | null
          result?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          church_id?: string | null
          task_type?: string
          payload?: Json
          status?: string
          priority?: number
          scheduled_at?: string
          started_at?: string | null
          completed_at?: string | null
          attempts?: number
          max_attempts?: number
          last_error?: string | null
          result?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          church_id: string | null
          user_id: string
          channel: string
          template: string | null
          subject: string | null
          content: string
          payload: Json
          status: string
          provider_message_id: string | null
          sent_at: string | null
          delivered_at: string | null
          read_at: string | null
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          church_id?: string | null
          user_id: string
          channel: string
          template?: string | null
          subject?: string | null
          content: string
          payload?: Json
          status?: string
          provider_message_id?: string | null
          sent_at?: string | null
          delivered_at?: string | null
          read_at?: string | null
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          church_id?: string | null
          user_id?: string
          channel?: string
          template?: string | null
          subject?: string | null
          content?: string
          payload?: Json
          status?: string
          provider_message_id?: string | null
          sent_at?: string | null
          delivered_at?: string | null
          read_at?: string | null
          error_message?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_connection_score: {
        Args: {
          user_id_param: string
          member_id_param: string
        }
        Returns: number
      }
      find_matching_profiles: {
        Args: {
          target_profile_id: string
          similarity_threshold?: number
          limit_count?: number
        }
        Returns: {
          profile_id: string
          similarity_score: number
          connection_score: number
        }[]
      }
      is_admin_or_clergy: {
        Args: {
          user_id?: string
        }
        Returns: boolean
      }
      get_user_church_id: {
        Args: {
          user_id?: string
        }
        Returns: string
      }
    }
    Enums: {
      user_role: 'ADMIN' | 'CLERGY' | 'STAFF' | 'VOLUNTEER' | 'MEMBER' | 'VISITOR'
      gender: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY'
      marital_status: 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED' | 'SEPARATED'
      member_status: 'VISITOR' | 'REGULAR_ATTENDEE' | 'MEMBER' | 'INACTIVE' | 'TRANSFERRED'
      visibility_level: 'PRIVATE' | 'CHURCH_ONLY' | 'PUBLIC'
      connection_status: 'SUGGESTED' | 'CONTACTED' | 'CONNECTED' | 'ACTIVE' | 'ARCHIVED'
      event_type: 'SERVICE' | 'BIBLE_STUDY' | 'FELLOWSHIP' | 'OUTREACH' | 'MEETING' | 'CONFERENCE' | 'OTHER'
      fund_type: 'GENERAL' | 'BUILDING' | 'MISSIONS' | 'BENEVOLENCE' | 'SPECIAL' | 'DESIGNATED'
      payment_method: 'CASH' | 'CHECK' | 'CREDIT_CARD' | 'BANK_TRANSFER' | 'ONLINE' | 'CRYPTOCURRENCY'
      communication_type: 'EMAIL' | 'SMS' | 'PHONE' | 'MAIL' | 'IN_PERSON' | 'PUSH_NOTIFICATION'
      task_priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
      task_status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
