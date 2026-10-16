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
  let collabReady = true;
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
  try {
    collabReady = await repository.collabSchemaReady();
  } catch {
    collabReady = false;
  }
  const billingNotice = query.billing === "success" ? "success" : query.billing === "cancel" ? "cancel" : null;
  const collabNotice = query.collab === "schema" ? "schema" : query.collab === "invalid" ? "invalid" : null;

  return (
    <div className="flex min-h-screen">
      <AppRail variant="dashboard" />
      <div className="min-w-0 flex-1">
        {isDemoAI() ||
        (env.mode === "supabase" && !env.ready) ||
        !publishReady ||
        (env.mode === "supabase" && !quotaReady) ||
        (env.mode === "supabase" && !billingReady) ||
        (env.mode === "supabase" && !collabReady) ||
        collabNotice ? (
          <div className="space-y-2 px-4 pt-4 lg:px-6">
            {isDemoAI() ? (
              <p className="rounded-2xl bg-brand-soft px-4 py-3 text-sm">{t("demoModeHint")}</p>
            ) : null}
            {env.mode === "supabase" && !env.ready ? (
              <p className="text-sm text-danger">
                {t("persistenceSupabaseMissing")} {env.missing.join(", ")}
              </p>
            ) : null}
            {!publishReady ? (
              <p className="rounded-2xl bg-brand-soft px-4 py-3 text-sm">{t("publishSchemaMissing")}</p>
            ) : null}
            {env.mode === "supabase" && !quotaReady ? (
              <p className="rounded-2xl bg-brand-soft px-4 py-3 text-sm">{t("quotaSchemaMissing")}</p>
            ) : null}
            {env.mode === "supabase" && !billingReady ? (
              <p className="rounded-2xl bg-brand-soft px-4 py-3 text-sm">{t("billingSchemaMissing")}</p>
            ) : null}
            {env.mode === "supabase" && !collabReady ? (
              <p className="rounded-2xl bg-brand-soft px-4 py-3 text-sm">{t("collabSchemaMissing")}</p>
            ) : null}
            {collabNotice === "schema" ? (
              <p className="rounded-2xl bg-brand-soft px-4 py-3 text-sm">{t("collabSchemaMissing")}</p>
            ) : null}
            {collabNotice === "invalid" ? (
              <p className="rounded-2xl bg-brand-soft px-4 py-3 text-sm">{t("collabInvalid")}</p>
            ) : null}
          </div>
        ) : null}
        <DashboardClient
          initialProjects={projects}
          publishReady={publishReady}
          usage={usage}
          stripeEnabled={isStripeConfigured()}
          billingNotice={billingNotice}
          displayName={user.displayName}
          email={user.email}
        />
      </div>
    </div>
  );
}
