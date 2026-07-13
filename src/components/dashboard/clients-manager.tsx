"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { ClientNotificationsPanel } from "@/components/dashboard/client-notifications-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { locales, type Locale } from "@/i18n/config";
import { type Dictionary } from "@/i18n/dictionaries";
import {
  contactValueRequired,
  getClientContactLabel,
  type ClientContactChannel
} from "@/lib/clients/contact";
import { saveClientAction } from "@/lib/dashboard/actions";
import { manualBookingSourceChannels } from "@/lib/dashboard/constants";
import { type DashboardClient, type SaveClientInput } from "@/lib/dashboard/clients";
import { type ServiceCatalogItem } from "@/lib/services/catalog";
import { cn } from "@/lib/utils";

type BookingFilter = "all" | "with_bookings" | "without_bookings";

type ClientFormState = {
  id: string | null;
  name: string;
  primaryContactChannel: ClientContactChannel;
  primaryContactValue: string;
  phone: string;
  instagramUsername: string;
  telegramUsername: string;
  whatsappPhone: string;
  viberPhone: string;
  locale: Locale | "";
  notes: string;
};

type ClientFormErrors = Partial<Record<keyof ClientFormState, string>>;

type ClientsManagerProps = {
  clients: DashboardClient[];
  dataError: boolean;
  dictionary: Dictionary;
  locale: Locale;
  serviceCatalog: ServiceCatalogItem[];
  localizedServiceNames: Record<Locale, Record<string, string>>;
};

const dateLocales: Record<Locale, string> = {
  sr: "sr-Latn-RS",
  ru: "ru-RU",
  en: "en-GB"
};

const emptyForm: ClientFormState = {
  id: null,
  name: "",
  primaryContactChannel: "phone",
  primaryContactValue: "",
  phone: "",
  instagramUsername: "",
  telegramUsername: "",
  whatsappPhone: "",
  viberPhone: "",
  locale: "",
  notes: ""
};

function toFormState(client?: DashboardClient | null): ClientFormState {
  if (!client) {
    return emptyForm;
  }

  return {
    id: client.id,
    name: client.name,
    primaryContactChannel: client.primaryContactChannel ?? "phone",
    primaryContactValue: client.primaryContactValue ?? "",
    phone: client.phone ?? "",
    instagramUsername: client.instagramUsername ?? "",
    telegramUsername: client.telegramUsername ?? "",
    whatsappPhone: client.whatsappPhone ?? "",
    viberPhone: client.viberPhone ?? "",
    locale: client.locale ?? "",
    notes: client.notes ?? ""
  };
}

function formatDate(value: string | null | undefined, locale: Locale) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(dateLocales[locale], {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Belgrade"
  }).format(new Date(`${value}T12:00:00Z`));
}

function formatDateTime(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(dateLocales[locale], {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Belgrade"
  }).format(new Date(value));
}

