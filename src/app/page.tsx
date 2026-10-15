import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { t } from "@/lib/i18n/messages";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  if (typeof params.code === "string" && params.code) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === "string") query.set(key, value);
    }
    if (!query.get("next")) query.set("next", "/dashboard");
    redirect(`/auth/callback?${query.toString()}`);
  }
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Brand />
        <nav className="flex gap-3 text-sm">
          <Link href="/login" className="rounded-md px-3 py-2 hover:bg-card">
            {t("login")}
          </Link>
          <Link href="/signup" className="rounded-md bg-accent px-3 py-2 text-white">
            {t("start")}
          </Link>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-6 pb-20 pt-10">
        <p className="text-sm uppercase tracking-[0.2em] text-accent">{t("appName")}</p>
        <h1 className="mt-4 max-w-3xl font-[family-name:var(--font-serif-actual)] text-5xl leading-tight sm:text-7xl">
          {t("tagline")}
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted">{t("landingLead")}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/signup" className="rounded-md bg-accent px-5 py-3 text-white">
            {t("start")}
          </Link>
          <Link href="/login" className="rounded-md border bg-card px-5 py-3">
            {t("login")}
          </Link>
        </div>
        <section className="mt-20 grid gap-6 sm:grid-cols-3">
          {[t("step1"), t("step2"), t("step3")].map((step, index) => (
            <article key={step} className="rounded-xl border bg-card p-5">
              <p className="text-sm text-muted">0{index + 1}</p>
              <p className="mt-3 text-lg">{step}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
