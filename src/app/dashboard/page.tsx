import { redirect } from "next/navigation";
import { AppRail } from "@/components/app-rail";
import { DashboardClient } from "@/components/dashboard-client";
import { getCurrentUser } from "@/lib/auth/server";
import { t } from "@/lib/i18n/messages";
import { isDemoAI } from "@/lib/ai";
import { isStripeConfigured } from "@/lib/billing/stripe";
import { getEnvStatus } from "@/lib/env/status";
import { getRepository } from "@/lib/store";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  const query = await searchParams;
  const repository = await getRepository();
  const projects = await repository.listProjects(user.id);
  const usage = await repository.getGenerationUsage(user.id);
  const env = getEnvStatus();
  let publishReady = true;
  let quotaReady = true;
  let billingReady = true;
  try {
    publishReady = await repository.publishSchemaReady();
  } catch {
    publishReady = false;
  }
  try {
    quotaReady = await repository.quotaSchemaReady();
  } catch {
    quotaReady = false;
  }
  try {
    billingReady = await repository.billingSchemaReady();
  } catch {
    billingReady = false;
  }
  const billingNotice = query.billing === "success" ? "success" : query.billing === "cancel" ? "cancel" : null;

  return (
    <div className="flex min-h-screen">
      <AppRail />
      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between px-6 py-5">
          <p className="text-sm font-extrabold tracking-[0.16em]">CAPITUNE</p>
          <span className="hidden text-sm text-muted sm:inline">{user.email}</span>
        </header>
        <main className="mx-auto max-w-5xl px-6 pb-16">
          <h1 className="text-4xl font-extrabold tracking-tight">{t("projects")}</h1>
          <p className="mt-2 text-muted">{t("projectsLead")}</p>
          {isDemoAI() ? (
            <p className="mt-4 max-w-2xl rounded-2xl bg-brand-soft px-4 py-3 text-sm">{t("demoModeHint")}</p>
          ) : null}
          {env.mode === "supabase" && !env.ready ? (
            <p className="mt-3 max-w-2xl text-sm text-danger">
              {t("persistenceSupabaseMissing")} {env.missing.join(", ")}
            </p>
          ) : null}
          {!publishReady ? (
            <p className="mt-3 max-w-2xl rounded-2xl bg-brand-soft px-4 py-3 text-sm">{t("publishSchemaMissing")}</p>
          ) : null}
          {env.mode === "supabase" && !quotaReady ? (
            <p className="mt-3 max-w-2xl rounded-2xl bg-brand-soft px-4 py-3 text-sm">{t("quotaSchemaMissing")}</p>
          ) : null}
          {env.mode === "supabase" && !billingReady ? (
            <p className="mt-3 max-w-2xl rounded-2xl bg-brand-soft px-4 py-3 text-sm">{t("billingSchemaMissing")}</p>
          ) : null}
          <div className="mt-8">
            <DashboardClient
              initialProjects={projects}
              publishReady={publishReady}
              usage={usage}
              stripeEnabled={isStripeConfigured()}
              billingNotice={billingNotice}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
