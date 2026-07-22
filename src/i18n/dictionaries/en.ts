const en = {
  seo: {
    title: "Raine — Massage in Novi Sad | Body and Face Treatments",
    description:
      "Massage salon in Novi Sad with body and face treatments, relaxing massage, sports massage, lymphatic drainage and facial care.",
    keywords: [
      "massage Novi Sad",
      "relaxing massage Novi Sad",
      "sports massage Novi Sad",
      "lymphatic drainage Novi Sad",
      "face massage Novi Sad",
      "anti-cellulite massage Novi Sad"
    ]
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
    eyebrow: "Massage in Novi Sad",
    title: "Care, lightness and beauty in every touch",
    subtitle: "Personalized massage in a warm and calm atmosphere — for self-care, relaxation and recovery.",
    cta: "Book now",
    secondary: "View services",
    note: "Quiet space, attentive therapists, natural oils."
  },
  services: {
    eyebrow: "Services & Prices",
    title: "Treatments tailored to you",
    subtitle:
      "Every visit begins with a short consultation, so the intensity, pace and focus of the treatment match how you feel and what your body needs.",
    categories: {
      face: "Face",
      body: "Body"
    },
    bookingCta: "Book a service",
    cardBookingCta: "Book appointment",
    durationUnit: "min",
    empty: "The service catalog is temporarily unavailable. Please contact us directly to book."
  },
  specialists: {
    eyebrow: "Our team",
    title: "Our specialists",
    description:
      "At Raine, treatments are performed by trained specialists with extensive experience. Each session is carried out with care and attention — according to your needs, how you feel and the treatment you choose.",
    cards: [
      {
        name: "Sergey",
        role: "Body massage, sports massage, lymphatic drainage, taping",
        description:
          "Works with muscle tension, recovery after physical load and an overall feeling of lightness in the body.",
        image: {
          src: "/images/specialists/sergey-massage-therapy.webp",
          alt: "Sergey performing a back massage at Raine salon"
        }
      },
      {
        name: "Ekaterina",
        role: "Face massage, facial microcurrent therapy, women’s sports massage and relax massage",
        description:
          "Works carefully with the face and body, combining precise technique, a calm pace and a caring approach.",
        image: {
          src: "/images/specialists/ekaterina-face-treatment.webp",
          alt: "Ekaterina performing a facial treatment at Raine salon"
        }
      }
    ],
    atmosphere: {
      eyebrow: "Atmosphere",
      title: "Raine atmosphere",
      description: "A calm space, soft light and details that help you settle into rest.",
      images: [
        {
          src: "/images/atmosphere/raine-face-treatment-01.webp",
          alt: "Facial treatment in the calm atmosphere of Raine salon"
        },
        {
          src: "/images/atmosphere/raine-treatment-room-01.webp",
          alt: "Raine massage room with soft light and a calm atmosphere"
        },
        {
          src: "/images/atmosphere/raine-face-treatment-02.webp",
          alt: "Facial microcurrent treatment at Raine salon"
        },
        {
          src: "/images/atmosphere/raine-treatment-room-02.webp",
          alt: "Warm treatment room details at Raine massage salon"
        },
        {
          src: "/images/atmosphere/raine-back-massage-01.webp",
          alt: "Back massage at Raine salon"
        },
        {
          src: "/images/atmosphere/raine-treatment-room-03.webp",
          alt: "Quiet Raine salon space prepared for a treatment"
        }
      ]
    }
  },
  booking: {
    eyebrow: "Book a session",
    title: "Book a time that works for you",
    subtitle:
      "Choose a service, therapist, date and time. We will contact you to confirm the appointment and clarify the details.",
    aside: {
      title: "We’ll help you choose the right session",
      body:
        "If you are not sure which treatment is best for you, leave a comment in the request — we will help you before confirming the appointment."
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
    validation: {
      service: "Please choose a service.",
      specialist: "Please choose a specialist.",
      date: "Please choose a preferred date.",
      datePast: "Please choose today or a future date.",
      dateUnavailable: "Please choose an available date.",
      time: "Please choose a preferred time.",
      name: "Please enter your name.",
      phone: "Please enter a phone number.",
      comment: "Comment can be up to 500 characters."
    },
    calendar: {
      chooseDate: "Choose date",
      previousMonth: "Previous month",
      nextMonth: "Next month",
      unavailable: "Date is unavailable"
    },
    availability: {
      selectTherapistFirst: "Select a therapist first",
      selectServiceFirst: "Select a service first",
      selectSpecialistForService: "Select a specialist for this service",
      noSpecialistsForService: "No specialists are available for this service",
      specialistAutoSelected: "Specialist selected automatically",
      selectDateFirst: "Select a date first",
      loadingTimes: "Loading available times",
      noAvailableTimes: "No available times for this date",
      otherTherapistBookings: "Another therapist has bookings on this date",
      calendarAfterTherapist: "Choose a service and therapist.",
      availableTimes: "Available booking times"
    },
    error: {
      message: "We could not send your request right now. Please try again or contact us directly.",
      slotUnavailable: "This time is no longer available. Please choose another time.",
      serviceTherapistUnavailable: "This service is not available with the selected specialist. Please choose another specialist.",
      rateLimited: "Too many attempts. Please try again later."
    },
    submit: "Book appointment",
    submitting: "Sending request",
    formNote: "After you submit the request, we will confirm your appointment through your preferred messenger.",
    returningClient: {
      welcome: "Welcome back!",
      clear: "Not you? Clear details"
    },
    rebookingLink: {
      supporting: "We filled in your contact details to make booking again faster.",
      error: "This rebooking link is invalid or has expired. You can still complete the form manually."
    },
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
    title: "A calm atmosphere and professional care",
    items: [
      "Personalized approach and professional care",
      "A cozy atmosphere with soft music and aromatic coffee",
      "Natural oils and gentle aromas",
      "Novi Sad location with easy access"
    ]
  },
  testimonials: {
    eyebrow: "Reviews",
    title: "Client reviews",
    description: "Feedback from clients who have already visited Raine.",
    sourceLabel: "Google review",
    googleCta: "View reviews on Google",
    ratingLabel: "5 out of 5"
  },
  about: {
    eyebrow: "ABOUT THE SALON",
    title: "A place where your body rests and recovers",
    body:
      "Raine is a massage salon in Novi Sad where body care meets an attentive approach and a calm atmosphere.\n\nWe tailor each treatment to how you feel, your rhythm and the purpose of your visit — to relax, release tension, recover after physical load or take time for beauty and care.",
    stats: [
      { value: "2", label: "qualified specialists" },
      { value: "7+", label: "professional treatments" },
      { value: "100%", label: "personalized approach" }
    ]
  },
  contact: {
    eyebrow: "Contact",
    title: "Contact us",
    subtitle: "Contact us in the way that feels easiest. We will reply and help you choose a suitable time.",
    addressLabel: "Location",
    landmarkLabel: "Landmark",
    hoursLabel: "Opening hours",
    everyDay: "Every day",
    mapTitle: "Map",
    openInGoogleMaps: "Open in Google Maps",
    actions: {
      whatsapp: "WhatsApp",
      telegram: "Telegram",
      instagram: "Instagram"
    },
    aria: {
      whatsapp: "Message us on WhatsApp",
      telegram: "Message us on Telegram",
      instagram: "Open RAINË Instagram",
      googleMaps: "Open RAINË address in Google Maps"
    }
  },
  footer: {
    text: "Premium massage salon in Novi Sad.",
    navigationLabel: "Footer navigation",
    contactLinksLabel: "RAINË contact links",
    links: {
      whatsapp: "WhatsApp",
      telegram: "Telegram",
      instagram: "Instagram"
    },
    aria: {
      whatsapp: "Message us on WhatsApp",
      telegram: "Message us on Telegram",
      instagram: "Open RAINË Instagram"
    },
    rights: "All rights reserved."
  },
  auth: {
    login: {
      eyebrow: "Staff access",
      title: "Sign in to Raine",
      subtitle: "Use your staff account to open the protected dashboard.",
      fields: {
        email: {
          label: "Email",
          placeholder: "name@raine.rs"
        },
        password: {
          label: "Password",
          placeholder: "Enter password"
        }
      },
      errors: {
        missing: "Enter your email and password.",
        invalid: "The email or password is not valid.",
        forbidden: "This account does not have dashboard access. Ask an admin to set a staff role."
      },
      submit: "Sign in"
    }
  },
  dashboard: {
    title: "Dashboard",
    navigationLabel: "Dashboard navigation",
    signedInAs: "Signed in as",
    unknownEmail: "Staff account",
    roles: {
      admin: "Admin",
      therapist: "Therapist"
    },
    navigation: {
      overview: "Overview",
      bookings: "Bookings",
      schedule: "Schedule",
      promotions: "Promotions",
      clients: "Clients",
      services: "Services",
      therapists: "Therapists"
    },
    pages: {
      overview: {
        eyebrow: "Dashboard",
        title: "Calm operations start here",
        body: "This protected area is ready for booking workflows, schedule views, and staff tools."
      },
      bookings: {
        eyebrow: "Bookings",
        title: "Booking workspace",
        body: "Booking requests will appear here after the dashboard data views are connected."
      },
      clients: {
        eyebrow: "Clients",
        title: "Client records",
        body: "Client details and notes will be added in a later CRM stage."
      },
      services: {
        eyebrow: "Services",
        title: "Service catalog",
        body: "Admin tools for treatments, pricing, duration, and active status will live here."
      },
      therapists: {
        eyebrow: "Therapists",
        title: "Therapist management",
        body: "Admin tools for staff profiles, availability, and service capabilities will live here."
      }
    },
    promotions: {
      eyebrow: "Promotions",
      title: "Booking promo card",
      subtitle: "Manage the calm offer card that can replace the helper note beside the homepage booking form.",
      listTitle: "Promotions",
      formTitle: "Promotion settings",
      create: "Create promotion",
      edit: "Edit",
      active: "Active",
      inactive: "Disabled",
      enable: "Enable",
      disable: "Disable",
      save: "Save",
      saving: "Saving...",
      preview: "Preview",
      noPromotions: "No promotions yet.",
      untitled: "Untitled",
      forbidden: "Only admins can manage promotions.",
      previewTitleFallback: "Promotion title",
      previewDescriptionFallback: "Promotion description will appear here.",
      fields: {
        placement: "Placement",
        badge: "Badge",
        title: "Title",
        description: "Description",
        startsAt: "Start date",
        endsAt: "End date"
      },
      placementLabels: {
        booking_section_card: "Booking section card"
      },
      messages: {
        saved: "Promotion saved.",
        enabled: "Promotion enabled.",
        disabled: "Promotion disabled.",
        error: "Could not save promotion."
      }
    },
    clients: {
      eyebrow: "Clients",
      title: "Client CRM records",
      subtitle: "A practical admin view for contacts, private notes, and appointment history.",
      search: "Search clients",
      addClient: "Add client",
      editClient: "Edit client",
      createTitle: "New client",
      detailsTitle: "Client details",
      bookingHistory: "Booking history",
      lastVisit: "Last visit",
      latestService: "Latest service",
      noClientsYet: "No clients yet.",
      noSearchResults: "No clients match the selected filters.",
      noBookingsYet: "No bookings yet.",
      selectClient: "Select a client or add a new one.",
      noContact: "No contact saved",
      notSet: "Not set",
      forbidden: "Only admins can manage clients.",
      save: "Save",
      saving: "Saving...",
      cancel: "Cancel",
      snapshotWarning: "Changing contact details updates the client record for future bookings. Existing bookings keep their historical contact snapshots.",
      notifications: {
        eyebrow: "Client messages",
        title: "Notifications",
        subtitle: "Generate a text, edit it if needed, and copy it for manual sending.",
        generateAndCopy: "Generate and copy",
        copy: "Copy",
        copied: "Message copied",
        copyFailed: "Could not copy the message. Copy the text manually.",
        bookingRequired: "This message needs a future confirmed or pending booking.",
        bookingDataRequired: "This booking is missing a date, time, or treatment.",
        linkedClientRequired: "No linked client was found for this booking. A personalized rebooking link cannot be created.",
        automaticDateTime: "Automatically select date and time",
        manualRequired: "Select a date and time for the rebooking link.",
        manualUnavailable: "Manual date and time selection is unavailable for this rebooking link.",
        noAvailableTimes: "There are no available times for the selected date.",
        slotUnavailable: "The selected time is no longer available. Choose another time.",
        rebookingNote: "The personal link safely fills the client's name and phone. The details remain editable before the request is sent.",
        tokenStatus: {
          none: "No link created",
          active: "Active",
          expired: "Expired",
          revoked: "Revoked"
        },
        tokenManagement: {
          status: "Link status",
          expires: "Expires",
          generateNew: "Generate new link",
          revoke: "Revoke link"
        },
        tokenMessages: {
          generated: "New link created.",
          revoked: "Link revoked.",
          error: "Could not update the link."
        },
        fields: {
          language: "Message language",
          type: "Message type",
          booking: "Booking",
          date: "Date",
          time: "Time",
          preview: "Message preview"
        },
        placeholders: {
          booking: "Select booking",
          timeSelectDateFirst: "Select a date first"
        },
        languages: {
          sr: "Serbian",
          ru: "Russian",
          en: "English"
        },
        types: {
          booking_confirmation: "Booking confirmation",
          appointment_reminder: "Appointment reminder",
          rebooking: "Book again",
          google_review: "Google review request"
        }
      },
      channels: {
        instagram: "Instagram",
        whatsapp: "WhatsApp",
        telegram: "Telegram",
        viber: "Viber",
        phone: "Phone",
        walk_in: "Walk-in",
        other: "Other"
      },
      filters: {
        contactChannel: "Contact channel",
        locale: "Language",
        bookings: "Bookings",
        allChannels: "All channels",
        allLocales: "All languages",
        allBookings: "All clients",
        withBookings: "Has bookings",
        withoutBookings: "No bookings"
      },
      fields: {
        name: "Name",
        primaryContactChannel: "Main contact channel",
        primaryContactValue: "Main contact",
        phone: "Phone",
        instagram: "Instagram",
        telegram: "Telegram",
        whatsapp: "WhatsApp",
        viber: "Viber",
        locale: "Language",
        notes: "Notes",
        createdAt: "Created",
        updatedAt: "Updated",
        therapist: "Therapist",
        source: "Source"
      },
      placeholders: {
        name: "Client name",
        phone: "+381 ...",
        instagram: "@username",
        telegram: "@username",
        locale: "No language",
        notes: "Private staff notes...",
        contactValue: {
          instagram: "@username",
          whatsapp: "+381 ...",
          telegram: "@username",
          viber: "+381 ...",
          phone: "+381 ...",
          walk_in: "No contact required",
          other: "Contact details"
        }
      },
      metrics: {
        bookings: "bookings"
      },
      messages: {
        created: "Client created.",
        saved: "Client saved.",
        error: "Could not save client."
      },
      errors: {
        name: "Enter the client name.",
        contactValue: "Enter contact details for the selected channel."
      }
    },
    calendar: {
      eyebrow: "Booking calendar",
      title: "Appointments by rhythm, not rows",
      subtitle: "Review requests by day, week, or month and keep status changes close to the appointment context.",
      dataError: "Dashboard data is not available yet. Apply the dashboard schema migration and check staff RLS setup.",
      currentRange: "Current range",
      emptyDay: "No bookings for this day.",
      emptyCompact: "Free",
      mobileMonth: {
        openDay: "Open day",
        today: "Today",
        selected: "Selected date",
        outsideMonth: "Outside current month",
        bookings: {
          one: "booking",
          few: "bookings",
          many: "bookings"
        },
        blocks: {
          one: "blocked time",
          few: "blocked times",
          many: "blocked times"
        }
      },
      statusShort: {
        pending: "Pend",
        confirmed: "Conf",
        cancelled: "Canc",
        completed: "Done"
      },
      scheduleBlocks: {
        unavailable: "Unavailable",
        unavailableAllDay: "Unavailable all day",
        blockedTime: "Blocked time",
        scheduleBlock: "Schedule block",
        openInSchedule: "Open in Schedule",
        fullDay: "All day",
        timeRange: "Time range",
        blockReason: "Block reason",
        salonWide: "Salon-wide block",
        type: "Type",
        date: "Date",
        scope: "Scope",
        noReason: "No reason saved."
      },
      create: {
        action: "Create booking",
        eyebrow: "Manual booking",
        title: "Create booking",
        subtitle: "Add appointments that arrive through messages, calls, or walk-ins.",
        fields: {
          service: "Service",
          sourceChannel: "Source channel",
          date: "Date",
          time: "Time",
          duration: "Duration, minutes",
          locale: "Client language",
          clientSearch: "Find client",
          clientName: "Client name",
          clientPhone: "Client phone",
          clientPhoneOptional: "Phone, if available",
          clientContactValue: "Contact",
          clientNotes: "Client notes",
          therapist: "Therapist",
          status: "Status",
          clientComment: "Client comment",
          internalNotes: "Internal notes"
        },
        placeholders: {
          service: "Choose service",
          therapist: "Choose therapist",
          therapistForService: "Choose a service first",
          noTherapistsForService: "No therapists for this service",
          duration: "Optional",
          clientSearch: "Name, phone, Instagram, Telegram...",
          clientName: "Client name",
          clientPhone: "+381 ...",
          clientNotes: "Preferences, sensitivities, private CRM notes...",
          clientComment: "Request details, preferences, context...",
          internalNotes: "Private staff notes..."
        },
        sourceChannels: {
          instagram: "Instagram",
          whatsapp: "WhatsApp",
          telegram: "Telegram",
          viber: "Viber",
          phone: "Phone",
          walk_in: "Walk-in",
          other: "Other"
        },
        contactPlaceholders: {
          instagram: "@username",
          whatsapp: "+381 ...",
          telegram: "@username",
          viber: "+381 ...",
          phone: "+381 ...",
          walk_in: "No contact required",
          other: "Contact details"
        },
        clientSection: {
          title: "Client",
          subtitle: "Select a client from the database or create a new client while booking.",
          existing: "Existing",
          new: "New",
          empty: "No clients found. Switch to new client to create a profile.",
          walkIn: "Walk-in bookings do not require contact details."
        },
        noPrimaryContact: "No contact saved",
        ownTherapistFallback: "Your therapist profile is not connected yet.",
        servicesAvailableToTherapist: "Only services available to this therapist are shown.",
        noServicesAvailable: "No services are available for manual booking.",
        servicesLoadError: "Failed to load services.",
        serviceSummary: {
          title: "Service details",
          service: "Service",
          duration: "Duration",
          price: "Price",
          category: "Category",
          therapists: "Allowed therapists"
        },
        errors: {
          service: "Choose a service.",
          date: "Choose a date.",
          time: "Choose a time.",
          duration: "Duration must be greater than zero.",
          clientName: "Enter the client name.",
          clientPhone: "Enter the client phone.",
          clientRequired: "Select a client or switch to new client.",
          clientContactValue: "Enter contact details for the selected channel.",
          therapist: "Your therapist profile is required to create bookings.",
          noTherapistsForService: "No therapists are available for this service.",
          serviceTherapistUnavailable: "This therapist does not provide the selected service.",
          sourceChannel: "Choose a source channel.",
          blocked: "This time is blocked."
        },
        submit: "Create booking",
        saving: "Creating...",
        cancel: "Cancel",
        durationUnit: "min",
        success: "Booking created.",
        error: "Could not create booking."
      },
      views: {
        day: "Day",
        week: "Week",
        month: "Month"
      },
      controls: {
        view: "Calendar view",
        status: "Status filter",
        therapist: "Therapist filter",
        previous: "Previous",
        today: "Today",
        next: "Next"
      },
      filters: {
        allStatuses: "All statuses",
        allTherapists: "All therapists",
        unassignedTherapist: "Unassigned"
      },
      details: {
        title: "Booking details",
        close: "Close",
        client: "Client",
        phone: "Phone",
        service: "Service",
        duration: "Duration",
        price: "Price",
        durationNotSet: "Duration not set",
        priceNotSet: "Price not set",
        sourceChannel: "Source",
        locale: "Locale",
        therapist: "Therapist",
        status: "Status",
        comment: "Client comment",
        noComment: "No client comment.",
        internalNotes: "Internal notes",
        assignedTherapist: "Assigned therapist"
      },
      actions: {
        pending: "Set pending",
        confirm: "Confirm",
        cancel: "Cancel",
        complete: "Complete",
        markCompleted: "Mark completed",
        assignTherapist: "Assign therapist",
        saveNotes: "Save notes",
        saving: "Saving...",
        saved: "Saved.",
        forbidden: "This action is not available for your role.",
        serviceRestriction: "The selected therapist does not provide this service.",
        blocked: "This time is no longer available.",
        confirmCancel: "Cancel this booking?",
        error: "Could not save changes."
      }
    },
    schedule: {
      eyebrow: "Schedule",
      title: "Availability blocks",
      subtitle: "Block full days or specific times so clients and staff cannot book unavailable windows.",
      availability: "Availability",
      addBlock: "Add block",
      editBlock: "Edit block",
      deleteBlock: "Delete block",
      cancelEdit: "Cancel edit",
      saving: "Saving...",
      dataError: "Schedule blocks are not available right now. Check the migration and RLS setup.",
      existingBlockHint: "This date has schedule blocks",
      noBlocks: "No schedule blocks for this date.",
      confirmDelete: "Are you sure you want to delete this block?",
      ownTherapistFallback: "Your therapist profile is not connected yet.",
      operationMode: {
        eyebrow: "Salon operation mode",
        title: "Available treatment rooms",
        availableRooms: "Room count",
        oneRoom: "1 room",
        twoRooms: "2 rooms",
        badgeOneRoom: "1 room",
        description: "When only one treatment room is available, only one appointment may exist at the same time regardless of therapist.",
        hint: "This setting immediately affects public booking, manual bookings, and rebooking links.",
        saving: "Saving mode...",
        messages: {
          saved: "Salon operation mode updated.",
          forbidden: "Only admins can change salon operation mode.",
          error: "Could not save salon operation mode."
        }
      },
      fields: {
        date: "Date",
        blockType: "Block type",
        scope: "Scope",
        therapist: "Therapist",
        startTime: "Start time",
        endTime: "End time",
        reason: "Reason"
      },
      placeholders: {
        therapist: "Choose therapist",
        reason: "For example: day off, personal break, private appointment..."
      },
      types: {
        fullDay: "Full day",
        timeRange: "Time range"
      },
      scope: {
        therapist: "Therapist",
        salon: "Salon"
      },
      filters: {
        therapist: "Therapist filter",
        allTherapists: "All therapists"
      },
      messages: {
        created: "Block created.",
        updated: "Block updated.",
        deleted: "Block deleted.",
        error: "Could not save block."
      },
      errors: {
        date: "Choose a date.",
        therapist: "Choose a therapist.",
        ownOnly: "Only your own schedule blocks can be edited.",
        endAfterStart: "End time must be after start time.",
        overlap: "Time block overlaps with an existing block.",
        blocked: "This time is blocked.",
        dayUnavailable: "This day is unavailable."
      },
      reasons: {
        dayOff: "Day off",
        personalBreak: "Personal break",
        privateAppointment: "Private appointment"
      }
    }
  }
} as const;

export default en;
