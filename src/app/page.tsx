import Link from "next/link";
import { redirect } from "next/navigation";
import { LandingHeader } from "@/components/landing-header";
import { LandingProductPreview } from "@/components/landing-product-preview";
import { getCurrentUser } from "@/lib/auth/server";
import { isGoogleProviderAuthCode } from "@/lib/auth/redirect";
import { isStripeConfigured } from "@/lib/billing/stripe";
import { t, type MessageKey } from "@/lib/i18n/messages";

const FEATURES: { icon: "chat" | "code" | "preview" | "projects" | "export" | "publish"; title: MessageKey; body: MessageKey }[] = [
  { icon: "chat", title: "featChatTitle", body: "featChatBody" },
  { icon: "code", title: "featCodeTitle", body: "featCodeBody" },
  { icon: "preview", title: "featPreviewTitle", body: "featPreviewBody" },
  { icon: "projects", title: "featProjectsTitle", body: "featProjectsBody" },
  { icon: "export", title: "featExportTitle", body: "featExportBody" },
  { icon: "publish", title: "featPublishTitle", body: "featPublishBody" },
];

const CHECKS: MessageKey[] = ["checkNoSkill", "checkSitesApps", "checkLivePreview", "checkExportable"];

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  if (typeof params.code === "string" && params.code && !isGoogleProviderAuthCode(params.code)) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === "string") query.set(key, value);
    }
    if (!query.get("next")) query.set("next", "/dashboard");
    redirect(`/auth/callback?${query.toString()}`);
  }

  const user = await getCurrentUser();
  const ctaHref = user ? "/dashboard" : "/signup";
  const stripeReady = isStripeConfigured();

  return (
    <div className="min-h-screen">
      <LandingHeader signedIn={Boolean(user)} />
      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-10 lg:px-6 lg:pb-24 lg:pt-16">
          <div>
            <p className="inline-flex rounded-full bg-brand-soft px-3 py-1 text-sm font-medium text-brand">
              {t("eyebrow")}
            </p>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-[3.4rem]">
              {t("heroLine1")}
              <br />
              {t("heroLine2")}
              <br />
              <span className="text-brand">{t("heroAccent")}</span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-muted sm:text-lg">{t("landingLead")}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href={ctaHref}
                className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white shadow-sm"
              >
                {t("startFree")}
                <span aria-hidden>→</span>
              </Link>
              <a
                href="#demo"
                className="inline-flex items-center gap-2 rounded-full border bg-white px-5 py-3 text-sm font-semibold text-foreground shadow-sm"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full border text-[10px]">▶</span>
                {t("seeDemo")}
              </a>
            </div>
            <ul className="mt-8 grid max-w-lg grid-cols-1 gap-2 text-sm text-muted sm:grid-cols-2">
              {CHECKS.map((key) => (
                <li key={key} className="flex items-center gap-2">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-[10px] text-emerald-700">
                    ✓
                  </span>
                  {t(key)}
                </li>
              ))}
            </ul>
          </div>
          <LandingProductPreview />
        </section>

        <section id="fonctionnalites" className="border-t bg-white/70 py-20">
          <div className="mx-auto max-w-6xl px-5 lg:px-6">
            <p className="text-center text-sm font-medium text-brand">{t("featuresKicker")}</p>
            <h2 className="mt-2 text-center text-3xl font-extrabold tracking-tight sm:text-4xl">
              {t("featuresTitle")}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-muted">{t("featuresLead")}</p>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <article
                  key={feature.title}
                  className="rounded-3xl border bg-white p-6 shadow-[0_10px_40px_-24px_rgba(15,23,42,0.35)]"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                    <FeatureIcon name={feature.icon} />
                  </span>
                  <h3 className="mt-5 text-lg font-bold">{t(feature.title)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{t(feature.body)}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="tarifs" className="py-20">
          <div className="mx-auto max-w-6xl px-5 lg:px-6">
            <p className="text-center text-sm font-medium text-brand">{t("pricingKicker")}</p>
            <h2 className="mt-2 text-center text-3xl font-extrabold tracking-tight">{t("pricingTitle")}</h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-muted">{t("pricingLead")}</p>
            <div className="mx-auto mt-12 grid max-w-4xl gap-4 md:grid-cols-3">
              {[
                { name: t("planFree"), price: t("planFreePrice"), body: t("planFreeBody"), kind: "free" as const },
                { name: t("planPro"), price: t("planProPrice"), body: t("planProBody"), kind: "pro" as const },
                { name: t("planStudio"), price: t("soon"), body: t("planStudioBody"), kind: "studio" as const },
              ].map((plan) => (
                <article key={plan.name} className="rounded-3xl border bg-white p-6">
                  <h3 className="text-lg font-bold">{plan.name}</h3>
                  <p className="mt-1 text-2xl font-extrabold tracking-tight">{plan.price}</p>
                  <p className="mt-2 text-sm text-muted">{plan.body}</p>
                  {plan.kind === "free" ? (
                    <Link
                      href={ctaHref}
                      className="mt-6 inline-flex rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white"
                    >
                      {t("startFree")}
                    </Link>
                  ) : plan.kind === "pro" && stripeReady ? (
                    <Link
                      href={user ? "/dashboard" : "/signup"}
                      className="mt-6 inline-flex rounded-full border px-4 py-2 text-sm font-semibold"
                    >
                      {t("upgradePro")}
                    </Link>
                  ) : (
                    <p className="mt-6 text-sm font-medium text-muted">{t("soon")}</p>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="ressources" className="border-t bg-white/70 py-20">
          <div className="mx-auto max-w-6xl px-5 lg:px-6">
            <h2 className="text-center text-3xl font-extrabold tracking-tight">{t("resourcesTitle")}</h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-muted">{t("resourcesLead")}</p>
            <div className="mx-auto mt-10 grid max-w-4xl gap-4 md:grid-cols-3">
              {[t("resourcePreview"), t("resourceExport"), t("resourceVersions")].map((item) => (
                <article key={item} className="rounded-3xl border bg-white p-5 text-sm font-medium">
                  {item}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="a-propos" className="py-20">
          <div className="mx-auto max-w-3xl px-5 text-center lg:px-6">
            <h2 className="text-3xl font-extrabold tracking-tight">{t("aboutTitle")}</h2>
            <p className="mt-4 text-muted">{t("aboutBody")}</p>
            <Link
              href={ctaHref}
              className="mt-8 inline-flex rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white"
            >
              {t("startFree")}
            </Link>
          </div>
        </section>
      </main>
      <footer className="border-t bg-white/80 py-8 text-center text-sm text-muted">
        © {new Date().getFullYear()} Capitune
      </footer>
    </div>
  );
}

function FeatureIcon({ name }: { name: (typeof FEATURES)[number]["icon"] }) {
  const common = { width: 20, height: 20, fill: "none", stroke: "currentColor", strokeWidth: 1.8, "aria-hidden": true as const };
  if (name === "chat") {
    return (
      <svg {...common} viewBox="0 0 24 24">
        <path d="M5 6.5h14v9H9l-4 3v-12z" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "code") {
    return (
      <svg {...common} viewBox="0 0 24 24">
        <path d="M8 8 4 12l4 4M16 8l4 4-4 4M13 6l-2 12" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "preview") {
    return (
      <svg {...common} viewBox="0 0 24 24">
        <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
    );
  }
  if (name === "projects") {
    return (
      <svg {...common} viewBox="0 0 24 24">
        <path d="M7 7h10M7 12h10M7 17h6" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "export") {
    return (
      <svg {...common} viewBox="0 0 24 24">
        <path d="M7 17h10M12 6v8M8.5 10.5 12 7l3.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg {...common} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8" />
      <path d="M4 12h16M12 4c2.5 2.8 2.5 13.2 0 16M12 4c-2.5 2.8-2.5 13.2 0 16" />
    </svg>
  );
}
