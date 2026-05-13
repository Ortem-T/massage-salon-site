import { type Locale } from "@/i18n/config";
import { type BookingStatus } from "@/lib/booking/booking-schema";
import { type ManualBookingSourceChannel } from "@/lib/dashboard/constants";

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
          duration_minutes: number;
          price_rsd: number | null;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          duration_minutes: number;
          price_rsd?: number | null;
          active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["services"]["Insert"]>;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      booking_status: BookingStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
