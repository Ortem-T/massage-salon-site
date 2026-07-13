import { type Locale } from "@/i18n/config";
import {
  googleReviewUrl,
  salonNotificationAddress,
  salonNotificationLandmark
} from "@/lib/config/public-links";

export type ClientNotificationType =
  | "booking_confirmation"
  | "appointment_reminder"
  | "rebooking"
  | "google_review";

export type ClientNotificationLanguage = Locale;

export type ClientNotificationBooking = {
  date: string;
  time: string;
  serviceName: string;
  durationMinutes: number | null;
  hasClientComment: boolean;
};

export type ClientNotificationInput = {
  clientName: string;
  language: ClientNotificationLanguage;
  type: ClientNotificationType;
  booking?: ClientNotificationBooking | null;
};

const dateLocales: Record<ClientNotificationLanguage, string> = {
  sr: "sr-Latn-RS",
  ru: "ru-RU",
  en: "en-GB"
};

function compactLines(lines: string[]) {
  return lines.filter((line, index, source) => line.trim() || source[index - 1]?.trim()).join("\n").trim();
}

function formatMessageDate(value: string, language: ClientNotificationLanguage) {
  return new Intl.DateTimeFormat(dateLocales[language], {
    day: "numeric",
    month: "long",
    timeZone: "Europe/Belgrade",
    year: "numeric"
  }).format(new Date(`${value}T12:00:00`));
}

function getCommentNotice(language: ClientNotificationLanguage) {
  if (language === "ru") {
    return "Специалист обязательно учтёт ваш комментарий, оставленный при записи.";
  }

  if (language === "en") {
    return "Your therapist will take into account the comment you left with your booking.";
  }

  return "Vaš komentar uz zakazivanje biće prosleđen terapeutu i uzet u obzir.";
}

function getBooking(input: ClientNotificationInput) {
  if (!input.booking) {
    throw new Error("Booking is required for this notification type.");
  }

  return {
    ...input.booking,
    date: formatMessageDate(input.booking.date, input.language),
    duration: String(input.booking.durationMinutes ?? 60),
    commentNotice: input.booking.hasClientComment ? getCommentNotice(input.language) : ""
  };
}

function generateBookingConfirmation(input: ClientNotificationInput) {
  const booking = getBooking(input);

  if (input.language === "ru") {
    return compactLines([
      "Здравствуйте!",
      "",
      "Ваша запись подтверждена:",
      "",
      `Процедура: ${booking.serviceName}`,
      `Дата: ${booking.date}`,
      `Время: ${booking.time}`,
      `Продолжительность: ${booking.duration} мин`,
      "",
      booking.commentNotice,
      "",
      "С уважением,",
      "Rainë"
    ]);
  }

  if (input.language === "en") {
    return compactLines([
      "Hello!",
      "",
      "Your appointment is confirmed:",
      "",
      `Treatment: ${booking.serviceName}`,
      `Date: ${booking.date}`,
      `Time: ${booking.time}`,
      `Duration: ${booking.duration} min`,
      "",
      booking.commentNotice,
      "",
      "Kind regards,",
      "Rainë"
    ]);
  }

  return compactLines([
    "Pozdrav!",
    "",
    "Vaš termin je zakazan:",
    "",
    `Tretman: ${booking.serviceName}`,
    `Datum: ${booking.date}`,
    `Vreme: ${booking.time}`,
    `Trajanje: ${booking.duration} min`,
    "",
    booking.commentNotice,
    "",
    "Srdačan pozdrav,",
    "Rainë"
  ]);
}

function generateAppointmentReminder(input: ClientNotificationInput) {
  const booking = getBooking(input);

  if (input.language === "ru") {
    return compactLines([
      "Здравствуйте!",
      "",
      `Ждём вас сегодня в ${booking.time} на процедуру «${booking.serviceName}».`,
      "",
      "Наш адрес:",
      `${salonNotificationAddress.ru}.`,
      `Ориентир — ${salonNotificationLandmark.ru}.`,
      "",
      "С уважением,",
      "Rainë"
    ]);
  }

  if (input.language === "en") {
    return compactLines([
      "Hello!",
      "",
      `We are looking forward to seeing you today at ${booking.time} for ${booking.serviceName}.`,
      "",
      "Our address:",
      `${salonNotificationAddress.en}.`,
      `Landmark: ${salonNotificationLandmark.en}.`,
      "",
      "Kind regards,",
      "Rainë"
    ]);
  }

  return compactLines([
    "Pozdrav!",
    "",
    `Podsećamo vas da vas danas u ${booking.time} očekujemo na tretmanu ${booking.serviceName}.`,
    "",
    "Naša adresa:",
    `${salonNotificationAddress.sr}.`,
    `Orijentir: ${salonNotificationLandmark.sr}.`,
    "",
    "Srdačan pozdrav,",
    "Rainë"
  ]);
}

function generateRebooking(language: ClientNotificationLanguage) {
  if (language === "ru") {
    return compactLines([
      "Спасибо за визит!",
      "",
      "Когда захотите записаться снова, просто напишите нам удобным способом.",
      "",
      "С уважением,",
      "Rainë"
    ]);
  }

  if (language === "en") {
    return compactLines([
      "Thank you for visiting us!",
      "",
      "When you would like to book again, simply contact us through your preferred messenger.",
      "",
      "Kind regards,",
      "Rainë"
    ]);
  }

  return compactLines([
    "Hvala vam na poseti!",
    "",
    "Kada budete želeli da ponovo zakažete termin, slobodno nam se javite.",
    "",
    "Srdačan pozdrav,",
    "Rainë"
  ]);
}

function generateGoogleReview(language: ClientNotificationLanguage) {
  if (language === "ru") {
    return compactLines([
      "Спасибо, что посетили Rainë!",
      "",
      "Будем благодарны, если вы поделитесь впечатлениями о визите в Google. Ваш отзыв помогает другим клиентам узнать о нашем салоне:",
      "",
      googleReviewUrl,
      "",
      "С уважением,",
      "Rainë"
    ]);
  }

  if (language === "en") {
    return compactLines([
      "Thank you for visiting Rainë!",
      "",
      "We would appreciate it if you shared your experience on Google. Your review helps other clients discover our salon:",
      "",
      googleReviewUrl,
      "",
      "Kind regards,",
      "Rainë"
    ]);
  }

  return compactLines([
    "Hvala vam što ste posetili Rainë!",
    "",
    "Biće nam drago ako podelite svoje utiske na Google-u. Vaša recenzija pomaže drugim klijentima da upoznaju naš salon:",
    "",
    googleReviewUrl,
    "",
    "Srdačan pozdrav,",
    "Rainë"
  ]);
}

export function generateClientNotificationMessage(input: ClientNotificationInput) {
  if (input.type === "booking_confirmation") {
    return generateBookingConfirmation(input);
  }

  if (input.type === "appointment_reminder") {
    return generateAppointmentReminder(input);
  }

  if (input.type === "rebooking") {
    return generateRebooking(input.language);
  }

  return generateGoogleReview(input.language);
}
