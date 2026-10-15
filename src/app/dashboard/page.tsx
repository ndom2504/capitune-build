import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { DashboardClient } from "@/components/dashboard-client";
import { LogoutButton } from "@/components/logout-button";
import { getCurrentUser } from "@/lib/auth/server";
import { t } from "@/lib/i18n/messages";
import { isDemoAI } from "@/lib/ai";
import { getEnvStatus } from "@/lib/env/status";
import { getRepository } from "@/lib/store";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  const projects = await (await getRepository()).listProjects(user.id);
  const env = getEnvStatus();

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Brand href="/dashboard" />
        <div className="flex items-center gap-2 text-sm">
          <span className="hidden text-muted sm:inline">{user.email}</span>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 pb-16">
        <h1 className="text-4xl font-extrabold tracking-tight">{t("dashboard")}</h1>
        {isDemoAI() ? (
          <p className="mt-3 max-w-2xl rounded-md bg-accent-soft px-3 py-2 text-sm">{t("demoModeHint")}</p>
        ) : null}
        <p className="mt-3 max-w-2xl text-sm text-muted">
          {env.mode === "local"
            ? t("persistenceLocal")
            : env.ready
              ? t("persistenceSupabase")
              : `${t("persistenceSupabaseMissing")} ${env.missing.join(", ")}`}
        </p>
        <div className="mt-8">
          <DashboardClient initialProjects={projects} />
        </div>
      </main>
    </div>
  );
}
