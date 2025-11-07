export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      app_versions: {
        Row: {
          build_time: string
          build_version: string
          created_at: string | null
          deployed_at: string | null
          id: string
          is_active: boolean | null
          version: string
        }
        Insert: {
          build_time: string
          build_version: string
          created_at?: string | null
          deployed_at?: string | null
          id?: string
          is_active?: boolean | null
          version: string
        }
        Update: {
          build_time?: string
          build_version?: string
          created_at?: string | null
          deployed_at?: string | null
          id?: string
          is_active?: boolean | null
          version?: string
        }
        Relationships: []
      }
      client_analysis_history: {
        Row: {
          analysis_data: Json
          created_at: string | null
          id: string
          risk_level: string
          risk_score: number
          timeline_id: string
        }
        Insert: {
          analysis_data: Json
          created_at?: string | null
          id?: string
          risk_level: string
          risk_score: number
          timeline_id: string
        }
        Update: {
          analysis_data?: Json
          created_at?: string | null
          id?: string
          risk_level?: string
          risk_score?: number
          timeline_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_analysis_history_timeline_id_fkey"
            columns: ["timeline_id"]
            isOneToOne: false
            referencedRelation: "client_timelines"
            referencedColumns: ["id"]
          },
        ]
      }
      client_boletos: {
        Row: {
          boleto_value: number
          created_at: string | null
          description: string | null
          due_date: string
          id: string
          status: string
          timeline_id: string
          updated_at: string | null
        }
        Insert: {
          boleto_value: number
          created_at?: string | null
          description?: string | null
          due_date: string
          id?: string
          status?: string
          timeline_id: string
          updated_at?: string | null
        }
        Update: {
          boleto_value?: number
          created_at?: string | null
          description?: string | null
          due_date?: string
          id?: string
          status?: string
          timeline_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_boletos_timeline_id_fkey"
            columns: ["timeline_id"]
            isOneToOne: false
            referencedRelation: "client_timelines"
            referencedColumns: ["id"]
          },
        ]
      }
      client_timeline_tags: {
        Row: {
          created_at: string | null
          id: string
          tag_id: string
          timeline_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          tag_id: string
          timeline_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          tag_id?: string
          timeline_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_timeline_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_timeline_tags_timeline_id_fkey"
            columns: ["timeline_id"]
            isOneToOne: false
            referencedRelation: "client_timelines"
            referencedColumns: ["id"]
          },
        ]
      }
      client_timelines: {
        Row: {
          boleto_value: number | null
          client_id: string | null
          client_name: string
          completed_at: string | null
          completion_notes: string | null
          created_at: string | null
          due_date: string | null
          id: string
          is_active: boolean
          organization_id: string | null
          start_date: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          boleto_value?: number | null
          client_id?: string | null
          client_name: string
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          is_active?: boolean
          organization_id?: string | null
          start_date: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          boleto_value?: number | null
          client_id?: string | null
          client_name?: string
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          is_active?: boolean
          organization_id?: string | null
          start_date?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_timelines_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_timelines_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_filters: {
        Row: {
          filter_data: Json
          id: string
          organization_id: string
          page_name: string
          updated_at: string | null
          updated_by: string | null
          user_id: string | null
        }
        Insert: {
          filter_data?: Json
          id?: string
          organization_id: string
          page_name: string
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
        }
        Update: {
          filter_data?: Json
          id?: string
          organization_id?: string
          page_name?: string
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_filters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_icons: {
        Row: {
          created_at: string | null
          created_by: string | null
          icon: string
          id: string
          label: string | null
          organization_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          icon: string
          id?: string
          label?: string | null
          organization_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          icon?: string
          id?: string
          label?: string | null
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_icons_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          events_per_line_limit: number
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          events_per_line_limit?: number
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          events_per_line_limit?: number
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          full_name: string | null
          id: string
          organization_id: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          full_name?: string | null
          id: string
          organization_id?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          full_name?: string | null
          id?: string
          organization_id?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      super_admins: {
        Row: {
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string
          created_at: string | null
          id: string
          name: string
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          color?: string
          created_at?: string | null
          id?: string
          name: string
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          color?: string
          created_at?: string | null
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      timeline_events: {
        Row: {
          created_at: string | null
          description: string | null
          event_date: string
          event_order: number
          event_time: string | null
          icon: string
          icon_size: string
          id: string
          line_id: string
          position: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          event_date: string
          event_order?: number
          event_time?: string | null
          icon?: string
          icon_size?: string
          id?: string
          line_id: string
          position: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          event_date?: string
          event_order?: number
          event_time?: string | null
          icon?: string
          icon_size?: string
          id?: string
          line_id?: string
          position?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timeline_events_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: false
            referencedRelation: "timeline_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      timeline_lines: {
        Row: {
          created_at: string | null
          id: string
          position: number
          timeline_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          position?: number
          timeline_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          position?: number
          timeline_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timeline_lines_timeline_id_fkey"
            columns: ["timeline_id"]
            isOneToOne: false
            referencedRelation: "client_timelines"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_user_to_organization: {
        Args: {
          _organization_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      generate_client_sequential_id: {
        Args: { org_id: string }
        Returns: string
      }
      get_organization_users: {
        Args: { _org_id: string }
        Returns: {
          created_at: string
          email: string
          full_name: string
          phone: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          user_role_id: string
        }[]
      }
      get_user_organization: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      user_in_organization: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "admin" | "member" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["owner", "admin", "member", "viewer"],
    },
  },
} as const
