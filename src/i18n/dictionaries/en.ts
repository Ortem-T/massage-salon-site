const en = {
  seo: {
    title: "RAINË | Premium massage in Novi Sad",
    description:
      "A luxury wellness massage salon in Novi Sad with a Japanese spa aesthetic, attentive therapists, and rituals for deep recovery.",
    keywords: ["massage Novi Sad", "spa Novi Sad", "wellness salon", "relax massage", "Raine Spa"]
  },
  brand: {
    name: "RAINË",
    label: "Massage atelier"
  },
  nav: {
    links: [
      { href: "#services", label: "Services" },
      { href: "#benefits", label: "Benefits" },
      { href: "#about", label: "About" },
      { href: "#contact", label: "Contact" }
    ],
    cta: "Book now",
    menu: "Open menu",
    close: "Close menu",
    language: "Language"
  },
  hero: {
    eyebrow: "Premium wellness in Novi Sad",
    title: "A quiet ritual for a body that breathes again",
    subtitle:
      "Personalized massage, warm spa atmosphere, and calm Japanese minimalism for moments when you want to slow down without compromise.",
    cta: "Book now",
    secondary: "View services",
    note: "Quiet space, attentive therapists, natural oils."
  },
  services: {
    eyebrow: "Services",
    title: "Massages shaped around your rhythm",
    subtitle:
      "Every treatment starts with a short consultation so pressure, pace, and focus can match what your body needs.",
    items: [
      {
        id: "signature-raine",
        title: "Signature Raine massage",
        duration: "75 min",
        price: "from 6,500 RSD",
        description: "A blend of relax, deep tissue, and aromatherapy techniques for a lasting sense of ease."
      },
      {
        id: "japanese-relax",
        title: "Japanese relax ritual",
        duration: "60 min",
        price: "from 5,200 RSD",
        description: "A slow, fluid treatment with warm towels and calm pressure for full nervous-system reset."
      },
      {
        id: "deep-tissue",
        title: "Deep tissue recovery",
        duration: "50 min",
        price: "from 5,800 RSD",
        description: "Focused work on tense back, neck, and shoulder areas with precise pressure control."
      }
    ]
  },
  booking: {
    eyebrow: "Booking request",
    title: "Book an appointment without pressure",
    subtitle:
      "Choose your treatment, specialist, preferred date and time, then leave your contact. We will confirm the exact time manually.",
    aside: {
      title: "A calm first step",
      body:
        "Leave an appointment request and we will carefully check the schedule before confirming the exact time with you."
    },
    fields: {
      service: {
        label: "Service",
        placeholder: "Choose a massage"
      },
      specialist: {
        label: "Specialist",
        placeholder: "Choose a specialist"
      },
      date: {
        label: "Preferred date"
      },
      time: {
        label: "Preferred time",
        placeholder: "Choose a time"
      },
      name: {
        label: "Client name",
        placeholder: "Your name"
      },
      phone: {
        label: "Phone number",
        placeholder: "+381 ..."
      },
      comment: {
        label: "Comment",
        placeholder: "Anything we should know? Pressure preference, focus areas, schedule details..."
      }
    },
    specialistOptions: [
      { value: "any", label: "Any available specialist" },
      { value: "mila-petrovic", label: "Mila Petrović" },
      { value: "ana-markovic", label: "Ana Marković" },
      { value: "nikola-jovanovic", label: "Nikola Jovanović" }
    ],
    validation: {
      service: "Please choose a service.",
      specialist: "Please choose a specialist.",
      date: "Please choose a preferred date.",
      datePast: "Please choose today or a future date.",
      time: "Please choose a preferred time.",
      name: "Please enter your name.",
      phone: "Please enter a phone number.",
      comment: "Comment can be up to 500 characters."
    },
    error: {
      message: "We could not send your request right now. Please try again or contact us directly."
    },
    submit: "Book appointment",
    submitting: "Sending request",
    formNote: "No payment or account required. We will contact you to confirm.",
    success: {
      title: "Request received",
      message: "Thank you. We will review your preferred time and contact you shortly."
    },
    statuses: {
      pending: "Pending",
      confirmed: "Confirmed",
      cancelled: "Cancelled",
      completed: "Completed"
    }
  },
  benefits: {
    eyebrow: "Why Raine",
    title: "Discreet luxury, expert care",
    items: [
      "Individual approach for every treatment",
      "Quiet atmosphere without rushed or overloaded bookings",
      "Natural oils, warm towels, and carefully selected aromas",
      "Novi Sad location with easy access"
    ]
  },
  testimonials: {
    eyebrow: "Reviews",
    title: "Guests return for calm that lasts",
    items: [
      {
        quote:
          "The space is beautifully calm, and the massage was precise and gentle at the same time. The feeling lasted for days.",
        author: "Milica",
        detail: "Signature massage"
      },
      {
        quote:
          "The best balance of professionalism and warmth. The therapist understood immediately where I hold the most tension.",
        author: "Nikola",
        detail: "Deep tissue recovery"
      },
      {
        quote:
          "Minimal interior, beautiful scent, and no sense of rush. Finally a salon that genuinely feels premium.",
        author: "Jelena",
        detail: "Japanese relax ritual"
      }
    ]
  },
  about: {
    eyebrow: "About",
    title: "A place for a slower, more attentive return to yourself",
    body:
      "Raine Spa is a massage atelier in Novi Sad inspired by Japanese spa rituals, natural textures, and quiet care. Our approach is calm, precise, and unobtrusive: we listen to the body, respect boundaries, and shape each treatment around what you need that day.",
    stats: [
      { value: "3", label: "support languages" },
      { value: "7+", label: "care rituals" },
      { value: "100%", label: "personalized pace" }
    ]
  },
  cta: {
    title: "Reserve time for stillness",
    subtitle: "Send us a message and we will recommend a treatment based on your condition, schedule, and preferred intensity.",
    button: "Book via WhatsApp"
  },
  contact: {
    eyebrow: "Contact",
    title: "Novi Sad, Serbia",
    subtitle: "The salon address will appear here. The area is ready for Google Maps integration.",
    addressLabel: "Location",
    address: "Novi Sad, Serbia",
    hoursLabel: "Opening hours",
    hours: "Mon - Sat, 10:00 - 20:00",
    mapLabel: "Google Maps area",
    actions: {
      whatsapp: "WhatsApp",
      telegram: "Telegram",
      instagram: "Instagram"
    }
  },
  footer: {
    text: "Premium massage salon in Novi Sad.",
    rights: "All rights reserved."
  }
} as const;

export default en;
