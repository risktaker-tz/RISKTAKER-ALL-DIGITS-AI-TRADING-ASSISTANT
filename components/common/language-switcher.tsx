"use client";

import { usePathname, useRouter } from "next/navigation";

import type { Locale } from "@/lib/i18n/config";
import { locales } from "@/lib/i18n/config";

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <select
      aria-label="Switch language"
      value={locale}
      className="rounded-full border border-white/20 bg-white/10 px-3 py-2 text-sm text-white backdrop-blur"
      onChange={(event) => {
        const nextLocale = event.target.value;
        const nextPath = pathname.replace(`/${locale}`, `/${nextLocale}`);
        document.cookie = `tuchati-locale=${nextLocale}; path=/; max-age=31536000`;
        router.push(nextPath);
      }}
    >
      {locales.map((value) => (
        <option key={value} value={value} className="text-slate-900">
          {value.toUpperCase()}
        </option>
      ))}
    </select>
  );
}
