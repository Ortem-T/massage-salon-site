export const contactConfig = {
  address: "Braće Popović 3g, stan 13, Novi Sad, Serbia",
  mapQuery: "Braće Popović 3g, Novi Sad, Serbia",
  landmark: "Novosadski sajam",
  whatsappUrl: "https://wa.me/381611802516",
  telegramUrl: "https://t.me/raine_novisad",
  instagramUrl: "https://www.instagram.com/raine_massage_ns/",
  viberUrl: null,
  showPhoneNumber: false,
  workingHours: {
    start: "10:00",
    end: "19:00"
  }
} as const;

export function getGoogleMapsEmbedUrl(apiKey: string | undefined) {
  if (!apiKey) {
    return null;
  }

  const params = new URLSearchParams({
    key: apiKey,
    q: contactConfig.mapQuery
  });

  return `https://www.google.com/maps/embed/v1/place?${params.toString()}`;
}

export function getGoogleMapsSearchUrl() {
  const params = new URLSearchParams({
    api: "1",
    query: contactConfig.mapQuery
  });

  return `https://www.google.com/maps/search/?${params.toString()}`;
}
