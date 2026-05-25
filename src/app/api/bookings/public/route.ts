import { handlePublicBookingPost } from "@/server/bookings/public-booking";

export async function POST(request: Request) {
  return handlePublicBookingPost(request);
}

