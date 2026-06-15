const ru = {
  seo: {
    title: "Raine — массаж в Нови-Саде | Процедуры для тела и лица",
    description:
      "Массажный салон Raine в Нови-Саде. Процедуры для тела и лица, релакс-массаж, спортивный массаж, лимфодренаж и уход за лицом.",
    keywords: [
      "массаж Нови Сад",
      "массаж Нови-Сад",
      "релакс массаж Нови Сад",
      "спортивный массаж Нови Сад",
      "лимфодренаж Нови Сад",
      "массаж лица Нови Сад"
    ]
  },
  brand: {
    name: "RAINË",
    label: "Massage atelier"
  },
  nav: {
    links: [
      { href: "#services", label: "Услуги" },
      { href: "#benefits", label: "Преимущества" },
      { href: "#about", label: "О салоне" },
      { href: "#contact", label: "Контакты" }
    ],
    cta: "Записаться",
    menu: "Открыть меню",
    close: "Закрыть меню",
    language: "Язык"
  },
  hero: {
    eyebrow: "Массаж в Нови-Саде",
    title: "Забота, лёгкость и красота в каждом прикосновении",
    subtitle: "Индивидуальный массаж в тёплой и спокойной атмосфере — для заботы о себе, отдыха и восстановления.",
    cta: "Записаться",
    secondary: "Смотреть услуги",
    note: "Спокойная зона, внимательные терапевты, натуральные масла."
  },
  services: {
    eyebrow: "Услуги и цены",
    title: "Процедуры, настроенные под вас",
    subtitle:
      "Каждая встреча начинается с короткой консультации, чтобы интенсивность, темп и акцент процедуры соответствовали вашему состоянию и ощущениям.",
    categories: {
      face: "Лицо",
      body: "Тело"
    },
    bookingCta: "Записаться на услугу",
    cardBookingCta: "Записаться",
    durationUnit: "мин",
    empty: "Каталог услуг сейчас недоступен. Свяжитесь с нами напрямую для записи."
  },
  specialists: {
    eyebrow: "Команда Raine",
    title: "Наши специалисты",
    description:
      "В Raine работают специалисты с профильной подготовкой и большим опытом. Каждый сеанс проводится внимательно и аккуратно — с учетом вашего запроса, самочувствия и выбранной процедуры.",
    cards: [
      {
        name: "Сергей",
        role: "Массаж тела, спортивный массаж, лимфодренаж, тейпирование",
        description:
          "Работает с мышечным напряжением, восстановлением после нагрузки и общим ощущением легкости в теле.",
        image: {
          src: "/images/specialists/sergey-massage-therapy.webp",
          alt: "Сергей выполняет массаж спины в салоне Raine"
        }
      },
      {
        name: "Екатерина",
        role: "Массаж лица, микротоки лица, женский спортивный массаж и релакс-массаж",
        description:
          "Внимательно работает с лицом и телом, сочетая аккуратную технику, спокойный темп и заботливый подход.",
        image: {
          src: "/images/specialists/ekaterina-face-treatment.webp",
          alt: "Екатерина выполняет процедуру для лица в салоне Raine"
        }
      }
    ],
    atmosphere: {
      eyebrow: "Атмосфера",
      title: "Атмосфера Raine",
      description: "Спокойное пространство, мягкий свет и детали, которые помогают настроиться на отдых.",
      images: [
        {
          src: "/images/atmosphere/raine-face-treatment-01.webp",
          alt: "Процедура для лица в спокойной атмосфере салона Raine"
        },
        {
          src: "/images/atmosphere/raine-face-treatment-02.webp",
          alt: "Микротоковая процедура для лица в салоне Raine"
        },
        {
          src: "/images/atmosphere/raine-back-massage-01.webp",
          alt: "Массаж спины в салоне Raine"
        },
        {
          src: "/images/atmosphere/raine-treatment-room-01.webp",
          alt: "Массажный кабинет Raine с мягким светом и спокойной атмосферой"
        }
      ]
    }
  },
  booking: {
    eyebrow: "Запись на сеанс",
    title: "Запишитесь в удобное время",
    subtitle:
      "Выберите услугу, специалиста, дату и время. Мы свяжемся с вами, чтобы подтвердить запись и уточнить детали.",
    aside: {
      title: "Поможем подобрать подходящий сеанс",
      body:
        "Если вы не уверены, какая процедура подойдет лучше, оставьте комментарий в заявке — мы подскажем перед подтверждением записи."
    },
    fields: {
      service: {
        label: "Услуга",
        placeholder: "Выберите массаж"
      },
      specialist: {
        label: "Специалист",
        placeholder: "Выберите специалиста"
      },
      date: {
        label: "Желаемая дата"
      },
      time: {
        label: "Желаемое время",
        placeholder: "Выберите время"
      },
      name: {
        label: "Имя клиента",
        placeholder: "Ваше имя"
      },
      phone: {
        label: "Телефон",
        placeholder: "+381 ..."
      },
      comment: {
        label: "Комментарий",
        placeholder: "Что важно учесть? Давление, зоны фокуса, детали расписания..."
      }
    },
    validation: {
      service: "Выберите услугу.",
      specialist: "Выберите специалиста.",
      date: "Выберите желаемую дату.",
      datePast: "Выберите сегодняшнюю или будущую дату.",
      dateUnavailable: "Выберите доступную дату.",
      time: "Выберите желаемое время.",
      name: "Введите имя.",
      phone: "Введите телефон.",
      comment: "Комментарий может быть до 500 символов."
    },
    calendar: {
      chooseDate: "Выберите дату",
      previousMonth: "Предыдущий месяц",
      nextMonth: "Следующий месяц",
      unavailable: "Дата недоступна"
    },
    availability: {
      selectTherapistFirst: "Сначала выберите массажиста",
      selectServiceFirst: "Сначала выберите услугу",
      selectSpecialistForService: "Выберите специалиста для этой услуги",
      noSpecialistsForService: "Для этой услуги нет доступных специалистов",
      specialistAutoSelected: "Специалист выбран автоматически",
      selectDateFirst: "Сначала выберите дату",
      loadingTimes: "Загружаем доступное время",
      noAvailableTimes: "На эту дату нет свободного времени",
      otherTherapistBookings: "У другого массажиста есть записи в этот день",
      calendarAfterTherapist: "Выберите услугу и массажиста.",
      availableTimes: "Доступное время для записи"
    },
    error: {
      message: "Сейчас не удалось отправить заявку. Попробуйте еще раз или свяжитесь с нами напрямую.",
      slotUnavailable: "Это время уже занято. Пожалуйста, выберите другое время.",
      serviceTherapistUnavailable: "Эта услуга недоступна у выбранного специалиста. Выберите другого специалиста.",
      rateLimited: "Слишком много попыток. Попробуйте позже."
    },
    submit: "Записаться",
    submitting: "Отправляем заявку",
    formNote: "После отправки заявки мы подтвердим запись в удобном для вас мессенджере.",
    success: {
      title: "Заявка получена",
      message: "Спасибо. Мы проверим желаемое время и скоро свяжемся с вами."
    },
    statuses: {
      pending: "Ожидает",
      confirmed: "Подтверждена",
      cancelled: "Отменена",
      completed: "Завершена"
    }
  },
  benefits: {
    eyebrow: "Почему Raine",
    title: "Спокойная атмосфера и профессиональная забота",
    items: [
      "Индивидуальный подход и профессиональная забота",
      "Уютная атмосфера с приятной музыкой и ароматным кофе",
      "Натуральные масла и нежные ароматы",
      "Локация в Нови-Саде с удобным доступом"
    ]
  },
  testimonials: {
    eyebrow: "Отзывы",
    title: "Гости возвращаются за спокойствием, которое остается",
    items: []
  },
  about: {
    eyebrow: "О САЛОНЕ",
    title: "Место, где тело отдыхает и восстанавливается",
    body:
      "Raine — массажный салон в Нови-Саде, где забота о теле соединяется с внимательным подходом и спокойной атмосферой.\n\nМы подбираем процедуру под ваше состояние, ритм и цель визита — расслабиться, снять напряжение, восстановиться после нагрузки или уделить время красоте и уходу.",
    stats: [
      { value: "2", label: "квалифицированных специалиста" },
      { value: "7+", label: "профессиональных процедур" },
      { value: "100%", label: "персональный подход" }
    ]
  },
  contact: {
    eyebrow: "Контакты",
    title: "Свяжитесь с нами",
    subtitle: "Свяжитесь с нами удобным способом. Мы ответим и поможем подобрать подходящее время.",
    addressLabel: "Локация",
    landmarkLabel: "Ориентир",
    hoursLabel: "Часы работы",
    everyDay: "Каждый день",
    mapTitle: "Карта",
    openInGoogleMaps: "Открыть в Google Maps",
    actions: {
      whatsapp: "WhatsApp",
      telegram: "Telegram",
      instagram: "Instagram"
    },
    aria: {
      whatsapp: "Написать в WhatsApp",
      telegram: "Написать в Telegram",
      instagram: "Открыть Instagram RAINË",
      googleMaps: "Открыть адрес RAINË в Google Maps"
    }
  },
  footer: {
    text: "Премиальный массажный салон в Нови-Саде.",
    navigationLabel: "Навигация футера",
    contactLinksLabel: "Контакты RAINË",
    links: {
      whatsapp: "WhatsApp",
      telegram: "Telegram",
      instagram: "Instagram"
    },
    aria: {
      whatsapp: "Написать в WhatsApp",
      telegram: "Написать в Telegram",
      instagram: "Открыть Instagram RAINË"
    },
    rights: "Все права защищены."
  },
  auth: {
    login: {
      eyebrow: "Доступ для команды",
      title: "Вход в Raine",
      subtitle: "Используйте аккаунт сотрудника, чтобы открыть защищенную панель.",
      fields: {
        email: {
          label: "Email",
          placeholder: "name@raine.rs"
        },
        password: {
          label: "Пароль",
          placeholder: "Введите пароль"
        }
      },
      errors: {
        missing: "Введите email и пароль.",
        invalid: "Email или пароль неверны.",
        forbidden: "У этого аккаунта нет доступа к панели. Попросите администратора назначить роль сотрудника."
      },
      submit: "Войти"
    }
  },
  dashboard: {
    title: "Панель",
    navigationLabel: "Навигация панели",
    signedInAs: "Вы вошли как",
    unknownEmail: "Аккаунт сотрудника",
    roles: {
      admin: "Администратор",
      therapist: "Массажист"
    },
    navigation: {
      overview: "Обзор",
      bookings: "Записи",
      schedule: "Расписание",
      promotions: "Акции",
      clients: "Клиенты",
      services: "Услуги",
      therapists: "Массажисты"
    },
    pages: {
      overview: {
        eyebrow: "Панель",
        title: "Спокойная операционная работа начинается здесь",
        body: "Эта защищенная зона готова для процессов записи, расписания и инструментов команды."
      },
      bookings: {
        eyebrow: "Записи",
        title: "Рабочая зона записей",
        body: "Заявки на запись появятся здесь после подключения dashboard-представлений данных."
      },
      clients: {
        eyebrow: "Клиенты",
        title: "Карточки клиентов",
        body: "Данные клиентов и заметки будут добавлены на следующем CRM-этапe."
      },
      services: {
        eyebrow: "Услуги",
        title: "Каталог услуг",
        body: "Админ-инструменты для процедур, цен, длительности и активного статуса будут здесь."
      },
      therapists: {
        eyebrow: "Массажисты",
        title: "Управление массажистами",
        body: "Админ-инструменты для профилей команды, доступности и услуг специалистов будут здесь."
      }
    },
    promotions: {
      eyebrow: "Акции",
      title: "Промо-карточка записи",
      subtitle: "Управляйте спокойным промо-блоком, который заменяет подсказку слева от формы записи на главной странице.",
      listTitle: "Акции",
      formTitle: "Настройки акции",
      create: "Создать акцию",
      edit: "Редактировать",
      active: "Активна",
      inactive: "Выключена",
      enable: "Включить",
      disable: "Выключить",
      save: "Сохранить",
      saving: "Сохраняем...",
      preview: "Превью",
      noPromotions: "Акций пока нет.",
      untitled: "Без названия",
      forbidden: "Только администраторы могут управлять акциями.",
      previewTitleFallback: "Заголовок акции",
      previewDescriptionFallback: "Описание акции появится здесь.",
      fields: {
        placement: "Размещение",
        badge: "Бейдж",
        title: "Заголовок",
        description: "Описание",
        startsAt: "Дата начала",
        endsAt: "Дата окончания"
      },
      placementLabels: {
        booking_section_card: "Карточка в блоке записи"
      },
      messages: {
        saved: "Акция сохранена.",
        enabled: "Акция включена.",
        disabled: "Акция выключена.",
        error: "Не удалось сохранить акцию."
      }
    },
    clients: {
      eyebrow: "Клиенты",
      title: "CRM-карточки клиентов",
      subtitle: "Практичный список контактов, заметок и истории записей для администратора салона.",
      search: "Поиск клиентов",
      addClient: "Добавить клиента",
      editClient: "Редактировать",
      createTitle: "Новый клиент",
      detailsTitle: "Детали клиента",
      bookingHistory: "История записей",
      lastVisit: "Последний визит",
      latestService: "Последняя услуга",
      noClientsYet: "Клиентов пока нет.",
      noSearchResults: "Клиенты по выбранным фильтрам не найдены.",
      noBookingsYet: "Записей пока нет.",
      selectClient: "Выберите клиента или добавьте нового.",
      noContact: "Контакт не указан",
      notSet: "Не указано",
      forbidden: "Только администраторы могут управлять клиентами.",
      save: "Сохранить",
      saving: "Сохраняем...",
      cancel: "Отмена",
      snapshotWarning: "Изменение контакта обновляет карточку клиента для будущих записей. Старые записи сохраняют свои исторические контактные данные.",
      channels: {
        instagram: "Instagram",
        whatsapp: "WhatsApp",
        telegram: "Telegram",
        viber: "Viber",
        phone: "Телефон",
        walk_in: "Лично",
        other: "Другое"
      },
      filters: {
        contactChannel: "Канал связи",
        locale: "Язык",
        bookings: "Записи",
        allChannels: "Все каналы",
        allLocales: "Все языки",
        allBookings: "Все клиенты",
        withBookings: "С записями",
        withoutBookings: "Без записей"
      },
      fields: {
        name: "Имя",
        primaryContactChannel: "Основной канал связи",
        primaryContactValue: "Основной контакт",
        phone: "Телефон",
        instagram: "Instagram",
        telegram: "Telegram",
        whatsapp: "WhatsApp",
        viber: "Viber",
        locale: "Язык",
        notes: "Заметки",
        createdAt: "Создано",
        updatedAt: "Обновлено",
        therapist: "Массажист",
        source: "Источник"
      },
      placeholders: {
        name: "Имя клиента",
        phone: "+381 ...",
        instagram: "@username",
        telegram: "@username",
        locale: "Без языка",
        notes: "Приватные заметки для команды...",
        contactValue: {
          instagram: "@username",
          whatsapp: "+381 ...",
          telegram: "@username",
          viber: "+381 ...",
          phone: "+381 ...",
          walk_in: "Контакт не нужен",
          other: "Контактные детали"
        }
      },
      metrics: {
        bookings: "зап."
      },
      messages: {
        created: "Клиент создан.",
        saved: "Клиент сохранен.",
        error: "Не удалось сохранить клиента."
      },
      errors: {
        name: "Введите имя клиента.",
        contactValue: "Укажите контакт для выбранного канала."
      }
    },
    calendar: {
      eyebrow: "Календарь записей",
      title: "Записи по ритму, а не по таблице",
      subtitle: "Смотрите заявки по дню, неделе или месяцу и меняйте статус прямо в контексте записи.",
      dataError: "Данные панели пока недоступны. Примените dashboard schema migration и проверьте staff RLS.",
      currentRange: "Текущий период",
      emptyDay: "На этот день записей нет.",
      emptyCompact: "Свободно",
      statusShort: {
        pending: "Ожид",
        confirmed: "Подтв",
        cancelled: "Отм",
        completed: "Гот"
      },
      create: {
        action: "Создать запись",
        eyebrow: "Ручная запись",
        title: "Создать запись",
        subtitle: "Добавьте запись, если клиент написал, позвонил или пришел лично.",
        fields: {
          service: "Услуга",
          sourceChannel: "Источник",
          date: "Дата",
          time: "Время",
          duration: "Длительность, минуты",
          locale: "Язык клиента",
          clientSearch: "Найти клиента",
          clientName: "Имя клиента",
          clientPhone: "Телефон клиента",
          clientPhoneOptional: "Телефон, если есть",
          clientContactValue: "Контакт",
          clientNotes: "Заметки о клиенте",
          therapist: "Массажист",
          status: "Статус",
          clientComment: "Комментарий клиента",
          internalNotes: "Внутренние заметки"
        },
        placeholders: {
          service: "Выберите услугу",
          therapist: "Выберите массажиста",
          therapistForService: "Сначала выберите услугу",
          noTherapistsForService: "Нет массажистов для этой услуги",
          duration: "Необязательно",
          clientSearch: "Имя, телефон, Instagram, Telegram...",
          clientName: "Имя клиента",
          clientPhone: "+381 ...",
          clientNotes: "Предпочтения, особенности, приватные CRM-заметки...",
          clientComment: "Детали запроса, предпочтения, контекст...",
          internalNotes: "Приватные заметки команды..."
        },
        sourceChannels: {
          instagram: "Instagram",
          whatsapp: "WhatsApp",
          telegram: "Telegram",
          viber: "Viber",
          phone: "Телефон",
          walk_in: "Лично",
          other: "Другое"
        },
        contactPlaceholders: {
          instagram: "@username",
          whatsapp: "+381 ...",
          telegram: "@username",
          viber: "+381 ...",
          phone: "+381 ...",
          walk_in: "Контакт не нужен",
          other: "Контактные детали"
        },
        clientSection: {
          title: "Клиент",
          subtitle: "Выберите клиента из базы или создайте нового во время записи.",
          existing: "Существующий",
          new: "Новый",
          empty: "Клиенты не найдены. Переключитесь на новый клиент, чтобы создать карточку.",
          walkIn: "Для walk-in записи контакт не обязателен."
        },
        noPrimaryContact: "Контакт не указан",
        ownTherapistFallback: "Ваш профиль массажиста пока не подключен.",
        servicesAvailableToTherapist: "Показаны только услуги, доступные этому массажисту.",
        noServicesAvailable: "Нет доступных услуг для ручной записи.",
        servicesLoadError: "Не удалось загрузить услуги.",
        serviceSummary: {
          title: "Детали услуги",
          service: "Услуга",
          duration: "Длительность",
          price: "Цена",
          category: "Категория",
          therapists: "Доступные массажисты"
        },
        errors: {
          service: "Выберите услугу.",
          date: "Выберите дату.",
          time: "Выберите время.",
          duration: "Длительность должна быть больше нуля.",
          clientName: "Введите имя клиента.",
          clientPhone: "Введите телефон клиента.",
          clientRequired: "Выберите клиента или переключитесь на новый клиент.",
          clientContactValue: "Укажите контакт для выбранного канала.",
          therapist: "Чтобы создать запись, нужен ваш профиль массажиста.",
          noTherapistsForService: "Для этой услуги нет доступных массажистов.",
          serviceTherapistUnavailable: "Этот массажист не выполняет выбранную услугу.",
          sourceChannel: "Выберите источник.",
          blocked: "Это время заблокировано."
        },
        submit: "Создать запись",
        saving: "Создаем...",
        cancel: "Отмена",
        durationUnit: "мин",
        success: "Запись создана.",
        error: "Не удалось создать запись."
      },
      views: {
        day: "День",
        week: "Неделя",
        month: "Месяц"
      },
      controls: {
        view: "Вид календаря",
        status: "Фильтр статуса",
        therapist: "Фильтр массажиста",
        previous: "Назад",
        today: "Сегодня",
        next: "Вперед"
      },
      filters: {
        allStatuses: "Все статусы",
        allTherapists: "Все массажисты",
        unassignedTherapist: "Не назначен"
      },
      details: {
        title: "Детали записи",
        close: "Закрыть",
        client: "Клиент",
        phone: "Телефон",
        service: "Услуга",
        duration: "Длительность",
        price: "Цена",
        durationNotSet: "Длительность не указана",
        priceNotSet: "Цена не указана",
        sourceChannel: "Источник",
        locale: "Язык",
        therapist: "Массажист",
        status: "Статус",
        comment: "Комментарий клиента",
        noComment: "Комментария клиента нет.",
        internalNotes: "Внутренние заметки",
        assignedTherapist: "Назначенный массажист"
      },
      actions: {
        pending: "Вернуть в ожидание",
        confirm: "Подтвердить",
        cancel: "Отменить",
        complete: "Завершить",
        markCompleted: "Отметить завершенной",
        assignTherapist: "Назначить массажиста",
        saveNotes: "Сохранить заметки",
        saving: "Сохраняем...",
        saved: "Сохранено.",
        forbidden: "Это действие недоступно для вашей роли.",
        serviceRestriction: "Выбранный массажист не выполняет эту услугу.",
        confirmCancel: "Отменить эту запись?",
        error: "Не удалось сохранить изменения."
      }
    },
    schedule: {
      eyebrow: "Расписание",
      title: "Блокировки доступности",
      subtitle: "Закрывайте полный день или отдельное время, чтобы клиенты и команда не могли записаться в занятые окна.",
      availability: "Доступность",
      addBlock: "Добавить блок",
      editBlock: "Редактировать",
      deleteBlock: "Удалить",
      cancelEdit: "Отменить редактирование",
      saving: "Сохраняем...",
      dataError: "Блокировки расписания сейчас недоступны. Проверьте migration и RLS.",
      existingBlockHint: "На эту дату есть блокировки",
      noBlocks: "На эту дату блокировок нет.",
      confirmDelete: "Удалить эту блокировку?",
      ownTherapistFallback: "Ваш профиль массажиста пока не подключен.",
      fields: {
        date: "Дата",
        blockType: "Тип блока",
        scope: "Область",
        therapist: "Массажист",
        startTime: "Начало",
        endTime: "Конец",
        reason: "Причина"
      },
      placeholders: {
        therapist: "Выберите массажиста",
        reason: "Например: выходной, личный перерыв, частная запись..."
      },
      types: {
        fullDay: "Весь день",
        timeRange: "Интервал времени"
      },
      scope: {
        therapist: "Массажист",
        salon: "Весь салон"
      },
      filters: {
        therapist: "Фильтр массажиста",
        allTherapists: "Все массажисты"
      },
      messages: {
        created: "Блокировка создана.",
        updated: "Блокировка обновлена.",
        deleted: "Блокировка удалена.",
        error: "Не удалось сохранить блокировку."
      },
      errors: {
        date: "Выберите дату.",
        therapist: "Выберите массажиста.",
        ownOnly: "Можно редактировать только свои блокировки расписания.",
        endAfterStart: "Время окончания должно быть позже начала.",
        overlap: "Этот блок пересекается с существующей блокировкой.",
        blocked: "Это время заблокировано.",
        dayUnavailable: "Этот день недоступен."
      },
      reasons: {
        dayOff: "Выходной",
        personalBreak: "Личный перерыв",
        privateAppointment: "Частная запись"
      }
    }
  }
} as const;

export default ru;
