import Link from "next/link";

export function EmptyFeed({ locale }: { locale: string }) {
  return (
    <section className="rounded-[32px] border border-dashed border-white/20 bg-white/6 p-8 text-center">
      <p className="text-sm uppercase tracking-[0.35em] text-cyan/80">Your feed is empty</p>
      <h2 className="mt-4 text-3xl font-semibold">Follow people or publish your first post.</h2>
      <p className="mx-auto mt-4 max-w-xl text-slate-200">
        The cheapest strong MVP is a real social graph. Once you follow people, their multimedia posts
        will appear here, and mutual follow can unlock TUCHATI.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href={`/${locale}/discover`} className="rounded-full bg-cyan px-5 py-3 font-medium text-ink">
          Find creators
        </Link>
        <Link href={`/${locale}/profile/you`} className="rounded-full border border-white/20 px-5 py-3">
          Complete profile
        </Link>
      </div>
    </section>
  );
}
