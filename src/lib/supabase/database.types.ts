import { type Locale } from "@/i18n/config";
import { type BookingStatus } from "@/lib/booking/booking-schema";
import { type ManualBookingSourceChannel } from "@/lib/dashboard/constants";

export type ScheduleBlockType = "full_day" | "time_range";
export type ScheduleBlockScope = "therapist" | "salon";

export type Database = {
  public: {
    Tables: {
      bookings: {
        Row: {
          id: string;
          created_at: string;
          service: string;
          specialist: string;
          preferred_date: string;
          preferred_time: string;
          client_name: string;
          client_phone: string;
          client_comment: string | null;
          locale: Locale;
          status: BookingStatus;
          source: string;
          source_channel: ManualBookingSourceChannel | null;
          duration_minutes: number | null;
          client_id: string | null;
          therapist_id: string | null;
          internal_notes: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          service: string;
          specialist: string;
          preferred_date: string;
          preferred_time: string;
          client_name: string;
          client_phone: string;
          client_comment?: string | null;
          locale: Locale;
          status?: BookingStatus;
          source?: string;
          source_channel?: ManualBookingSourceChannel | null;
          duration_minutes?: number | null;
          client_id?: string | null;
          therapist_id?: string | null;
          internal_notes?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["bookings"]["Insert"]>;
        Relationships: [];
      };
      clients: {
        Row: {
          id: string;
          name: string;
          phone: string;
          locale: Locale;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          phone: string;
          locale: Locale;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["clients"]["Insert"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: "admin" | "therapist";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role: "admin" | "therapist";
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      services: {
        Row: {
          id: string;
          slug: string;
          category: "face" | "body";
          duration_minutes: number;
          price_rsd: number | null;
          active: boolean;
          bookable_online: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          category?: "face" | "body";
          duration_minutes: number;
          price_rsd?: number | null;
          active?: boolean;
          bookable_online?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["services"]["Insert"]>;
        Relationships: [];
      };
      service_translations: {
        Row: {
          service_id: string;
          locale: Locale;
          name: string;
          short_description: string;
          description: string | null;
        };
        Insert: {
          service_id: string;
          locale: Locale;
          name: string;
          short_description: string;
          description?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["service_translations"]["Insert"]>;
        Relationships: [];
      };
      schedule_blocks: {
        Row: {
          id: string;
          therapist_id: string | null;
          created_by: string | null;
          block_type: ScheduleBlockType;
          block_scope: ScheduleBlockScope;
          date: string;
          start_time: string | null;
          end_time: string | null;
          reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          therapist_id?: string | null;
          created_by?: string | null;
          block_type: ScheduleBlockType;
          block_scope?: ScheduleBlockScope;
          date: string;
          start_time?: string | null;
          end_time?: string | null;
          reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["schedule_blocks"]["Insert"]>;
        Relationships: [];
      };
      therapists: {
        Row: {
          id: string;
          profile_id: string | null;
          display_name: string;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id?: string | null;
          display_name: string;
          active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["therapists"]["Insert"]>;
        Relationships: [];
      };
      therapist_translations: {
        Row: {
          therapist_id: string;
          locale: Locale;
          display_name: string;
          public_title: string | null;
        };
        Insert: {
          therapist_id: string;
          locale: Locale;
          display_name: string;
          public_title?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["therapist_translations"]["Insert"]>;
        Relationships: [];
      };
      therapist_services: {
        Row: {
          id: string;
          therapist_id: string;
          service_id: string;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          therapist_id: string;
          service_id: string;
          active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["therapist_services"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      public_booking_availability: {
        Row: {
          booking_date: string;
          preferred_time: string;
          therapist_id: string | null;
          service_slug: string;
          duration_minutes: number;
          status: BookingStatus;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      public_schedule_block_availability: {
        Row: {
          block_date: string;
          therapist_id: string | null;
          block_type: ScheduleBlockType;
          block_scope: ScheduleBlockScope;
          start_time: string | null;
          end_time: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: {
      booking_status: BookingStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
