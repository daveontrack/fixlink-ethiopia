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
          clerk_user_id: string | null;
          role: "customer" | "professional" | "admin";
          full_name: string;
          email: string;
          phone: string | null;
          avatar_url: string | null;
          city: string | null;
          sub_city: string | null;
          address: string | null;
          status: "active" | "suspended" | "pending";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          clerk_user_id?: string | null;
          role?: "customer" | "professional" | "admin";
          full_name: string;
          email: string;
          phone?: string | null;
          avatar_url?: string | null;
          city?: string | null;
          sub_city?: string | null;
          address?: string | null;
          status?: "active" | "suspended" | "pending";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          role?: "customer" | "professional" | "admin";
          full_name?: string;
          email?: string;
          phone?: string | null;
          avatar_url?: string | null;
          city?: string | null;
          sub_city?: string | null;
          address?: string | null;
          status?: "active" | "suspended" | "pending";
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
      quotations: {
        Row: {
          id: string;
          request_id: string;
          customer_id: string;
          professional_id: string;
          status:
            | "draft"
            | "sent"
            | "accepted"
            | "rejected"
            | "expired"
            | "withdrawn";
          subtotal: number;
          transport_fee: number;
          total: number;
          notes: string | null;
          valid_until: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          request_id: string;
          customer_id: string;
          professional_id: string;
          status?:
            | "draft"
            | "sent"
            | "accepted"
            | "rejected"
            | "expired"
            | "withdrawn";
          subtotal: number;
          transport_fee?: number;
          total: number;
          notes?: string | null;
          valid_until: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?:
            | "draft"
            | "sent"
            | "accepted"
            | "rejected"
            | "expired"
            | "withdrawn";
          notes?: string | null;
          valid_until?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      bookings: {
        Row: {
          id: string;
          request_id: string | null;
          quotation_id: string | null;
          customer_id: string;
          professional_id: string;
          status:
            | "pending"
            | "confirmed"
            | "in_progress"
            | "completed"
            | "cancelled";
          payment_status: "unpaid" | "partial" | "paid" | "refunded";
          scheduled_date: string;
          scheduled_time: string;
          duration_hours: number;
          total_price: number;
          address: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          request_id?: string | null;
          quotation_id?: string | null;
          customer_id: string;
          professional_id: string;
          status?:
            | "pending"
            | "confirmed"
            | "in_progress"
            | "completed"
            | "cancelled";
          payment_status?: "unpaid" | "partial" | "paid" | "refunded";
          scheduled_date: string;
          scheduled_time: string;
          duration_hours?: number;
          total_price: number;
          address: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?:
            | "pending"
            | "confirmed"
            | "in_progress"
            | "completed"
            | "cancelled";
          payment_status?: "unpaid" | "partial" | "paid" | "refunded";
          scheduled_date?: string;
          scheduled_time?: string;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
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
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
