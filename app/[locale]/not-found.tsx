import Link from "next/link";

export default function LocaleNotFound() {
  return (
    <section className="rounded-[32px] border border-dashed border-white/20 bg-white/6 p-10 text-center">
      <h1 className="text-4xl font-semibold">Profile not found</h1>
      <p className="mt-4 text-slate-200">
        That page does not exist yet, or the username has not been claimed.
      </p>
      <div className="mt-6">
        <Link href="/" className="rounded-full bg-cyan px-5 py-3 font-medium text-ink">
          Return to feed
        </Link>
      </div>
    </section>
  );
}
