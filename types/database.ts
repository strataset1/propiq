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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      api_keys: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          key_hash: string
          label: string
          last_used_at: string | null
          org_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          key_hash: string
          label: string
          last_used_at?: string | null
          org_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          key_hash?: string
          label?: string
          last_used_at?: string | null
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      api_usage: {
        Row: {
          api_key_id: string
          billed_at: string
          endpoint: string
          id: string
          org_id: string
          property_id: string | null
        }
        Insert: {
          api_key_id: string
          billed_at?: string
          endpoint: string
          id?: string
          org_id: string
          property_id?: string | null
        }
        Update: {
          api_key_id?: string
          billed_at?: string
          endpoint?: string
          id?: string
          org_id?: string
          property_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_usage_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_usage_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          crawl_suburb: string | null
          created_at: string
          extracted_text: string | null
          file_hash: string | null
          id: string
          ingested_via: Database["public"]["Enums"]["ingested_via"]
          label: string
          page_count: number | null
          processed_at: string | null
          property_id: string
          source_url: string | null
          storage_path: string | null
          type: Database["public"]["Enums"]["document_type"]
        }
        Insert: {
          crawl_suburb?: string | null
          created_at?: string
          extracted_text?: string | null
          file_hash?: string | null
          id?: string
          ingested_via: Database["public"]["Enums"]["ingested_via"]
          label: string
          page_count?: number | null
          processed_at?: string | null
          property_id: string
          source_url?: string | null
          storage_path?: string | null
          type: Database["public"]["Enums"]["document_type"]
        }
        Update: {
          crawl_suburb?: string | null
          created_at?: string
          extracted_text?: string | null
          file_hash?: string | null
          id?: string
          ingested_via?: Database["public"]["Enums"]["ingested_via"]
          label?: string
          page_count?: number | null
          processed_at?: string | null
          property_id?: string
          source_url?: string | null
          storage_path?: string | null
          type?: Database["public"]["Enums"]["document_type"]
        }
        Relationships: [
          {
            foreignKeyName: "documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      organisations: {
        Row: {
          created_at: string
          id: string
          license_paid_at: string | null
          monthly_quota: number
          name: string
          owner_email: string | null
          plan: Database["public"]["Enums"]["plan_type"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          license_paid_at?: string | null
          monthly_quota?: number
          name: string
          owner_email?: string | null
          plan?: Database["public"]["Enums"]["plan_type"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          license_paid_at?: string | null
          monthly_quota?: number
          name?: string
          owner_email?: string | null
          plan?: Database["public"]["Enums"]["plan_type"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
        }
        Relationships: []
      }
      processing_batches: {
        Row: {
          batch_id: string
          created_at: string
          doc_ids: string[]
          id: string
          status: string
        }
        Insert: {
          batch_id: string
          created_at?: string
          doc_ids: string[]
          id?: string
          status?: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          doc_ids?: string[]
          id?: string
          status?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address_normalised: string | null
          address_raw: string
          created_at: string
          id: string
          last_crawled_at: string | null
          lat: number | null
          lng: number | null
          postcode: string | null
          state: string | null
          status: Database["public"]["Enums"]["property_status"]
          suburb: string | null
        }
        Insert: {
          address_normalised?: string | null
          address_raw: string
          created_at?: string
          id?: string
          last_crawled_at?: string | null
          lat?: number | null
          lng?: number | null
          postcode?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["property_status"]
          suburb?: string | null
        }
        Update: {
          address_normalised?: string | null
          address_raw?: string
          created_at?: string
          id?: string
          last_crawled_at?: string | null
          lat?: number | null
          lng?: number | null
          postcode?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["property_status"]
          suburb?: string | null
        }
        Relationships: []
      }
      property_summaries: {
        Row: {
          checklist: Json | null
          confidence: number | null
          generated_at: string
          id: string
          model_version: string | null
          property_id: string
          summary: string | null
        }
        Insert: {
          checklist?: Json | null
          confidence?: number | null
          generated_at?: string
          id?: string
          model_version?: string | null
          property_id: string
          summary?: string | null
        }
        Update: {
          checklist?: Json | null
          confidence?: number | null
          generated_at?: string
          id?: string
          model_version?: string | null
          property_id?: string
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_summaries_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: true
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          amount_aud_cents: number
          created_at: string
          customer_email: string | null
          document_id: string
          id: string
          paid_at: string
          stripe_session_id: string
        }
        Insert: {
          amount_aud_cents: number
          created_at?: string
          customer_email?: string | null
          document_id: string
          id?: string
          paid_at?: string
          stripe_session_id: string
        }
        Update: {
          amount_aud_cents?: number
          created_at?: string
          customer_email?: string | null
          document_id?: string
          id?: string
          paid_at?: string
          stripe_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      strata_bylaws: {
        Row: {
          confidence: number | null
          created_at: string
          document_date: string | null
          document_id: string
          exterior_renovations_detail: string | null
          exterior_renovations_legal: string | null
          exterior_renovations_value:
            | Database["public"]["Enums"]["attribute_value"]
            | null
          id: string
          interior_renovations_detail: string | null
          interior_renovations_legal: string | null
          interior_renovations_value:
            | Database["public"]["Enums"]["attribute_value"]
            | null
          model_version: string | null
          pets_allowed_detail: string | null
          pets_allowed_legal: string | null
          pets_allowed_value:
            | Database["public"]["Enums"]["attribute_value"]
            | null
          processed_at: string
          property_id: string
          short_term_rental_detail: string | null
          short_term_rental_legal: string | null
          short_term_rental_value:
            | Database["public"]["Enums"]["attribute_value"]
            | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          document_date?: string | null
          document_id: string
          exterior_renovations_detail?: string | null
          exterior_renovations_legal?: string | null
          exterior_renovations_value?:
            | Database["public"]["Enums"]["attribute_value"]
            | null
          id?: string
          interior_renovations_detail?: string | null
          interior_renovations_legal?: string | null
          interior_renovations_value?:
            | Database["public"]["Enums"]["attribute_value"]
            | null
          model_version?: string | null
          pets_allowed_detail?: string | null
          pets_allowed_legal?: string | null
          pets_allowed_value?:
            | Database["public"]["Enums"]["attribute_value"]
            | null
          processed_at?: string
          property_id: string
          short_term_rental_detail?: string | null
          short_term_rental_legal?: string | null
          short_term_rental_value?:
            | Database["public"]["Enums"]["attribute_value"]
            | null
        }
        Update: {
          confidence?: number | null
          created_at?: string
          document_date?: string | null
          document_id?: string
          exterior_renovations_detail?: string | null
          exterior_renovations_legal?: string | null
          exterior_renovations_value?:
            | Database["public"]["Enums"]["attribute_value"]
            | null
          id?: string
          interior_renovations_detail?: string | null
          interior_renovations_legal?: string | null
          interior_renovations_value?:
            | Database["public"]["Enums"]["attribute_value"]
            | null
          model_version?: string | null
          pets_allowed_detail?: string | null
          pets_allowed_legal?: string | null
          pets_allowed_value?:
            | Database["public"]["Enums"]["attribute_value"]
            | null
          processed_at?: string
          property_id?: string
          short_term_rental_detail?: string | null
          short_term_rental_legal?: string | null
          short_term_rental_value?:
            | Database["public"]["Enums"]["attribute_value"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "strata_bylaws_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: true
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strata_bylaws_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      strata_liability_extractions: {
        Row: {
          building_defect_confidence: number | null
          building_defect_responsible_party: string | null
          building_defect_source: string | null
          building_defect_summary: string | null
          combustible_cladding_confidence: number | null
          combustible_cladding_responsible_party: string | null
          combustible_cladding_source: string | null
          combustible_cladding_summary: string | null
          created_at: string
          document_id: string
          id: string
          insurance_excess_confidence: number | null
          insurance_excess_responsible_party: string | null
          insurance_excess_source: string | null
          insurance_excess_summary: string | null
          maintenance_responsibility_confidence: number | null
          maintenance_responsibility_responsible_party: string | null
          maintenance_responsibility_source: string | null
          maintenance_responsibility_summary: string | null
          mixed_use_occupancy_confidence: number | null
          mixed_use_occupancy_responsible_party: string | null
          mixed_use_occupancy_source: string | null
          mixed_use_occupancy_summary: string | null
          pets_confidence: number | null
          pets_responsible_party: string | null
          pets_source: string | null
          pets_summary: string | null
          processed_at: string
          property_id: string
          special_levy_confidence: number | null
          special_levy_responsible_party: string | null
          special_levy_source: string | null
          special_levy_summary: string | null
          str_rules_confidence: number | null
          str_rules_responsible_party: string | null
          str_rules_source: string | null
          str_rules_summary: string | null
        }
        Insert: {
          building_defect_confidence?: number | null
          building_defect_responsible_party?: string | null
          building_defect_source?: string | null
          building_defect_summary?: string | null
          combustible_cladding_confidence?: number | null
          combustible_cladding_responsible_party?: string | null
          combustible_cladding_source?: string | null
          combustible_cladding_summary?: string | null
          created_at?: string
          document_id: string
          id?: string
          insurance_excess_confidence?: number | null
          insurance_excess_responsible_party?: string | null
          insurance_excess_source?: string | null
          insurance_excess_summary?: string | null
          maintenance_responsibility_confidence?: number | null
          maintenance_responsibility_responsible_party?: string | null
          maintenance_responsibility_source?: string | null
          maintenance_responsibility_summary?: string | null
          mixed_use_occupancy_confidence?: number | null
          mixed_use_occupancy_responsible_party?: string | null
          mixed_use_occupancy_source?: string | null
          mixed_use_occupancy_summary?: string | null
          pets_confidence?: number | null
          pets_responsible_party?: string | null
          pets_source?: string | null
          pets_summary?: string | null
          processed_at?: string
          property_id: string
          special_levy_confidence?: number | null
          special_levy_responsible_party?: string | null
          special_levy_source?: string | null
          special_levy_summary?: string | null
          str_rules_confidence?: number | null
          str_rules_responsible_party?: string | null
          str_rules_source?: string | null
          str_rules_summary?: string | null
        }
        Update: {
          building_defect_confidence?: number | null
          building_defect_responsible_party?: string | null
          building_defect_source?: string | null
          building_defect_summary?: string | null
          combustible_cladding_confidence?: number | null
          combustible_cladding_responsible_party?: string | null
          combustible_cladding_source?: string | null
          combustible_cladding_summary?: string | null
          created_at?: string
          document_id?: string
          id?: string
          insurance_excess_confidence?: number | null
          insurance_excess_responsible_party?: string | null
          insurance_excess_source?: string | null
          insurance_excess_summary?: string | null
          maintenance_responsibility_confidence?: number | null
          maintenance_responsibility_responsible_party?: string | null
          maintenance_responsibility_source?: string | null
          maintenance_responsibility_summary?: string | null
          mixed_use_occupancy_confidence?: number | null
          mixed_use_occupancy_responsible_party?: string | null
          mixed_use_occupancy_source?: string | null
          mixed_use_occupancy_summary?: string | null
          pets_confidence?: number | null
          pets_responsible_party?: string | null
          pets_source?: string | null
          pets_summary?: string | null
          processed_at?: string
          property_id?: string
          special_levy_confidence?: number | null
          special_levy_responsible_party?: string | null
          special_levy_source?: string | null
          special_levy_summary?: string | null
          str_rules_confidence?: number | null
          str_rules_responsible_party?: string | null
          str_rules_source?: string | null
          str_rules_summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "strata_liability_extractions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: true
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strata_liability_extractions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      crawl_locations: {
        Row: {
          id: string
          name: string
          display_name: string
          state: string
          region: string
          postcode: string | null
          enabled: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          display_name: string
          state: string
          region: string
          postcode?: string | null
          enabled?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          display_name?: string
          state?: string
          region?: string
          postcode?: string | null
          enabled?: boolean
          created_at?: string
        }
        Relationships: []
      }
      suburb_crawls: {
        Row: {
          docs_found: number
          id: string
          searched_at: string
          suburb: string
        }
        Insert: {
          docs_found?: number
          id?: string
          searched_at?: string
          suburb: string
        }
        Update: {
          docs_found?: number
          id?: string
          searched_at?: string
          suburb?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      attribute_value: "yes" | "no" | "maybe"
      document_type:
        | "strata"
        | "building_inspection"
        | "contract"
        | "lease"
        | "council"
        | "other"
      ingested_via: "manual" | "crawler" | "agent"
      plan_type: "starter" | "growth" | "enterprise"
      property_status: "processing" | "ready" | "failed"
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
      attribute_value: ["yes", "no", "maybe"],
      document_type: [
        "strata",
        "building_inspection",
        "contract",
        "lease",
        "council",
        "other",
      ],
      ingested_via: ["manual", "crawler", "agent"],
      plan_type: ["starter", "growth", "enterprise"],
      property_status: ["processing", "ready", "failed"],
    },
  },
} as const
