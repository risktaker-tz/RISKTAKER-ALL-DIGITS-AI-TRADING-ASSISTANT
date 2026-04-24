import Link from "next/link";

import { getDictionary, type Locale } from "@/lib/i18n/config";

export default async function MarketingPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dictionary = await getDictionary(locale as Locale);

  return (
    <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="rounded-[40px] border border-white/15 bg-white/8 p-8 shadow-glass backdrop-blur sm:p-12">
        <p className="text-sm uppercase tracking-[0.4em] text-cyan/80">Private Social Layer</p>
        <h1 className="mt-4 max-w-3xl text-5xl font-semibold leading-tight sm:text-6xl">
          {dictionary.brand} is built for multimedia sharing and trusted connection.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-slate-200">{dictionary.tagline}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={`/${locale}/signup`} className="rounded-full bg-cyan px-6 py-3 font-medium text-ink">
            Start now
          </Link>
          <Link href={`/${locale}/feed`} className="rounded-full border border-white/20 px-6 py-3">
            View app
          </Link>
        </div>
      </div>

      <div className="grid gap-6">
        <div className="rounded-[32px] border border-white/15 bg-white/8 p-6 shadow-glass backdrop-blur">
          <p className="text-sm uppercase tracking-[0.3em] text-coral/80">Unlock Rule</p>
          <h2 className="mt-3 text-2xl font-semibold">TUCHATI appears only after mutual follow.</h2>
          <p className="mt-3 text-slate-200">
            When two people follow each other, they unlock private chat, voice calls, video calls,
            and optional SMS fallback without exposing phone numbers.
          </p>
        </div>
        <div className="rounded-[32px] border border-white/15 bg-white/8 p-6 shadow-glass backdrop-blur">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan/80">Content</p>
          <h2 className="mt-3 text-2xl font-semibold">Photos, videos, and audio all belong here.</h2>
          <p className="mt-3 text-slate-200">
            TUCHATI is now multimedia-first: image posts, video clips, songs, voice notes, story-like statuses,
            and creator-ready feed ranking.
          </p>
        </div>
      </div>
    </section>
  );
}
