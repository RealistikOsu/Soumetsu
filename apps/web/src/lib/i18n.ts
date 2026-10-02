import { getLocale, locales, setLocale, type Locale } from '$lib/paraglide/runtime';

export { getLocale, locales, setLocale, type Locale };

// Each language is listed in its own name, so people can find theirs.
export const languageNames: Record<Locale, string> = {
  en: 'English',
  ru: 'Русский',
  pl: 'Polski'
};

// Dates and numbers follow the chosen language; English keeps British formatting.
export const intlLocale = () => (getLocale() === 'en' ? 'en-GB' : getLocale());
