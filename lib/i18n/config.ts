export const locales = ["en", "sw", "es"] as const;
export const defaultLocale = "en";

export type Locale = (typeof locales)[number];

export async function getDictionary(locale: Locale) {
  switch (locale) {
    case "sw":
      return import("./dictionaries/sw.json").then((module) => module.default);
    case "es":
      return import("./dictionaries/es.json").then((module) => module.default);
    case "en":
    default:
      return import("./dictionaries/en.json").then((module) => module.default);
  }
}
