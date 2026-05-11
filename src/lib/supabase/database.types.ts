import { type Locale } from "@/i18n/config";
import { type BookingStatus } from "@/lib/booking/booking-schema";

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
        };
        Update: Partial<Database["public"]["Tables"]["bookings"]["Insert"]>;
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
