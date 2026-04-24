import Link from "next/link";

export default async function MessagesPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <aside className="rounded-[32px] border border-white/15 bg-white/8 p-5 shadow-glass backdrop-blur">
        <p className="text-sm uppercase tracking-[0.3em] text-cyan/80">Inbox</p>
        <div className="mt-5 space-y-3">
          <Link
            href={`/${locale}/messages/demo-chat`}
            className="block rounded-3xl border border-white/10 bg-white/5 p-4"
          >
            <p className="font-medium">amina.wav</p>
            <p className="mt-1 text-sm text-slate-300">TUCHATI unlocked</p>
          </Link>
        </div>
      </aside>

      <div className="rounded-[32px] border border-white/15 bg-white/8 p-10 text-center shadow-glass backdrop-blur">
        <h1 className="text-3xl font-semibold">Choose a conversation</h1>
        <p className="mt-3 text-slate-200">
          Private chat, voice, and video calls appear here once mutual follow is established.
        </p>
      </div>
    </section>
  );
}
