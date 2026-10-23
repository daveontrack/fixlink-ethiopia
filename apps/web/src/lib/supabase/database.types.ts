export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          auth_user_id: string | null;
          clerk_user_id: string | null;
          email: string | null;
          full_name: string;
          role: Database["public"]["Enums"]["user_role"];
          phone: string | null;
          avatar_url: string | null;
          preferred_language: Database["public"]["Enums"]["language_code"];
          account_status: Database["public"]["Enums"]["account_status"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_user_id?: string | null;
          clerk_user_id?: string | null;
          email?: string | null;
          full_name?: string;
          role?: Database["public"]["Enums"]["user_role"];
          phone?: string | null;
          avatar_url?: string | null;
          preferred_language?: Database["public"]["Enums"]["language_code"];
          account_status?: Database["public"]["Enums"]["account_status"];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          auth_user_id?: string | null;
          clerk_user_id?: string | null;
          email?: string | null;
          full_name?: string;
          role?: Database["public"]["Enums"]["user_role"];
          phone?: string | null;
          avatar_url?: string | null;
          preferred_language?: Database["public"]["Enums"]["language_code"];
          account_status?: Database["public"]["Enums"]["account_status"];
          updated_at?: string;
        };
        Relationships: [];
      };
      service_categories: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          icon: string | null;
          is_active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          icon?: string | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          icon?: string | null;
          is_active?: boolean;
          sort_order?: number;
        };
        Relationships: [];
      };
      professional_services: {
        Row: {
          id: string;
          professional_id: string;
          category_id: string;
          title: string;
          description: string | null;
          base_price: number;
          pricing_unit: "fixed" | "hourly" | "per_meter" | "per_item";
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          professional_id: string;
          category_id: string;
          title: string;
          description?: string | null;
          base_price: number;
          pricing_unit?: "fixed" | "hourly" | "per_meter" | "per_item";
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          base_price?: number;
          pricing_unit?: "fixed" | "hourly" | "per_meter" | "per_item";
          is_active?: boolean;
        };
        Relationships: [];
      };
      professionals: {
        Row: {
          id: string;
          profile_id: string;
          bio: string | null;
          years_of_experience: number;
          verification_status: Database["public"]["Enums"]["verification_status"];
          accepts_requests: boolean;
          service_radius_km: number;
          sub_city_code: string | null;
          base_area_name: string | null;
          base_location: Json | null;
          average_rating: number | null;
          total_reviews: number;
          completed_jobs: number;
          quotation_response_rate: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          bio?: string | null;
          years_of_experience?: number;
          verification_status?: Database["public"]["Enums"]["verification_status"];
          accepts_requests?: boolean;
          service_radius_km?: number;
          sub_city_code?: string | null;
          base_area_name?: string | null;
          base_location?: Json | null;
          average_rating?: number | null;
          total_reviews?: number;
          completed_jobs?: number;
          quotation_response_rate?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          bio?: string | null;
          years_of_experience?: number;
          verification_status?: Database["public"]["Enums"]["verification_status"];
          accepts_requests?: boolean;
          service_radius_km?: number;
          sub_city_code?: string | null;
          base_area_name?: string | null;
          base_location?: Json | null;
          average_rating?: number | null;
          total_reviews?: number;
          completed_jobs?: number;
          quotation_response_rate?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "professionals_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      job_requests: {
        Row: {
          id: string;
          customer_id: string;
          category_id: string;
          title: string;
          description: string;
          priority: Database["public"]["Enums"]["job_priority"];
          status: Database["public"]["Enums"]["job_status"];
          sub_city_code: string;
          area_name: string;
          location: Json;
          match_score: number | null;
          expires_at: string | null;
          idempotency_key: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          category_id: string;
          title: string;
          description: string;
          priority?: Database["public"]["Enums"]["job_priority"];
          status?: Database["public"]["Enums"]["job_status"];
          sub_city_code: string;
          area_name: string;
          location: Json;
          match_score?: number | null;
          expires_at?: string | null;
          idempotency_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string;
          priority?: Database["public"]["Enums"]["job_priority"];
          status?: Database["public"]["Enums"]["job_status"];
          sub_city_code?: string;
          area_name?: string;
          location?: Json;
          match_score?: number | null;
          expires_at?: string | null;
          idempotency_key?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "job_requests_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_requests_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "service_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      quotations: {
        Row: {
          id: string;
          job_id: string;
          professional_id: string;
          labor_cost_etb: number;
          materials_cost_etb: number;
          notes: string;
          proposed_start_at: string | null;
          valid_until: string;
          status: Database["public"]["Enums"]["quotation_status"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          professional_id: string;
          labor_cost_etb: number;
          materials_cost_etb?: number;
          notes: string;
          proposed_start_at?: string | null;
          valid_until: string;
          status?: Database["public"]["Enums"]["quotation_status"];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          labor_cost_etb?: number;
          materials_cost_etb?: number;
          notes?: string;
          proposed_start_at?: string | null;
          valid_until?: string;
          status?: Database["public"]["Enums"]["quotation_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quotations_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "job_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotations_professional_id_fkey";
            columns: ["professional_id"];
            isOneToOne: false;
            referencedRelation: "professionals";
            referencedColumns: ["id"];
          },
        ];
      };
      bookings: {
        Row: {
          id: string;
          job_id: string;
          quotation_id: string;
          customer_id: string;
          professional_id: string;
          scheduled_at: string;
          status: Database["public"]["Enums"]["booking_status"];
          accepted_at: string;
          started_at: string | null;
          completed_at: string | null;
          cancelled_at: string | null;
          cancellation_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          quotation_id: string;
          customer_id: string;
          professional_id: string;
          scheduled_at: string;
          status?: Database["public"]["Enums"]["booking_status"];
          accepted_at?: string;
          started_at?: string | null;
          completed_at?: string | null;
          cancelled_at?: string | null;
          cancellation_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          scheduled_at?: string;
          status?: Database["public"]["Enums"]["booking_status"];
          started_at?: string | null;
          completed_at?: string | null;
          cancelled_at?: string | null;
          cancellation_reason?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "job_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_quotation_id_fkey";
            columns: ["quotation_id"];
            isOneToOne: false;
            referencedRelation: "quotations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_professional_id_fkey";
            columns: ["professional_id"];
            isOneToOne: false;
            referencedRelation: "professionals";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          body: string;
          attachment_url: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          body: string;
          attachment_url?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          body?: string;
          is_read?: boolean;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          body: string;
          href: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          body: string;
          href?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          is_read?: boolean;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          id: string;
          booking_id: string;
          professional_id: string;
          customer_id: string;
          rating: number;
          comment: string | null;
          is_published: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          professional_id: string;
          customer_id: string;
          rating: number;
          comment?: string | null;
          is_published?: boolean;
          created_at?: string;
        };
        Update: {
          rating?: number;
          comment?: string | null;
          is_published?: boolean;
        };
        Relationships: [];
      };
      contact_messages: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string | null;
          subject: string;
          message: string;
          is_handled: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          phone?: string | null;
          subject: string;
          message: string;
          is_handled?: boolean;
          created_at?: string;
        };
        Update: {
          is_handled?: boolean;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          reported_user_id: string | null;
          booking_id: string | null;
          reason: string;
          details: string;
          status: string;
          resolution: string | null;
          resolved_by: string | null;
          resolved_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          reported_user_id?: string | null;
          booking_id?: string | null;
          reason: string;
          details: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          status?: string;
          resolution?: string | null;
          resolved_by?: string | null;
          resolved_at?: string | null;
        };
        Relationships: [];
      };
      sub_cities: {
        Row: {
          code: string;
          name: string;
          name_am: string | null;
          name_om: string | null;
          sort_order: number;
          created_at: string;
          is_active: boolean;
          source: string | null;
          source_code: string | null;
        };
        Insert: {
          code: string;
          name: string;
          name_am?: string | null;
          name_om?: string | null;
          sort_order?: number;
          created_at?: string;
          is_active?: boolean;
          source?: string | null;
          source_code?: string | null;
        };
        Update: {
          name?: string;
          name_am?: string | null;
          name_om?: string | null;
          sort_order?: number;
          is_active?: boolean;
          source?: string | null;
          source_code?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      ensure_profile: {
        Args: {
          p_full_name?: string | null;
          p_phone?: string | null;
          p_avatar_url?: string | null;
          p_email?: string | null;
        };
        Returns: Database["public"]["Tables"]["profiles"]["Row"];
      };
      start_as_professional: {
        Args: { p_years_of_experience?: number; p_bio?: string | null };
        Returns: Database["public"]["Tables"]["professionals"]["Row"];
      };
      set_account_status: {
        Args: {
          p_profile_id: string;
          p_status: Database["public"]["Enums"]["account_status"];
          p_reason?: string | null;
        };
        Returns: Database["public"]["Tables"]["profiles"]["Row"];
      };
    };
    Enums: {
      user_role: "customer" | "professional" | "admin";
      account_status: "active" | "suspended" | "closed";
      verification_status: "pending" | "approved" | "rejected";
      language_code: "en" | "am" | "om";
      job_status:
        | "open"
        | "matching"
        | "quoted"
        | "booked"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "disputed"
        | "expired";
      booking_status: "booked" | "in_progress" | "completed" | "cancelled" | "disputed";
      quotation_status: "submitted" | "selected" | "declined" | "expired";
      job_priority: "normal" | "urgent";
      match_response_status: "pending" | "viewed" | "quoted" | "declined" | "timeout";
      report_reason:
        | "no_show"
        | "poor_quality"
        | "unsafe"
        | "unprofessional"
        | "fraud"
        | "payment_dispute"
        | "other";
      report_status: "open" | "investigating" | "resolved" | "dismissed";
      verification_document_type: "id_card" | "business_license" | "trade_certificate" | "other";
      device_platform: "android" | "ios" | "web";
    };
    CompositeTypes: Record<string, never>;
  };
};
