import { en } from "./en";
import { ja } from "./ja";

export type Locale = "en" | "ja";

const translations: Record<Locale, Record<string, string>> = {
    en,
    ja,
};

export function getTranslations(locale: Locale) {
    return translations[locale];
}

export type { TranslationKeys } from "./en";
