const sr = {
  seo: {
    title: "RAINË | Premium masaža u Novom Sadu",
    description:
      "Luxury wellness masažni salon u Novom Sadu sa japanskom spa estetikom, pažljivim terapeutima i ritualima za duboki oporavak.",
    keywords: ["masaža Novi Sad", "spa Novi Sad", "wellness salon", "relax masaža", "Raine Spa"]
  },
  brand: {
    name: "RAINË",
    label: "Massage atelier"
  },
  nav: {
    links: [
      { href: "#services", label: "Usluge" },
      { href: "#benefits", label: "Prednosti" },
      { href: "#about", label: "O salonu" },
      { href: "#contact", label: "Kontakt" }
    ],
    cta: "Zakaži termin",
    menu: "Otvori meni",
    close: "Zatvori meni",
    language: "Jezik"
  },
  hero: {
    eyebrow: "Premium wellness u Novom Sadu",
    title: "Tihi ritual za telo koje ponovo diše",
    subtitle:
      "Personalizovane masaže, topla spa atmosfera i smiren japanski minimalizam za trenutke kada želite da usporite bez kompromisa.",
    cta: "Zakaži termin",
    secondary: "Pogledaj usluge",
    note: "Mirna zona, pažljivi terapeuti, prirodna ulja."
  },
  services: {
    eyebrow: "Usluge",
    title: "Masaže oblikovane prema vašem ritmu",
    subtitle:
      "Svaki tretman počinje kratkom konsultacijom, kako bi pritisak, tempo i fokus bili usklađeni sa vašim telom.",
    items: [
      {
        title: "Signature Raine masaža",
        duration: "75 min",
        price: "od 6.500 RSD",
        description: "Kombinacija relaks, deep tissue i aromaterapijskih tehnika za dubok osećaj lakoće."
      },
      {
        title: "Japanski relax ritual",
        duration: "60 min",
        price: "od 5.200 RSD",
        description: "Spor, fluidan tretman sa toplim peškirima i mirnim pritiskom za potpunu regulaciju."
      },
      {
        title: "Deep tissue oporavak",
        duration: "50 min",
        price: "od 5.800 RSD",
        description: "Fokusiran rad na napetim zonama leđa, vrata i ramena uz preciznu kontrolu pritiska."
      }
    ]
  },
  booking: {
    eyebrow: "Zahtev za termin",
    title: "Zakažite termin bez pritiska",
    subtitle:
      "Izaberite tretman, stručnjaka, željeni datum i vreme, pa ostavite kontakt. Tačan termin potvrđujemo ručno.",
    aside: {
      title: "Miran prvi korak",
      body:
        "Ovo je MVP forma zahteva. Za sada šalje mock zahtev u browser console; kasnije se isti service layer može povezati sa Supabase."
    },
    fields: {
      service: {
        label: "Usluga",
        placeholder: "Izaberite masažu"
      },
      specialist: {
        label: "Specijalista",
        placeholder: "Izaberite specijalistu"
      },
      date: {
        label: "Željeni datum"
      },
      time: {
        label: "Željeno vreme",
        placeholder: "Izaberite vreme"
      },
      name: {
        label: "Ime klijenta",
        placeholder: "Vaše ime"
      },
      phone: {
        label: "Broj telefona",
        placeholder: "+381 ..."
      },
      comment: {
        label: "Komentar",
        placeholder: "Šta treba da znamo? Pritisak, fokus zone, detalji rasporeda..."
      }
    },
    specialistOptions: [
      { value: "any", label: "Bilo koji dostupan specijalista" },
      { value: "mila-petrovic", label: "Mila Petrović" },
      { value: "ana-markovic", label: "Ana Marković" },
      { value: "nikola-jovanovic", label: "Nikola Jovanović" }
    ],
    validation: {
      service: "Izaberite uslugu.",
      specialist: "Izaberite specijalistu.",
      date: "Izaberite željeni datum.",
      time: "Izaberite željeno vreme.",
      name: "Unesite ime.",
      phone: "Unesite broj telefona.",
      comment: "Komentar može imati do 500 karaktera."
    },
    submit: "Zakaži termin",
    submitting: "Šaljemo zahtev",
    formNote: "Bez plaćanja i registracije. Kontaktiraćemo vas radi potvrde.",
    success: {
      title: "Zahtev je primljen",
      message: "Hvala. Proverićemo željeno vreme i uskoro vas kontaktirati."
    },
    statuses: {
      pending: "Na čekanju",
      confirmed: "Potvrđeno",
      cancelled: "Otkazano",
      completed: "Završeno"
    }
  },
  benefits: {
    eyebrow: "Zašto Raine",
    title: "Diskretan luksuz, stručna nega",
    items: [
      "Individualni pristup svakom tretmanu",
      "Tiha atmosfera bez žurbe i preopterećenih termina",
      "Prirodna ulja, topli peškiri i pažljivo odabrani mirisi",
      "Lokacija u Novom Sadu sa lakim pristupom"
    ]
  },
  testimonials: {
    eyebrow: "Utisci",
    title: "Gosti se vraćaju zbog mira koji traje",
    items: [
      {
        quote:
          "Prostor je izuzetno smiren, a masaža precizna i nežna u isto vreme. Osećaj posle tretmana je trajao danima.",
        author: "Milica",
        detail: "Signature masaža"
      },
      {
        quote:
          "Najbolji balans profesionalnosti i topline. Terapeut je odmah razumeo gde držim najviše napetosti.",
        author: "Nikola",
        detail: "Deep tissue oporavak"
      },
      {
        quote:
          "Minimalan enterijer, divan miris i potpuno odsustvo žurbe. Konačno salon koji zaista deluje premium.",
        author: "Jelena",
        detail: "Japanski relax ritual"
      }
    ]
  },
  about: {
    eyebrow: "O salonu",
    title: "Mesto za sporiji, pažljiviji povratak sebi",
    body:
      "Raine Spa je masažni atelier u Novom Sadu inspirisan japanskim spa ritualima, prirodnim teksturama i tihom negom. Naš pristup je smiren, precizan i nenametljiv: slušamo telo, poštujemo granice i gradimo tretman oko onoga što vam je tog dana potrebno.",
    stats: [
      { value: "3", label: "jezika podrške" },
      { value: "7+", label: "rituala nege" },
      { value: "100%", label: "personalizovan tempo" }
    ]
  },
  cta: {
    title: "Rezervišite vreme za tišinu",
    subtitle: "Pošaljite poruku i preporučićemo tretman prema vašem stanju, rasporedu i željenom intenzitetu.",
    button: "Zakaži preko WhatsApp-a"
  },
  contact: {
    eyebrow: "Kontakt",
    title: "Novi Sad, Serbia",
    subtitle: "Adresa salona biće prikazana ovde. Pripremljen je prostor za Google Maps integraciju.",
    addressLabel: "Lokacija",
    address: "Novi Sad, Serbia",
    hoursLabel: "Radno vreme",
    hours: "Pon - Sub, 10:00 - 20:00",
    mapLabel: "Google Maps prostor",
    actions: {
      whatsapp: "WhatsApp",
      telegram: "Telegram",
      instagram: "Instagram"
    }
  },
  footer: {
    text: "Premium masažni salon u Novom Sadu.",
    rights: "Sva prava zadržana."
  }
} as const;

export default sr;
