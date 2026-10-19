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
      account_deletion_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          failure_code: string | null
          id: string
          requested_at: string
          retry_count: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          failure_code?: string | null
          id?: string
          requested_at?: string
          retry_count?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          failure_code?: string | null
          id?: string
          requested_at?: string
          retry_count?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bucket_list: {
        Row: {
          country_code: string
          created_at: string
          id: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          country_code: string
          created_at?: string
          id?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          country_code?: string
          created_at?: string
          id?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bucket_list_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["iso_code"]
          },
        ]
      }
      countries: {
        Row: {
          continent_code: string
          continent_name: string
          counts_toward_world_total: boolean
          created_at: string
          is_active: boolean
          iso_code: string
          iso3_code: string
          name: string
          numeric_code: string | null
          official_name: string | null
          region: string | null
          sort_order: number
          subregion: string | null
          updated_at: string
        }
        Insert: {
          continent_code: string
          continent_name: string
          counts_toward_world_total?: boolean
          created_at?: string
          is_active?: boolean
          iso_code: string
          iso3_code: string
          name: string
          numeric_code?: string | null
          official_name?: string | null
          region?: string | null
          sort_order?: number
          subregion?: string | null
          updated_at?: string
        }
        Update: {
          continent_code?: string
          continent_name?: string
          counts_toward_world_total?: boolean
          created_at?: string
          is_active?: boolean
          iso_code?: string
          iso3_code?: string
          name?: string
          numeric_code?: string | null
          official_name?: string | null
          region?: string | null
          sort_order?: number
          subregion?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      data_export_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_code: string | null
          expires_at: string | null
          format: string
          id: string
          requested_at: string
          status: string
          storage_path: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_code?: string | null
          expires_at?: string | null
          format?: string
          id?: string
          requested_at?: string
          status?: string
          storage_path?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_code?: string | null
          expires_at?: string | null
          format?: string
          id?: string
          requested_at?: string
          status?: string
          storage_path?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      memories: {
        Row: {
          caption: string | null
          created_at: string
          declared_size_bytes: number
          declared_thumbnail_size_bytes: number
          display_order: number
          height: number | null
          id: string
          is_favourite: boolean
          location_label: string | null
          original_mime_type: string
          original_path: string
          stored_size_bytes: number | null
          stored_thumbnail_size_bytes: number | null
          taken_at: string | null
          thumbnail_path: string
          trip_id: string
          updated_at: string
          upload_status: string
          user_id: string
          width: number | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          declared_size_bytes: number
          declared_thumbnail_size_bytes: number
          display_order?: number
          height?: number | null
          id?: string
          is_favourite?: boolean
          location_label?: string | null
          original_mime_type: string
          original_path?: string
          stored_size_bytes?: number | null
          stored_thumbnail_size_bytes?: number | null
          taken_at?: string | null
          thumbnail_path?: string
          trip_id: string
          updated_at?: string
          upload_status?: string
          user_id?: string
          width?: number | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          declared_size_bytes?: number
          declared_thumbnail_size_bytes?: number
          display_order?: number
          height?: number | null
          id?: string
          is_favourite?: boolean
          location_label?: string | null
          original_mime_type?: string
          original_path?: string
          stored_size_bytes?: number | null
          stored_thumbnail_size_bytes?: number | null
          taken_at?: string | null
          thumbnail_path?: string
          trip_id?: string
          updated_at?: string
          upload_status?: string
          user_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "memories_trip_owner_fkey"
            columns: ["trip_id", "user_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      places: {
        Row: {
          city: string | null
          country_code: string
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          notes: string | null
          trip_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          city?: string | null
          country_code: string
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          notes?: string | null
          trip_id: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          city?: string | null
          country_code?: string
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          notes?: string | null
          trip_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "places_trip_owner_country_fkey"
            columns: ["trip_id", "user_id", "country_code"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id", "user_id", "country_code"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      travel_companions: {
        Row: {
          created_at: string
          display_name: string
          id: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trip_companions: {
        Row: {
          companion_id: string
          created_at: string
          trip_id: string
          user_id: string
        }
        Insert: {
          companion_id: string
          created_at?: string
          trip_id: string
          user_id?: string
        }
        Update: {
          companion_id?: string
          created_at?: string
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_companions_companion_owner_fkey"
            columns: ["companion_id", "user_id"]
            isOneToOne: false
            referencedRelation: "travel_companions"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "trip_companions_trip_owner_fkey"
            columns: ["trip_id", "user_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      trip_days: {
        Row: {
          created_at: string
          day_date: string
          id: string
          notes: string | null
          places: string[]
          title: string | null
          trip_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_date: string
          id?: string
          notes?: string | null
          places?: string[]
          title?: string | null
          trip_id: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          day_date?: string
          id?: string
          notes?: string | null
          places?: string[]
          title?: string | null
          trip_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_days_trip_owner_fkey"
            columns: ["trip_id", "user_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      trips: {
        Row: {
          city: string | null
          country_code: string
          created_at: string
          end_date: string
          expense_amount: number | null
          expense_currency: string | null
          favourite_memory: string | null
          id: string
          is_favourite: boolean
          journal: string | null
          mood: string | null
          name: string
          rating: number | null
          region: string | null
          start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          city?: string | null
          country_code: string
          created_at?: string
          end_date: string
          expense_amount?: number | null
          expense_currency?: string | null
          favourite_memory?: string | null
          id?: string
          is_favourite?: boolean
          journal?: string | null
          mood?: string | null
          name: string
          rating?: number | null
          region?: string | null
          start_date: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          city?: string | null
          country_code?: string
          created_at?: string
          end_date?: string
          expense_amount?: number | null
          expense_currency?: string | null
          favourite_memory?: string | null
          id?: string
          is_favourite?: boolean
          journal?: string | null
          mood?: string | null
          name?: string
          rating?: number | null
          region?: string | null
          start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trips_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["iso_code"]
          },
        ]
      }
      user_preferences: {
        Row: {
          analytics_consent: boolean
          created_at: string
          favourite_country_code: string | null
          reduced_motion: boolean
          remove_photo_gps_by_default: boolean
          show_slideshow_caption: boolean
          show_slideshow_city: boolean
          show_slideshow_country: boolean
          show_slideshow_date: boolean
          slideshow_duration_seconds: number
          slideshow_order: string
          slideshow_transition: string
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          analytics_consent?: boolean
          created_at?: string
          favourite_country_code?: string | null
          reduced_motion?: boolean
          remove_photo_gps_by_default?: boolean
          show_slideshow_caption?: boolean
          show_slideshow_city?: boolean
          show_slideshow_country?: boolean
          show_slideshow_date?: boolean
          slideshow_duration_seconds?: number
          slideshow_order?: string
          slideshow_transition?: string
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          analytics_consent?: boolean
          created_at?: string
          favourite_country_code?: string | null
          reduced_motion?: boolean
          remove_photo_gps_by_default?: boolean
          show_slideshow_caption?: boolean
          show_slideshow_city?: boolean
          show_slideshow_country?: boolean
          show_slideshow_date?: boolean
          slideshow_duration_seconds?: number
          slideshow_order?: string
          slideshow_transition?: string
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_favourite_country_code_fkey"
            columns: ["favourite_country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["iso_code"]
          },
        ]
      }
    }
    Views: {
      personal_statistics: {
        Row: {
          continents_visited: number | null
          countries_visited: number | null
          first_trip_date: string | null
          latest_trip_date: string | null
          total_memories: number | null
          total_travel_days: number | null
          total_trips: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

