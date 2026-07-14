import { type Locale } from "@/i18n/config";
import { type BookingStatus } from "@/lib/booking/booking-schema";
import { type ClientContactChannel } from "@/lib/clients/contact";
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
          client_contact_channel: ClientContactChannel | null;
          client_contact_value: string | null;
          client_comment: string | null;
          locale: Locale;
          status: BookingStatus;
          source: string;
          source_channel: ManualBookingSourceChannel | null;
          duration_minutes: number | null;
          promotion_id: string | null;
          promotion_snapshot_title: string | null;
          promotion_snapshot_description: string | null;
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
          client_contact_channel?: ClientContactChannel | null;
          client_contact_value?: string | null;
          client_comment?: string | null;
          locale: Locale;
          status?: BookingStatus;
          source?: string;
          source_channel?: ManualBookingSourceChannel | null;
          duration_minutes?: number | null;
          promotion_id?: string | null;
          promotion_snapshot_title?: string | null;
          promotion_snapshot_description?: string | null;
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
          phone: string | null;
          instagram_username: string | null;
          telegram_username: string | null;
          whatsapp_phone: string | null;
          viber_phone: string | null;
          primary_contact_channel: ClientContactChannel | null;
          primary_contact_value: string | null;
          locale: Locale | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          phone?: string | null;
          instagram_username?: string | null;
          telegram_username?: string | null;
          whatsapp_phone?: string | null;
          viber_phone?: string | null;
          primary_contact_channel?: ClientContactChannel | null;
          primary_contact_value?: string | null;
          locale?: Locale | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["clients"]["Insert"]>;
        Relationships: [];
      };
      client_rebooking_tokens: {
        Row: {
          id: string;
          client_id: string;
          token_hash: string;
          expires_at: string;
          revoked_at: string | null;
          last_used_at: string | null;
          created_by: string | null;
          suggestion_mode: "automatic" | "manual";
          suggested_service_id: string | null;
          suggested_therapist_id: string | null;
          suggested_date: string | null;
          suggested_time: string | null;
          use_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          token_hash: string;
          expires_at: string;
          revoked_at?: string | null;
          last_used_at?: string | null;
          created_by?: string | null;
          suggestion_mode?: "automatic" | "manual";
          suggested_service_id?: string | null;
          suggested_therapist_id?: string | null;
          suggested_date?: string | null;
          suggested_time?: string | null;
          use_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["client_rebooking_tokens"]["Insert"]>;
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
      promotions: {
        Row: {
          id: string;
          active: boolean;
          placement: "booking_section_card";
          starts_at: string | null;
          ends_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          active?: boolean;
          placement?: "booking_section_card";
          starts_at?: string | null;
          ends_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["promotions"]["Insert"]>;
        Relationships: [];
      };
      promotion_translations: {
        Row: {
          id: string;
          promotion_id: string;
          locale: Locale;
          badge: string | null;
          title: string;
          description: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          promotion_id: string;
          locale: Locale;
          badge?: string | null;
          title: string;
          description: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["promotion_translations"]["Insert"]>;
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
    Functions: {
      find_or_create_public_booking_client: {
        Args: {
          client_name: string;
          client_phone: string;
          client_locale: Locale;
        };
        Returns: string;
      };
      create_client_rebooking_token: {
        Args: {
          p_client_id: string;
          p_token_hash: string;
          p_expires_at: string;
        };
        Returns: {
          token_id: string;
          expires_at: string;
          revoked_at: string | null;
          last_used_at: string | null;
          use_count: number;
        }[];
      };
      list_dashboard_booking_clients: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          name: string;
          phone: string | null;
          instagram_username: string | null;
          telegram_username: string | null;
          whatsapp_phone: string | null;
          viber_phone: string | null;
          primary_contact_channel: ClientContactChannel | null;
          primary_contact_value: string | null;
          locale: Locale | null;
          notes: string | null;
        }[];
      };
      resolve_client_rebooking_token: {
        Args: {
          p_token_hash: string;
        };
        Returns: {
          name: string;
          phone: string;
          preferred_locale: Locale | null;
        }[];
      };
      revoke_client_rebooking_token: {
        Args: {
          p_client_id: string;
        };
        Returns: {
          token_id: string;
          expires_at: string;
          revoked_at: string | null;
          last_used_at: string | null;
          use_count: number;
        }[];
      };
    };
    Enums: {
      booking_status: BookingStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
