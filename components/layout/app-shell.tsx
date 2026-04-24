import Link from "next/link";
import { Bell, Compass, House, MessageSquareText, Sparkles, UserRound } from "lucide-react";

import { LanguageSwitcher } from "@/components/common/language-switcher";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { getCurrentUser } from "@/lib/auth";
import type { Locale } from "@/lib/i18n/config";

const navigation = [
  { href: "/feed", label: "Feed", icon: House },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/messages", label: "Messages", icon: MessageSquareText },
  { href: "/profile/you", label: "Profile", icon: UserRound }
];

export async function AppShell({
  locale,
  children
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentUser();
  const navigationWithProfile = navigation.map((item) =>
    item.href === "/profile/you"
      ? {
          ...item,
          href: currentUser ? `/profile/${currentUser.username}` : "/signup"
        }
      : item
  );

  return (
    <div className="min-h-screen bg-aura text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <aside className="hidden w-72 shrink-0 rounded-[32px] border border-white/15 bg-white/8 p-6 shadow-glass backdrop-blur xl:block">
          <div className="mb-10 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan/20">
              <Sparkles className="h-6 w-6 text-cyan" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-cyan/80">Global Social</p>
              <h1 className="text-2xl font-semibold">TUCHATI</h1>
            </div>
          </div>

          <nav className="space-y-2">
            {navigationWithProfile.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={`/${locale}${href}`}
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-slate-100 transition hover:bg-white/10"
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            ))}
          </nav>

          <div className="mt-10 rounded-3xl border border-cyan/30 bg-cyan/10 p-5">
            <p className="text-sm text-cyan">TUCHATI unlock rule</p>
            <p className="mt-2 text-sm text-slate-100">
              Messaging, voice, and video calls only appear after mutual follow is confirmed.
            </p>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col gap-6">
          <header className="flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-white/15 bg-white/8 px-5 py-4 shadow-glass backdrop-blur">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-cyan/80">Now Building</p>
              <h2 className="text-xl font-semibold">Multimedia social, private by default</h2>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 backdrop-blur"
              >
                <Bell className="h-5 w-5" />
              </button>
              <LanguageSwitcher locale={locale} />
              <ThemeToggle />
            </div>
          </header>

          <main className="flex-1">{children}</main>

          <nav className="sticky bottom-4 grid grid-cols-4 gap-2 rounded-[28px] border border-white/15 bg-slate-950/70 p-2 backdrop-blur xl:hidden">
            {navigationWithProfile.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={`/${locale}${href}`}
                className="flex flex-col items-center gap-1 rounded-2xl px-3 py-3 text-xs text-slate-200 hover:bg-white/10"
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
