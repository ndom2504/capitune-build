"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Project } from "@/lib/domain";
import { t } from "@/lib/i18n/messages";
import type { GenerationUsage } from "@/lib/store/repository";
import { publicSitePath } from "@/lib/publish/url";

export function DashboardClient({
  initialProjects,
  publishReady = true,
  usage,
  stripeEnabled = false,
  billingNotice = null,
}: {
  initialProjects: Project[];
  publishReady?: boolean;
  usage: GenerationUsage;
  stripeEnabled?: boolean;
  billingNotice?: "success" | "cancel" | null;
}) {
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [publishBusy, setPublishBusy] = useState<string | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState(false);

  const empty = useMemo(() => projects.length === 0, [projects.length]);

  async function createProject(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setCreating(true);
    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });
    const payload = await response.json();
    setCreating(false);
    if (!response.ok) {
      setError(payload.error || "Création impossible.");
      return;
    }
    setName("");
    setDescription("");
    const start = description.trim().length >= 3 ? "?start=1" : "";
    router.push(`/workspace/${payload.project.id}${start}`);
  }

  async function remove(id: string) {
    if (!confirm("Supprimer ce projet et ses versions ?")) return;
    const response = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (response.ok) {
      setProjects((current) => current.filter((project) => project.id !== id));
    }
  }

  async function copyPublic(project: Project) {
    if (!project.publishToken) return;
    await navigator.clipboard.writeText(`${window.location.origin}${publicSitePath(project.publishToken)}`);
    setCopiedId(project.id);
    window.setTimeout(() => setCopiedId(null), 1600);
  }

  async function publishProject(id: string) {
    setPublishBusy(id);
    setError(null);
    const response = await fetch(`/api/projects/${id}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const payload = await response.json();
    setPublishBusy(null);
    if (!response.ok) {
      setError(payload.error || "Publication impossible.");
      return;
    }
    setProjects((current) => current.map((project) => (project.id === id ? payload.project : project)));
  }

  async function unpublishProject(id: string) {
    setPublishBusy(id);
    setError(null);
    const response = await fetch(`/api/projects/${id}/publish`, { method: "DELETE" });
    const payload = await response.json();
    setPublishBusy(null);
    if (!response.ok) {
      setError(payload.error || "Retrait impossible.");
      return;
    }
    setProjects((current) => current.map((project) => (project.id === id ? payload.project : project)));
  }

  async function rename(id: string) {
    const response = await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: renameValue }),
    });
    if (response.ok) {
      const payload = await response.json();
      setProjects((current) =>
        current.map((project) => (project.id === id ? payload.project : project)),
      );
      setRenaming(null);
    }
  }

  async function startCheckout() {
    setCheckoutBusy(true);
    setError(null);
    const response = await fetch("/api/billing/checkout", { method: "POST" });
    const payload = await response.json();
    setCheckoutBusy(false);
    if (!response.ok) {
      setError(payload.error || t("billingUnconfigured"));
      return;
    }
    if (payload.url) {
      window.location.href = payload.url as string;
    }
  }

  return (
    <div className="space-y-8">
      {billingNotice === "success" ? (
        <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{t("billingSuccess")}</p>
      ) : null}
      {billingNotice === "cancel" ? (
        <p className="rounded-2xl bg-brand-soft px-4 py-3 text-sm">{t("billingCancel")}</p>
      ) : null}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border bg-white px-5 py-4">
        <div>
          <p className="text-sm font-semibold">{usage.plan === "pro" ? t("planPro") : t("planFree")}</p>
          <p className="text-sm text-muted">
            {t("planUsage")} : {usage.used}/{usage.max}
          </p>
        </div>
        {usage.plan === "pro" ? null : stripeEnabled ? (
          <button
            type="button"
            disabled={checkoutBusy}
            onClick={() => void startCheckout()}
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {checkoutBusy ? "…" : t("upgradePro")}
          </button>
        ) : (
          <p className="text-sm text-muted">{t("billingUnconfigured")}</p>
        )}
      </section>
      <form onSubmit={createProject} className="rounded-3xl border bg-white p-6 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.35)]">
        <h2 className="text-lg font-bold">{t("newProject")}</h2>
        <p className="mt-1 text-sm text-muted">{t("newProjectHint")}</p>
        <div className="mt-4 grid gap-3">
          <input
            required
            placeholder={t("projectName")}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-xl border bg-background px-3 py-2.5"
          />
          <textarea
            placeholder={t("projectDescription")}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            className="rounded-xl border bg-background px-3 py-2.5"
          />
        </div>
        {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
        <button
          type="submit"
          disabled={creating}
          className="mt-4 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {creating ? "…" : t("newProject")}
        </button>
      </form>

      {empty ? (
        <p className="rounded-3xl border border-dashed bg-white/70 p-10 text-center text-muted">{t("emptyProjects")}</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {projects.map((project) => (
            <li key={project.id} className="flex flex-col justify-between rounded-3xl border bg-white p-5 shadow-[0_12px_32px_-24px_rgba(15,23,42,0.4)]">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold">{project.name}</h3>
                  {project.publishToken ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                      {t("publishLive")}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-muted">{project.description || "—"}</p>
              </div>
              <div className="mt-5 flex flex-wrap gap-2 text-sm">
                <a
                  href={`/workspace/${project.id}`}
                  className="rounded-full bg-accent px-4 py-2 font-semibold text-white"
                >
                  {t("open")}
                </a>
                {project.publishToken ? (
                  <>
                    <a
                      href={publicSitePath(project.publishToken)}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border px-4 py-2 font-medium"
                    >
                      {t("openPublicSite")}
                    </a>
                    <button type="button" onClick={() => void copyPublic(project)} className="rounded-full border px-4 py-2">
                      {copiedId === project.id ? t("copied") : t("copyLink")}
                    </button>
                    <button
                      type="button"
                      disabled={publishBusy === project.id || !publishReady}
                      onClick={() => void unpublishProject(project.id)}
                      className="rounded-full border px-4 py-2 text-danger disabled:opacity-40"
                    >
                      {t("unpublish")}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={publishBusy === project.id || !publishReady}
                    onClick={() => void publishProject(project.id)}
                    className="rounded-full border px-4 py-2 font-medium disabled:opacity-40"
                  >
                    {t("putOnline")}
                  </button>
                )}
                {renaming === project.id ? (
                  <>
                    <input
                      value={renameValue}
                      onChange={(event) => setRenameValue(event.target.value)}
                      className="rounded-xl border px-2 py-1"
                    />
                    <button type="button" onClick={() => rename(project.id)} className="rounded-full border px-3 py-2">
                      {t("save")}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setRenaming(project.id);
                      setRenameValue(project.name);
                    }}
                    className="rounded-full border px-3 py-2"
                  >
                    {t("rename")}
                  </button>
                )}
                <a href={`/api/projects/${project.id}/export`} className="rounded-full border px-3 py-2">
                  {t("export")}
                </a>
                <button type="button" onClick={() => remove(project.id)} className="rounded-full border px-3 py-2 text-danger">
                  {t("delete")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