function getClientSearchText(client: DashboardClient) {
  return [
    client.name,
    client.phone,
    client.instagramUsername,
    client.telegramUsername,
    client.whatsappPhone,
    client.viberPhone,
    client.primaryContactValue
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function ClientsManager({
  clients,
  dataError,
  dictionary,
  locale,
  serviceCatalog,
  localizedServiceNames
}: ClientsManagerProps) {
  const router = useRouter();
  const copy = dictionary.dashboard.clients;
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState<ClientContactChannel | "all">("all");
  const [localeFilter, setLocaleFilter] = useState<Locale | "all">("all");
  const [bookingFilter, setBookingFilter] = useState<BookingFilter>("all");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(clients[0]?.id ?? null);
  const [form, setForm] = useState<ClientFormState>(() => toFormState(clients[0]));
  const [formErrors, setFormErrors] = useState<ClientFormErrors>({});
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const serviceNames = useMemo(
    () => new Map(serviceCatalog.map((service) => [service.slug, service.name])),
    [serviceCatalog]
  );
  const selectedClient = clients.find((client) => client.id === selectedClientId) ?? null;
  const filteredClients = useMemo(() => {
    const query = search.trim().toLowerCase();

    return clients.filter((client) => {
      if (query && !getClientSearchText(client).includes(query)) {
        return false;
      }

      if (channelFilter !== "all" && client.primaryContactChannel !== channelFilter) {
        return false;
      }

      if (localeFilter !== "all" && client.locale !== localeFilter) {
        return false;
      }

      if (bookingFilter === "with_bookings" && client.bookingsCount === 0) {
        return false;
      }

      if (bookingFilter === "without_bookings" && client.bookingsCount > 0) {
        return false;
      }

      return true;
    });
  }, [bookingFilter, channelFilter, clients, localeFilter, search]);

  function getPrimaryContact(client: DashboardClient) {
    return getClientContactLabel(
      client.primaryContactChannel,
      client.primaryContactValue,
      copy.channels,
      copy.noContact
    );
  }

  function getServiceName(service: string) {
    return serviceNames.get(service) ?? service;
  }

  function selectClient(client: DashboardClient) {
    setSelectedClientId(client.id);
    setForm(toFormState(client));
    setFormErrors({});
    setIsEditing(false);
    setMessage(null);
  }

  function startCreate() {
    setSelectedClientId(null);
    setForm(emptyForm);
    setFormErrors({});
    setIsEditing(true);
    setMessage(null);
  }

  function startEdit(client: DashboardClient) {
    setSelectedClientId(client.id);
    setForm(toFormState(client));
    setFormErrors({});
    setIsEditing(true);
    setMessage(null);
  }

  function updateForm<K extends keyof ClientFormState>(field: K, value: ClientFormState[K]) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
    setFormErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function validateForm() {
    const errors: ClientFormErrors = {};

    if (form.name.trim().length < 2) {
      errors.name = copy.errors.name;
    }

    if (contactValueRequired(form.primaryContactChannel) && form.primaryContactValue.trim().length < 2) {
      errors.primaryContactValue = copy.errors.contactValue;
    }

    setFormErrors(errors);

    return Object.keys(errors).length === 0;
  }

  function saveClient() {
    if (!validateForm()) {
      return;
    }

    const payload: SaveClientInput = {
      id: form.id,
      name: form.name,
      primaryContactChannel: form.primaryContactChannel,
      primaryContactValue: form.primaryContactChannel === "walk_in" ? null : form.primaryContactValue,
      phone: form.phone,
      instagramUsername: form.instagramUsername,
      telegramUsername: form.telegramUsername,
      whatsappPhone: form.whatsappPhone,
      viberPhone: form.viberPhone,
      locale: form.locale,
      notes: form.notes
    };

    setMessage(null);
    startTransition(async () => {
      const result = await saveClientAction(locale, payload);

      if (result.ok) {
        setMessage(form.id ? copy.messages.saved : copy.messages.created);
        setIsEditing(false);
        router.refresh();
        return;
      }

      setMessage(result.reason === "forbidden" ? copy.forbidden : copy.messages.error);
    });
  }

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-border/70 bg-card/82 p-5 shadow-soft sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">{copy.eyebrow}</p>
            <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight text-primary">{copy.title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{copy.subtitle}</p>
          </div>
          <Button type="button" onClick={startCreate}>{copy.addClient}</Button>
        </div>
        {dataError ? (
          <p className="mt-5 rounded-2xl border border-accent/25 bg-accent/10 px-4 py-3 text-sm leading-6 text-foreground">
            {copy.messages.error}
          </p>
        ) : null}
        {message ? (
          <p className="mt-5 rounded-2xl border border-primary/15 bg-secondary/60 px-4 py-3 text-sm font-semibold text-primary">
            {message}
          </p>
        ) : null}
      </div>

      <div className="rounded-3xl border border-border/70 bg-card/78 p-4 shadow-soft sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[1.4fr_0.8fr_0.8fr_0.9fr]">
          <Input
            aria-label={copy.search}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={copy.search}
          />
          <Select
            aria-label={copy.filters.contactChannel}
            value={channelFilter}
            onChange={(event) => setChannelFilter(event.target.value as ClientContactChannel | "all")}
          >
            <option value="all">{copy.filters.allChannels}</option>
            {manualBookingSourceChannels.map((channel) => (
              <option key={channel} value={channel}>{copy.channels[channel]}</option>
            ))}
          </Select>
          <Select
            aria-label={copy.filters.locale}
            value={localeFilter}
            onChange={(event) => setLocaleFilter(event.target.value as Locale | "all")}
          >
            <option value="all">{copy.filters.allLocales}</option>
            {locales.map((localeOption) => (
              <option key={localeOption} value={localeOption}>{localeOption.toUpperCase()}</option>
            ))}
          </Select>
          <Select
            aria-label={copy.filters.bookings}
            value={bookingFilter}
            onChange={(event) => setBookingFilter(event.target.value as BookingFilter)}
          >
            <option value="all">{copy.filters.allBookings}</option>
            <option value="with_bookings">{copy.filters.withBookings}</option>
            <option value="without_bookings">{copy.filters.withoutBookings}</option>
          </Select>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="order-2 space-y-3 xl:order-1">
          {filteredClients.length > 0 ? (
            filteredClients.map((client) => (
              <button
                key={client.id}
                type="button"
                onClick={() => selectClient(client)}
                className={cn(
                  "focus-ring w-full rounded-3xl border p-4 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-primary/25 hover:bg-card",
                  selectedClientId === client.id ? "border-primary/30 bg-secondary/55" : "border-border/70 bg-card/72"
                )}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-primary">{client.name}</h2>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{getPrimaryContact(client)}</p>
                    {client.notes ? (
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-foreground/78">{client.notes}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    {client.locale ? (
                      <span className="rounded-full bg-background/70 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        {client.locale}
                      </span>
                    ) : null}
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                      {client.bookingsCount} {copy.metrics.bookings}
                    </span>
                  </div>
                </div>
                <dl className="mt-4 grid gap-3 border-t border-border/70 pt-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {copy.lastVisit}
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-foreground">
                      {formatDate(client.lastBookingDate, locale) ?? copy.noBookingsYet}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {copy.latestService}
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-foreground">
                      {client.latestService ? getServiceName(client.latestService) : copy.noBookingsYet}
                    </dd>
                  </div>
                </dl>
              </button>
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-border/80 bg-card/70 p-8 text-sm leading-6 text-muted-foreground">
              {clients.length === 0 ? copy.noClientsYet : copy.noSearchResults}
            </div>
          )}
        </div>

        <aside className="order-1 rounded-3xl border border-border/70 bg-card/78 p-4 shadow-soft sm:p-5 xl:sticky xl:top-8 xl:order-2 xl:max-h-[calc(100vh-4rem)] xl:overflow-y-auto">
          {isEditing ? (
            <div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                    {form.id ? copy.editClient : copy.addClient}
                  </p>
                  <h2 className="mt-2 font-serif text-3xl font-semibold leading-tight text-primary">
                    {form.id ? copy.editClient : copy.createTitle}
                  </h2>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsEditing(false);
                    setForm(toFormState(selectedClient));
                    setFormErrors({});
                  }}
                >
                  {copy.cancel}
                </Button>
              </div>

              <div className="mt-5 space-y-4">
                <div className="space-y-2">
                  <label htmlFor="client-name" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {copy.fields.name}
                  </label>
                  <Input
                    id="client-name"
                    value={form.name}
                    onChange={(event) => updateForm("name", event.target.value)}
                    aria-invalid={Boolean(formErrors.name)}
                    placeholder={copy.placeholders.name}
                  />
                  {formErrors.name ? <p className="text-sm leading-5 text-accent">{formErrors.name}</p> : null}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="client-primary-channel" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {copy.fields.primaryContactChannel}
                    </label>
                    <Select
                      id="client-primary-channel"
                      value={form.primaryContactChannel}
                      onChange={(event) => updateForm("primaryContactChannel", event.target.value as ClientContactChannel)}
                    >
                      {manualBookingSourceChannels.map((channel) => (
                        <option key={channel} value={channel}>{copy.channels[channel]}</option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="client-primary-value" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {copy.fields.primaryContactValue}
                    </label>
                    <Input
                      id="client-primary-value"
                      value={form.primaryContactValue}
                      onChange={(event) => updateForm("primaryContactValue", event.target.value)}
                      aria-invalid={Boolean(formErrors.primaryContactValue)}
                      disabled={form.primaryContactChannel === "walk_in"}
                      placeholder={copy.placeholders.contactValue[form.primaryContactChannel]}
                    />
                    {formErrors.primaryContactValue ? <p className="text-sm leading-5 text-accent">{formErrors.primaryContactValue}</p> : null}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    ["phone", copy.fields.phone, copy.placeholders.phone],
                    ["instagramUsername", copy.fields.instagram, copy.placeholders.instagram],
                    ["telegramUsername", copy.fields.telegram, copy.placeholders.telegram],
                    ["whatsappPhone", copy.fields.whatsapp, copy.placeholders.phone],
                    ["viberPhone", copy.fields.viber, copy.placeholders.phone]
                  ].map(([field, label, placeholder]) => (
                    <div key={field} className="space-y-2">
                      <label htmlFor={`client-${field}`} className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        {label}
                      </label>
                      <Input
                        id={`client-${field}`}
                        value={form[field as keyof ClientFormState] as string}
                        onChange={(event) => updateForm(field as keyof ClientFormState, event.target.value)}
                        placeholder={placeholder}
                      />
                    </div>
                  ))}

                  <div className="space-y-2">
                    <label htmlFor="client-locale" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {copy.fields.locale}
                    </label>
                    <Select
                      id="client-locale"
                      value={form.locale}
                      onChange={(event) => updateForm("locale", event.target.value as Locale | "")}
                    >
                      <option value="">{copy.placeholders.locale}</option>
                      {locales.map((localeOption) => (
                        <option key={localeOption} value={localeOption}>{localeOption.toUpperCase()}</option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="client-notes" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {copy.fields.notes}
                  </label>
                  <Textarea
                    id="client-notes"
                    value={form.notes}
                    onChange={(event) => updateForm("notes", event.target.value)}
                    placeholder={copy.placeholders.notes}
                  />
                </div>

                {form.id ? (
                  <p className="rounded-2xl border border-primary/12 bg-secondary/45 px-4 py-3 text-xs leading-5 text-muted-foreground">
                    {copy.snapshotWarning}
                  </p>
                ) : null}

                <div className="flex flex-col gap-2 border-t border-border/70 pt-4 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      setForm(toFormState(selectedClient));
                      setFormErrors({});
                    }}
                  >
                    {copy.cancel}
                  </Button>
                  <Button type="button" onClick={saveClient} disabled={isPending}>
                    {isPending ? copy.saving : copy.save}
                  </Button>
                </div>
              </div>
            </div>
          ) : selectedClient ? (
            <div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">{copy.detailsTitle}</p>
                  <h2 className="mt-2 font-serif text-3xl font-semibold leading-tight text-primary">{selectedClient.name}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{getPrimaryContact(selectedClient)}</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => startEdit(selectedClient)}>
                  {copy.editClient}
                </Button>
              </div>

              <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  [copy.fields.phone, selectedClient.phone],
                  [copy.fields.instagram, selectedClient.instagramUsername],
                  [copy.fields.telegram, selectedClient.telegramUsername],
                  [copy.fields.whatsapp, selectedClient.whatsappPhone],
                  [copy.fields.viber, selectedClient.viberPhone],
                  [copy.fields.locale, selectedClient.locale?.toUpperCase() ?? null],
                  [copy.fields.createdAt, formatDateTime(selectedClient.createdAt, locale)],
                  [copy.fields.updatedAt, formatDateTime(selectedClient.updatedAt, locale)]
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-border/70 bg-background/45 p-3">
                    <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</dt>
                    <dd className="mt-1 break-words text-sm font-semibold text-foreground">{value || copy.notSet}</dd>
                  </div>
                ))}
              </dl>

              {selectedClient.notes ? (
                <div className="mt-4 rounded-2xl border border-border/70 bg-background/45 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{copy.fields.notes}</p>
                  <p className="mt-2 text-sm leading-6 text-foreground/82">{selectedClient.notes}</p>
                </div>
              ) : null}

              <ClientNotificationsPanel
                client={selectedClient}
                dictionary={dictionary}
                locale={locale}
                serviceCatalog={serviceCatalog}
                localizedServiceNames={localizedServiceNames}
              />

              <div className="mt-6 border-t border-border/70 pt-5">
                <h3 className="text-lg font-semibold text-primary">{copy.bookingHistory}</h3>
                <div className="mt-4 space-y-3">
                  {selectedClient.bookings.length > 0 ? (
                    selectedClient.bookings.map((booking) => (
                      <article key={booking.id} className="rounded-2xl border border-border/70 bg-background/45 p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-primary">
                              {formatDate(booking.preferredDate, locale)} · {booking.preferredTime}
                            </p>
                            <p className="mt-1 text-sm leading-6 text-foreground">{getServiceName(booking.service)}</p>
                          </div>
                          <span className="w-fit rounded-full bg-secondary/70 px-2.5 py-1 text-xs font-semibold text-primary">
                            {dictionary.booking.statuses[booking.status]}
                          </span>
                        </div>
                        <dl className="mt-3 grid gap-2 text-sm leading-6 text-muted-foreground sm:grid-cols-2">
                          <div>
                            <dt className="font-semibold text-primary">{copy.fields.therapist}</dt>
                            <dd>{booking.specialist}</dd>
                          </div>
                          <div>
                            <dt className="font-semibold text-primary">{copy.fields.source}</dt>
                            <dd>
                              {[booking.source, booking.sourceChannel ? copy.channels[booking.sourceChannel] : null]
                                .filter(Boolean)
                                .join(" · ")}
                            </dd>
                          </div>
                        </dl>
                        {booking.internalNotes ? (
                          <p className="mt-3 rounded-xl bg-card/72 px-3 py-2 text-sm leading-6 text-foreground/80">
                            {booking.internalNotes}
                          </p>
                        ) : null}
                      </article>
                    ))
                  ) : (
                    <p className="rounded-2xl border border-dashed border-border/80 p-5 text-sm leading-6 text-muted-foreground">
                      {copy.noBookingsYet}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/80 p-6 text-sm leading-6 text-muted-foreground">
              {copy.selectClient}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
