import en from "./en";
import ru from "./ru";
import sr from "./sr";

import { type Locale } from "@/i18n/config";

type Widen<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends readonly (infer U)[]
      ? readonly Widen<U>[]
      : T extends object
        ? { readonly [K in keyof T]: Widen<T[K]> }
        : T;

export type Dictionary = Widen<typeof sr>;

const dictionaries: Record<Locale, Dictionary> = {
  sr,
  ru,
  en
};

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  return dictionaries[locale];
}
