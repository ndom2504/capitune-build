"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { canManage } from "@/lib/collab/roles";
import type { Project } from "@/lib/domain";
import { t } from "@/lib/i18n/messages";
import type { GenerationUsage } from "@/lib/store/repository";
import { publicSitePath } from "@/lib/publish/url";

const EXAMPLES = [
  { name: "Construction Pro", key: "examplePrompt1" as const, tone: "from-slate-700 to-indigo-800" },
  { name: "Restaurant Délice", key: "examplePrompt2" as const, tone: "from-amber-600 to-rose-700" },
  { name: "Portfolio", key: "examplePrompt3" as const, tone: "from-sky-700 to-slate-900" },
];

export function DashboardClient({
  initialProjects,
  publishReady = true,
  usage,
  stripeEnabled = false,
  billingNotice = null,
  displayName,
  email,
}: {
  initialProjects: Project[];
  publishReady?: boolean;
  usage: GenerationUsage;
  stripeEnabled?: boolean;
  billingNotice?: "success" | "cancel" | null;
  displayName: string;
  email: string;
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
  const [query, setQuery] = useState("");
  const [menuId, setMenuId] = useState<string | null>(null);

  const helloName = displayName.trim().split(/\s+/)[0] || email.split("@")[0];
  const initials = (displayName || email)
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return projects;
    return projects.filter(
      (project) =>
        project.name.toLowerCase().includes(needle) || project.description.toLowerCase().includes(needle),
    );
  }, [projects, query]);

  const empty = projects.length === 0;
  const genPct = Math.min(100, Math.round((usage.used / Math.max(1, usage.max)) * 100));

  function isOwner(project: Project) {
    return canManage(project.accessRole ?? "owner");
  }

  function applyExample(example: (typeof EXAMPLES)[number]) {
    setName(example.name);
    setDescription(t(example.key));
    document.getElementById("nouveau")?.scrollIntoView({ behavior: "smooth" });
  }

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
    const project = projects.find((item) => item.id === id);
    if (project && !isOwner(project)) return;
    if (!confirm("Supprimer ce projet et ses versions ?")) return;
    const response = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (response.ok) {
      setProjects((current) => current.filter((project) => project.id !== id));
      setMenuId(null);
    }
  }

  async function copyPublic(project: Project) {
    if (!project.publishToken) return;
    await navigator.clipboard.writeText(`${window.location.origin}${publicSitePath(project.publishToken)}`);
    setCopiedId(project.id);
    window.setTimeout(() => setCopiedId(null), 1600);
  }

  async function publishProject(id: string) {
    const project = projects.find((item) => item.id === id);
    if (project && !isOwner(project)) return;
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
    setProjects((current) => current.map((item) => (item.id === id ? payload.project : item)));
  }

  async function unpublishProject(id: string) {
    const project = projects.find((item) => item.id === id);
    if (project && !isOwner(project)) return;
    setPublishBusy(id);
    setError(null);
    const response = await fetch(`/api/projects/${id}/publish`, { method: "DELETE" });
    const payload = await response.json();
    setPublishBusy(null);
    if (!response.ok) {
      setError(payload.error || "Retrait impossible.");
      return;
    }
    setProjects((current) => current.map((item) => (item.id === id ? payload.project : item)));
  }

  async function rename(id: string) {
    const project = projects.find((item) => item.id === id);
    if (project && !isOwner(project)) return;
    const response = await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: renameValue }),
    });
    if (response.ok) {
      const payload = await response.json();
      setProjects((current) => current.map((item) => (item.id === id ? payload.project : item)));
      setRenaming(null);
      setMenuId(null);
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
    <div className="min-h-screen bg-[#f6f8ff]">
      <header className="flex flex-wrap items-center gap-3 border-b bg-white/80 px-4 py-3 backdrop-blur sm:px-6">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">{t("searchProjects")}</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("searchProjects")}
            className="w-full rounded-full border bg-slate-50 py-2.5 pl-4 pr-4 text-sm outline-none focus:border-brand"
          />
        </label>
        <div className="flex items-center gap-2 rounded-full border bg-white px-2 py-1.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-brand">
            {initials || "C"}
          </span>
          <span className="hidden pr-2 text-sm font-medium sm:inline">{displayName || email}</span>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:px-6">
        <div className="min-w-0 space-y-6">
          {billingNotice === "success" ? (
            <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{t("billingSuccess")}</p>
          ) : null}
          {billingNotice === "cancel" ? (
            <p className="rounded-2xl bg-brand-soft px-4 py-3 text-sm">{t("billingCancel")}</p>
          ) : null}

          <section className="overflow-hidden rounded-[1.75rem] border bg-white p-6 shadow-[0_20px_50px_-36px_rgba(15,23,42,0.5)] sm:p-8">
            <p className="text-sm text-muted">
              {t("dashHello")} {helloName}
            </p>
            <div className="mt-3 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                  {t("dashHeroTitle")}{" "}
                  <span className="text-brand">{t("dashHeroAccent")}</span>
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted sm:text-base">{t("dashHeroLead")}</p>
                <div className="mt-6 flex flex-wrap gap-2">
                  <a
                    href="#nouveau"
                    className="inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white"
                  >
                    {t("createWithAi")}
                  </a>
                  <a href="#exemples" className="inline-flex rounded-full border bg-white px-5 py-2.5 text-sm font-semibold">
                    {t("seeExamples")}
                  </a>
                </div>
              </div>
              <HeroArt />
            </div>
          </section>

          <section id="projets">
            <div className="mb-3 flex items-end justify-between gap-2">
              <h2 className="text-lg font-bold">{t("recentProjects")}</h2>
              <span className="text-sm text-muted">
                {projects.length} {t("usageProjects").toLowerCase()}
              </span>
            </div>
            {empty ? (
              <p className="rounded-3xl border border-dashed bg-white/70 p-10 text-center text-muted">{t("emptyProjects")}</p>
            ) : filtered.length === 0 ? (
              <p className="rounded-3xl border bg-white p-8 text-center text-muted">{t("searchProjects")}</p>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2">
                {filtered.map((project) => (
                  <li key={project.id} className="relative overflow-hidden rounded-3xl border bg-white shadow-[0_12px_32px_-24px_rgba(15,23,42,0.4)]">
                    <a href={`/workspace/${project.id}`} className="block">
                      <div className={`h-28 bg-gradient-to-br ${coverTone(project.name)}`} />
                      <div className="p-4">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-base font-bold">{project.name}</h3>
                          {!isOwner(project) ? (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold">
                              {t("sharedWithMe")}
                            </span>
                          ) : null}
                          {project.publishToken ? (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                              {t("publishLive")}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-muted">{project.description || t("siteKind")}</p>
                        <p className="mt-2 text-xs text-muted">{formatUpdated(project.updatedAt)}</p>
                      </div>
                    </a>
                    <div className="absolute right-3 top-3">
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-sm font-bold shadow"
                        aria-label={t("moreActions")}
                        onClick={() => setMenuId(menuId === project.id ? null : project.id)}
                      >
                        ⋯
                      </button>
                    </div>
                    {menuId === project.id ? (
                      <div className="absolute right-3 top-12 z-10 w-48 rounded-2xl border bg-white p-2 text-sm shadow-xl">
                        <a href={`/workspace/${project.id}`} className="block rounded-xl px-3 py-2 hover:bg-slate-50">
                          {t("open")}
                        </a>
                        {project.publishToken ? (
                          <>
                            <a
                              href={publicSitePath(project.publishToken)}
                              target="_blank"
                              rel="noreferrer"
                              className="block rounded-xl px-3 py-2 hover:bg-slate-50"
                            >
                              {t("openPublicSite")}
                            </a>
                            <button type="button" className="block w-full rounded-xl px-3 py-2 text-left hover:bg-slate-50" onClick={() => void copyPublic(project)}>
                              {copiedId === project.id ? t("copied") : t("copyLink")}
                            </button>
                            {isOwner(project) ? (
                              <button
                                type="button"
                                disabled={publishBusy === project.id || !publishReady}
                                className="block w-full rounded-xl px-3 py-2 text-left text-danger disabled:opacity-40"
                                onClick={() => void unpublishProject(project.id)}
                              >
                                {t("unpublish")}
                              </button>
                            ) : null}
                          </>
                        ) : isOwner(project) ? (
                          <button
                            type="button"
                            disabled={publishBusy === project.id || !publishReady}
                            className="block w-full rounded-xl px-3 py-2 text-left hover:bg-slate-50 disabled:opacity-40"
                            onClick={() => void publishProject(project.id)}
                          >
                            {t("putOnline")}
                          </button>
                        ) : null}
                        {isOwner(project) ? (
                          renaming === project.id ? (
                            <div className="flex gap-1 px-2 py-1">
                              <input
                                value={renameValue}
                                onChange={(event) => setRenameValue(event.target.value)}
                                className="min-w-0 flex-1 rounded-lg border px-2 py-1"
                              />
                              <button type="button" onClick={() => void rename(project.id)} className="text-xs font-semibold">
                                {t("save")}
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="block w-full rounded-xl px-3 py-2 text-left hover:bg-slate-50"
                              onClick={() => {
                                setRenaming(project.id);
                                setRenameValue(project.name);
                              }}
                            >
                              {t("rename")}
                            </button>
                          )
                        ) : null}
                        <a href={`/api/projects/${project.id}/export`} className="block rounded-xl px-3 py-2 hover:bg-slate-50">
                          {t("export")}
                        </a>
                        {isOwner(project) ? (
                          <button type="button" className="block w-full rounded-xl px-3 py-2 text-left text-danger" onClick={() => void remove(project.id)}>
                            {t("delete")}
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-[1.75rem] border bg-white p-6">
            <h2 className="text-lg font-bold">{t("howTitle")}</h2>
            <p className="mt-1 text-sm text-muted">{t("howLead")}</p>
            <ol className="mt-5 grid gap-4 sm:grid-cols-3">
              {[
                [t("dashStep1Title"), t("step1")],
                [t("dashStep2Title"), t("step2")],
                [t("dashStep3Title"), t("step3")],
              ].map((item, index) => (
                <li key={item[0]} className="rounded-2xl bg-slate-50 p-4">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-brand">
                    {index + 1}
                  </span>
                  <p className="mt-3 font-semibold">{item[0]}</p>
                  <p className="mt-1 text-sm text-muted">{item[1]}</p>
                </li>
              ))}
            </ol>
          </section>

          <form id="nouveau" onSubmit={createProject} className="rounded-[1.75rem] border bg-white p-6">
            <h2 className="text-lg font-bold">{t("createWithAi")}</h2>
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
        </div>

        <aside className="space-y-4">
          <section id="plan" className="rounded-[1.5rem] border bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="font-semibold">{t("yourUsage")}</p>
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-brand">
                {usage.plan === "pro" ? t("planPro") : t("planFree")}
              </span>
            </div>
            <p className="mt-4 text-sm">
              {t("usageProjects")} <span className="float-right font-semibold">{projects.length}</span>
            </p>
            <p className="mt-3 text-sm">
              {t("usageGenerations")}{" "}
              <span className="float-right font-semibold">
                {usage.used}/{usage.max}
              </span>
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-brand" style={{ width: `${genPct}%` }} />
            </div>
            {usage.plan === "pro" ? null : stripeEnabled ? (
              <button
                type="button"
                disabled={checkoutBusy}
                onClick={() => void startCheckout()}
                className="mt-4 w-full rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {checkoutBusy ? "…" : t("upgradePro")}
              </button>
            ) : (
              <p className="mt-3 text-xs text-muted">{t("billingUnconfigured")}</p>
            )}
            <Link href="/#tarifs" className="mt-3 block text-sm font-medium text-brand">
              {t("seePlanDetails")}
            </Link>
          </section>

          <section className="rounded-[1.5rem] border bg-white p-5">
            <p className="font-semibold">{t("helpTitle")}</p>
            <Link href="/#ressources" className="mt-3 block rounded-2xl bg-slate-50 px-3 py-3">
              <p className="text-sm font-medium">{t("helpDocs")}</p>
              <p className="text-xs text-muted">{t("helpDocsLead")}</p>
            </Link>
            <Link href="/demo" className="mt-2 block rounded-2xl bg-slate-50 px-3 py-3">
              <p className="text-sm font-medium">{t("helpDemo")}</p>
              <p className="text-xs text-muted">{t("helpDemoLead")}</p>
            </Link>
          </section>

          <section id="exemples" className="rounded-[1.5rem] border bg-gradient-to-br from-indigo-50 to-white p-5">
            <p className="font-semibold">{t("inspirationTitle")}</p>
            <p className="mt-1 text-sm text-muted">{t("inspirationLead")}</p>
            <ul className="mt-3 space-y-2">
              {EXAMPLES.map((example) => (
                <li key={example.key}>
                  <button
                    type="button"
                    onClick={() => applyExample(example)}
                    className="w-full rounded-2xl border bg-white px-3 py-2 text-left text-sm font-medium hover:border-brand"
                  >
                    {example.name}
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-[1.5rem] border bg-white p-5">
            <p className="font-semibold">{t("dashTip")}</p>
            <p className="mt-1 text-sm text-muted">{t("dashTipBody")}</p>
          </section>
        </aside>
      </div>
    </div>
  );
}

function coverTone(name: string): string {
  const tones = [
    "from-slate-600 to-indigo-800",
    "from-indigo-500 to-sky-700",
    "from-emerald-700 to-slate-800",
    "from-violet-700 to-slate-900",
  ];
  let hash = 0;
  for (const char of name) hash = (hash + char.charCodeAt(0)) % tones.length;
  return tones[hash] ?? tones[0];
}

function formatUpdated(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.max(0, Math.round(diff / 3_600_000));
  if (hours < 1) return t("editedJustNow");
  if (hours < 24) return t("editedHours").replace("{n}", String(hours));
  return t("editedDays").replace("{n}", String(Math.max(1, Math.round(hours / 24))));
}

function HeroArt() {
  return (
    <div className="relative mx-auto hidden h-44 w-full max-w-sm lg:block" aria-hidden>
      <div className="absolute left-6 top-4 h-36 w-40 rotate-[-8deg] rounded-2xl border bg-white p-2 shadow-lg">
        <div className="h-full rounded-xl bg-gradient-to-br from-indigo-50 to-white p-2 text-[8px] text-muted">
          <p className="font-semibold text-foreground">Capitune</p>
          <p className="mt-2">✓ Accueil</p>
          <p>✓ Services</p>
          <p>✓ Contact</p>
        </div>
      </div>
      <div className="absolute right-2 top-0 h-40 w-48 rotate-[6deg] overflow-hidden rounded-2xl border bg-slate-900 shadow-xl">
        <div className="h-16 bg-gradient-to-br from-slate-600 to-indigo-900" />
        <div className="space-y-1 p-3">
          <div className="h-2 w-20 rounded bg-white/40" />
          <div className="h-2 w-28 rounded bg-white/20" />
          <div className="mt-3 grid grid-cols-3 gap-1">
            <span className="h-8 rounded bg-white/10" />
            <span className="h-8 rounded bg-white/10" />
            <span className="h-8 rounded bg-white/10" />
          </div>
        </div>
      </div>
    </div>
  );
}
