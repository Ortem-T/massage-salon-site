type TestimonialItem = {
  quote: string;
  author: string;
  detail: string;
};

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
    eyebrow: "Masaža u Novom Sadu",
    title: "Briga, lakoća i lepota u svakom dodiru",
    subtitle: "Individualna masaža u toploj i mirnoj atmosferi — za negu sebe, odmor i oporavak.",
    cta: "Zakaži termin",
    secondary: "Pogledaj usluge",
    note: "Mirna zona, pažljivi terapeuti, prirodna ulja."
  },
  services: {
    eyebrow: "Usluge",
    title: "Tretmani prilagođeni vama",
    subtitle:
      "Svaki dolazak počinje kratkom konsultacijom, kako bi intenzitet, tempo i fokus tretmana odgovarali vašem stanju i osećaju.",
    categories: {
      face: "Lice",
      body: "Telo"
    },
    bookingCta: "Zakaži uslugu",
    durationUnit: "min",
    empty: "Katalog usluga trenutno nije dostupan. Kontaktirajte nas direktno za termine."
  },
  booking: {
    eyebrow: "Zakazivanje termina",
    title: "Zakažite termin koji vam odgovara",
    subtitle:
      "Izaberite uslugu, stručnjaka, datum i vreme. Kontaktiraćemo vas kako bismo potvrdili termin i dogovorili detalje.",
    aside: {
      title: "Pomoći ćemo vam da izaberete odgovarajući tretman",
      body:
        "Ako niste sigurni koji tretman je najbolji za vas, ostavite komentar u prijavi — pomoći ćemo vam pre potvrde termina."
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
    validation: {
      service: "Izaberite uslugu.",
      specialist: "Izaberite specijalistu.",
      date: "Izaberite željeni datum.",
      datePast: "Izaberite današnji ili neki naredni datum.",
      dateUnavailable: "Izaberite dostupan datum.",
      time: "Izaberite željeno vreme.",
      name: "Unesite ime.",
      phone: "Unesite broj telefona.",
      comment: "Komentar može imati do 500 karaktera."
    },
    calendar: {
      chooseDate: "Izaberite datum",
      previousMonth: "Prethodni mesec",
      nextMonth: "Sledeći mesec",
      unavailable: "Datum nije dostupan"
    },
    availability: {
      selectTherapistFirst: "Prvo izaberite terapeuta",
      selectDateFirst: "Prvo izaberite datum",
      loadingTimes: "Učitavamo dostupna vremena",
      noAvailableTimes: "Nema slobodnih termina za ovaj datum",
      otherTherapistBookings: "Drugi terapeut ima termine tog dana",
      calendarAfterTherapist: "Izaberite uslugu i terapeuta.",
      availableTimes: "Dostupna vremena za termin"
    },
    error: {
      message: "Zahtev trenutno nije moguće poslati. Pokušajte ponovo ili nas kontaktirajte direktno.",
      slotUnavailable: "Ovaj termin je upravo zauzet. Izaberite drugo slobodno vreme."
    },
    submit: "Zakaži termin",
    submitting: "Šaljemo zahtev",
    formNote: "Nakon slanja zahteva, potvrdićemo termin putem messengera koji vam najviše odgovara.",
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
    title: "Mirna atmosfera i profesionalna nega",
    items: [
      "Individualni pristup i profesionalna nega",
      "Prijatna atmosfera uz laganu muziku i aromatičnu kafu",
      "Prirodna ulja i nežni mirisi",
      "Lokacija u Novom Sadu sa lakim pristupom"
    ]
  },
  testimonials: {
    eyebrow: "Utisci",
    title: "Gosti se vraćaju zbog mira koji traje",
    items: [] as TestimonialItem[]
  },
  about: {
    eyebrow: "O SALONU",
    title: "Mesto gde telo odmara i obnavlja se",
    body:
      "Raine je salon masaže u Novom Sadu, gde se briga o telu spaja sa pažljivim pristupom i mirnom atmosferom.\n\nTretman prilagođavamo vašem stanju, ritmu i cilju dolaska — da se opustite, oslobodite napetosti, oporavite nakon opterećenja ili posvetite vreme lepoti i nezi.",
    stats: [
      { value: "2", label: "kvalifikovana stručnjaka" },
      { value: "7+", label: "profesionalnih tretmana" },
      { value: "100%", label: "individualni pristup" }
    ]
  },
  contact: {
    eyebrow: "Kontakt",
    title: "Kontaktirajte nas",
    subtitle:
      "Javite nam se na način koji vam najviše odgovara. Odgovorićemo i pomoći da izaberete odgovarajuće vreme.",
    message:
      "Pošaljite nam poruku kroz omiljeni messenger ili otvorite rutu na mapi. Odgovorićemo mirno i pomoći da izaberete odgovarajuće vreme za posetu.",
    addressLabel: "Adresa",
    landmarkLabel: "Orijentir",
    hoursLabel: "Radno vreme",
    everyDay: "Svaki dan",
    mapTitle: "RAINË na mapi",
    openInGoogleMaps: "Otvori u Google Maps",
    actions: {
      whatsapp: "WhatsApp",
      telegram: "Telegram",
      instagram: "Instagram"
    },
    aria: {
      whatsapp: "Pošalji poruku na WhatsApp",
      telegram: "Pošalji poruku na Telegram",
      instagram: "Otvori RAINË Instagram",
      googleMaps: "Otvori RAINË adresu u Google Maps"
    }
  },
  footer: {
    text: "Premium masažni salon u Novom Sadu.",
    navigationLabel: "Navigacija u footeru",
    contactLinksLabel: "RAINË kontakt linkovi",
    links: {
      whatsapp: "WhatsApp",
      telegram: "Telegram",
      instagram: "Instagram"
    },
    aria: {
      whatsapp: "Pošalji poruku na WhatsApp",
      telegram: "Pošalji poruku na Telegram",
      instagram: "Otvori RAINË Instagram"
    },
    rights: "Sva prava zadržana."
  },
  auth: {
    login: {
      eyebrow: "Pristup za tim",
      title: "Prijava u Raine",
      subtitle: "Koristite svoj nalog za osoblje da otvorite zaštićeni dashboard.",
      fields: {
        email: {
          label: "Email",
          placeholder: "ime@raine.rs"
        },
        password: {
          label: "Lozinka",
          placeholder: "Unesite lozinku"
        }
      },
      errors: {
        missing: "Unesite email i lozinku.",
        invalid: "Email ili lozinka nisu ispravni.",
        forbidden: "Ovaj nalog nema pristup dashboardu. Zamolite admina da dodeli ulogu osoblja."
      },
      submit: "Prijavi se"
    }
  },
  dashboard: {
    title: "Dashboard",
    navigationLabel: "Dashboard navigacija",
    signedInAs: "Prijavljeni ste kao",
    unknownEmail: "Nalog osoblja",
    roles: {
      admin: "Admin",
      therapist: "Terapeut"
    },
    navigation: {
      overview: "Pregled",
      bookings: "Termini",
      schedule: "Raspored",
      clients: "Klijenti",
      services: "Usluge",
      therapists: "Terapeuti"
    },
    pages: {
      overview: {
        eyebrow: "Dashboard",
        title: "Mirna operativa počinje ovde",
        body: "Ova zaštićena zona je spremna za tokove termina, raspored i alate za tim."
      },
      bookings: {
        eyebrow: "Termini",
        title: "Radni prostor za termine",
        body: "Zahtevi za termine će biti prikazani ovde kada povežemo dashboard prikaze podataka."
      },
      clients: {
        eyebrow: "Klijenti",
        title: "Evidencija klijenata",
        body: "Detalji o klijentima i beleške biće dodati u kasnijoj CRM fazi."
      },
      services: {
        eyebrow: "Usluge",
        title: "Katalog usluga",
        body: "Admin alati za tretmane, cene, trajanje i aktivan status biće ovde."
      },
      therapists: {
        eyebrow: "Terapeuti",
        title: "Upravljanje terapeutima",
        body: "Admin alati za profile tima, dostupnost i usluge koje terapeut radi biće ovde."
      }
    },
    calendar: {
      eyebrow: "Kalendar termina",
      title: "Termini po ritmu, ne po tabeli",
      subtitle: "Pregledajte zahteve po danu, nedelji ili mesecu i menjajte status uz kontekst termina.",
      dataError: "Dashboard podaci još nisu dostupni. Primenite dashboard schema migraciju i proverite staff RLS podešavanje.",
      currentRange: "Trenutni period",
      emptyDay: "Nema termina za ovaj dan.",
      emptyCompact: "Slobodno",
      statusShort: {
        pending: "Čeka",
        confirmed: "Potv",
        cancelled: "Otk",
        completed: "Got"
      },
      create: {
        action: "Napravi termin",
        eyebrow: "Ručni unos",
        title: "Napravi termin",
        subtitle: "Dodajte termin kada se klijent javi porukom, pozivom ili dođe lično.",
        fields: {
          service: "Usluga",
          sourceChannel: "Izvor",
          date: "Datum",
          time: "Vreme",
          duration: "Trajanje, minuti",
          locale: "Jezik klijenta",
          clientName: "Ime klijenta",
          clientPhone: "Telefon klijenta",
          therapist: "Terapeut",
          status: "Status",
          clientComment: "Komentar klijenta",
          internalNotes: "Interne beleške"
        },
        placeholders: {
          service: "Izaberite uslugu",
          therapist: "Izaberite terapeuta",
          duration: "Opcionalno",
          clientName: "Ime klijenta",
          clientPhone: "+381 ...",
          clientComment: "Detalji zahteva, preferencije, kontekst...",
          internalNotes: "Privatne beleške tima..."
        },
        sourceChannels: {
          instagram: "Instagram",
          whatsapp: "WhatsApp",
          telegram: "Telegram",
          viber: "Viber",
          phone: "Telefon",
          walk_in: "Lično",
          other: "Drugo"
        },
        ownTherapistFallback: "Vaš profil terapeuta još nije povezan.",
        errors: {
          service: "Izaberite uslugu.",
          date: "Izaberite datum.",
          time: "Izaberite vreme.",
          duration: "Trajanje mora biti veće od nule.",
          clientName: "Unesite ime klijenta.",
          clientPhone: "Unesite telefon klijenta.",
          therapist: "Za kreiranje termina potreban je vaš profil terapeuta.",
          sourceChannel: "Izaberite izvor.",
          blocked: "Ovo vreme je blokirano."
        },
        submit: "Napravi termin",
        saving: "Kreiramo...",
        cancel: "Otkaži",
        durationUnit: "min",
        success: "Termin je napravljen.",
        error: "Termin nije moguće napraviti."
      },
      views: {
        day: "Dan",
        week: "Nedelja",
        month: "Mesec"
      },
      controls: {
        view: "Prikaz kalendara",
        status: "Filter statusa",
        therapist: "Filter terapeuta",
        previous: "Prethodno",
        today: "Danas",
        next: "Sledeće"
      },
      filters: {
        allStatuses: "Svi statusi",
        allTherapists: "Svi terapeuti",
        unassignedTherapist: "Nije dodeljeno"
      },
      details: {
        title: "Detalji termina",
        close: "Zatvori",
        client: "Klijent",
        phone: "Telefon",
        service: "Usluga",
        duration: "Trajanje",
        sourceChannel: "Izvor",
        locale: "Jezik",
        therapist: "Terapeut",
        status: "Status",
        comment: "Komentar klijenta",
        noComment: "Nema komentara klijenta.",
        internalNotes: "Interne beleške",
        assignedTherapist: "Dodeljeni terapeut"
      },
      actions: {
        pending: "Vrati na čekanje",
        confirm: "Potvrdi",
        cancel: "Otkaži",
        complete: "Završi",
        markCompleted: "Označi kao završeno",
        assignTherapist: "Dodeli terapeuta",
        saveNotes: "Sačuvaj beleške",
        saving: "Čuvamo...",
        saved: "Sačuvano.",
        forbidden: "Ova radnja nije dostupna za vašu ulogu.",
        confirmCancel: "Otkazati ovaj termin?",
        error: "Izmene nije moguće sačuvati."
      }
    },
    schedule: {
      eyebrow: "Raspored",
      title: "Blokade dostupnosti",
      subtitle: "Blokirajte ceo dan ili određeno vreme da klijenti i tim ne mogu da naprave termin u nedostupnim periodima.",
      availability: "Dostupnost",
      addBlock: "Dodaj blokadu",
      editBlock: "Izmeni blokadu",
      deleteBlock: "Obriši blokadu",
      cancelEdit: "Otkaži izmenu",
      saving: "Čuvamo...",
      dataError: "Blokade rasporeda trenutno nisu dostupne. Proverite migraciju i RLS.",
      existingBlockHint: "Ovaj datum ima blokade",
      noBlocks: "Nema blokada rasporeda za ovaj datum.",
      confirmDelete: "Da li ste sigurni da želite da obrišete ovu blokadu?",
      ownTherapistFallback: "Vaš profil terapeuta još nije povezan.",
      fields: {
        date: "Datum",
        blockType: "Tip blokade",
        scope: "Obuhvat",
        therapist: "Terapeut",
        startTime: "Početak",
        endTime: "Kraj",
        reason: "Razlog"
      },
      placeholders: {
        therapist: "Izaberite terapeuta",
        reason: "Na primer: slobodan dan, lična pauza, privatni termin..."
      },
      types: {
        fullDay: "Ceo dan",
        timeRange: "Vremenski interval"
      },
      scope: {
        therapist: "Terapeut",
        salon: "Ceo salon"
      },
      filters: {
        therapist: "Filter terapeuta",
        allTherapists: "Svi terapeuti"
      },
      messages: {
        created: "Blokada je napravljena.",
        updated: "Blokada je ažurirana.",
        deleted: "Blokada je obrisana.",
        error: "Blokadu nije moguće sačuvati."
      },
      errors: {
        date: "Izaberite datum.",
        therapist: "Izaberite terapeuta.",
        ownOnly: "Možete menjati samo svoje blokade rasporeda.",
        endAfterStart: "Vreme završetka mora biti posle početka.",
        overlap: "Vremenska blokada se preklapa sa postojećom blokadom.",
        blocked: "Ovo vreme je blokirano.",
        dayUnavailable: "Ovaj dan nije dostupan."
      },
      reasons: {
        dayOff: "Slobodan dan",
        personalBreak: "Lična pauza",
        privateAppointment: "Privatni termin"
      }
    }
  }
} as const;

export default sr;
