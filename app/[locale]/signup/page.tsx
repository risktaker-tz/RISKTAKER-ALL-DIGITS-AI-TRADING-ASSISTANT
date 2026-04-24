import { SignupForm } from "@/components/auth/signup-form";
import { getDictionary, type Locale } from "@/lib/i18n/config";

export default async function SignupPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dictionary = await getDictionary(locale as Locale);

  return (
    <section className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <div className="rounded-[32px] border border-white/15 bg-white/8 p-8 shadow-glass backdrop-blur">
        <p className="text-sm uppercase tracking-[0.4em] text-cyan/80">Auth</p>
        <h1 className="mt-4 text-4xl font-semibold">{dictionary["auth.signupTitle"]}</h1>
        <p className="mt-4 text-slate-200">
          Phone numbers are required for TUCHATI but stay private. We store them encrypted and only use
          them for verification and optional offline SMS relay.
        </p>
      </div>

      <SignupForm locale={locale} />
    </section>
  );
}
