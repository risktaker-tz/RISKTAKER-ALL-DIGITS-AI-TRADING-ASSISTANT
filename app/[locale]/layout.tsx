import { notFound } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { getDictionary, locales, type Locale } from "@/lib/i18n/config";

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  await getDictionary(locale as Locale);

  return <AppShell locale={locale as Locale}>{children}</AppShell>;
}
