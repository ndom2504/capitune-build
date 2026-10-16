"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppRail } from "@/components/app-rail";
import { canEdit, canManage, type AccessRole } from "@/lib/collab/roles";
import { playgroundSrcDoc } from "@/lib/demo/document";
import type { ProjectBundle, ProjectMember } from "@/lib/domain";
import { t } from "@/lib/i18n/messages";
import { isBinaryFilePath } from "@/lib/media/paths";
import { previewPageUrl } from "@/lib/preview/url";
import { isPublishSlug, slugify } from "@/lib/publish/slug";
import { publicSitePath } from "@/lib/publish/url";

const frames = {
  desktop: "100%",
  tablet: "768px",
  mobile: "390px",
} as const;

type Device = keyof typeof frames;
type Drawer = "none" | "files" | "publish";
type StudioTab = "conversation" | "files" | "versions";

const EXAMPLE_KEYS = ["examplePrompt1", "examplePrompt2", "examplePrompt3"] as const;

export function WorkspaceClient({
  initial,
  demoMode,
  autoStart = false,
  previewToken,
  playground = false,
}: {
  initial: ProjectBundle;
  demoMode: boolean;
  autoStart?: boolean;
  previewToken: string;
  playground?: boolean;
}) {
  const router = useRouter();
  const [bundle, setBundle] = useState(initial);
  const [prompt, setPrompt] = useState("");
  const [lastPrompt, setLastPrompt] = useState("");
  const [device, setDevice] = useState<Device>("desktop");
  const [tab, setTab] = useState<"conversation" | "preview">("conversation");
  const [studioTab, setStudioTab] = useState<StudioTab>("conversation");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [drawer, setDrawer] = useState<Drawer>("none");
  const [copied, setCopied] = useState(false);
  const [publishBusy, setPublishBusy] = useState(false);
  const [slug, setSlug] = useState(() => {
    const current = initial.project.publishToken;
    if (current && isPublishSlug(current)) return current;
    return slugify(initial.project.name) || "site";
  });
  const [selectedFile, setSelectedFile] = useState<string | null>(
    initial.files.find((file) => file.path === "index.html")?.path ?? initial.files[0]?.path ?? null,
  );
  const [previewPage, setPreviewPage] = useState(
    initial.files.find((file) => file.path === "index.html")?.path ?? "index.html",
  );
  const [draft, setDraft] = useState(
    () =>
      initial.files.find((file) => file.path === "index.html")?.content ??
      initial.files[0]?.content ??
      "",
  );
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const accessRole: AccessRole = bundle.project.accessRole ?? "owner";
  const allowEdit = playground || canEdit(accessRole);
  const allowManage = !playground && canManage(accessRole);
  const autoStarted = useRef(false);

  const htmlPages = useMemo(
    () => bundle.files.filter((file) => file.path.endsWith(".html")).map((file) => file.path),
    [bundle.files],
  );
  const selected = useMemo(
    () => bundle.files.find((file) => file.path === selectedFile) ?? null,
    [bundle.files, selectedFile],
  );
  const hasPreview = htmlPages.length > 0;
  const previewSrc = previewPageUrl(previewToken, previewPage, previewKey);
  const dirty = Boolean(selected && draft !== selected.content);

  useEffect(() => {
    const node = threadRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [bundle.messages, pending, lastPrompt, error]);

  useEffect(() => {
    const file = bundle.files.find((item) => item.path === selectedFile);
    setDraft(file?.content ?? "");
  }, [bundle.files, selectedFile]);

  async function refreshBundle() {
    const response = await fetch(`/api/projects/${bundle.project.id}`);
    if (response.ok) {
      const next = (await response.json()) as ProjectBundle;
      setBundle(next);
      setPreviewKey((value) => value + 1);
      const html = next.files.find((file) => file.path === "index.html")?.path ?? next.files[0]?.path;
      if (html) {
        setSelectedFile((current) =>
          next.files.some((file) => file.path === current) ? current : html,
        );
        setPreviewPage((current) =>
          next.files.some((file) => file.path === current) ? current : html,
        );
      }
    }
  }

  async function generate(text: string) {
    const value = text.trim();
    if (!value || pending || !allowEdit) return;
    setPending(true);
    setError(null);
    setLastPrompt(value);
    const response = await fetch(
      playground ? "/api/demo/generate" : `/api/projects/${bundle.project.id}/generate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          playground
            ? {
                prompt: value,
                files: bundle.files.map((file) => ({ path: file.path, content: file.content })),
                messages: bundle.messages
                  .filter((message) => message.role === "user" || message.role === "assistant")
                  .slice(-6)
                  .map((message) => ({ role: message.role, content: message.content })),
              }
            : { prompt: value },
        ),
      },
    );
    const payload = await response.json();
    setPending(false);
    if (!response.ok) {
      setError(payload.error || "La génération a échoué.");
      return;
    }
    setPrompt("");
    if (playground && Array.isArray(payload.files)) {
      const now = new Date().toISOString();
      setBundle((current) => ({
        ...current,
        files: payload.files.map(
          (file: { path: string; content: string }, index: number) => ({
            id: `file_demo_${index}`,
            projectId: current.project.id,
            path: file.path,
            content: file.content,
            updatedAt: now,
          }),
        ),
        messages: [
          ...current.messages,
          {
            id: `msg_u_${now}`,
            conversationId: current.conversation.id,
            role: "user" as const,
            content: value,
            demoMode: true,
            createdAt: now,
          },
          {
            id: `msg_a_${now}`,
            conversationId: current.conversation.id,
            role: "assistant" as const,
            content: String(payload.summary || ""),
            demoMode: true,
            createdAt: now,
          },
        ],
      }));
      setPreviewKey((key) => key + 1);
    } else {
      await refreshBundle();
    }
    setTab("preview");
  }

  useEffect(() => {
    if (!autoStart || autoStarted.current || initial.messages.length > 0) return;
    const text = initial.project.description.trim();
    if (text.length < 3) return;
    autoStarted.current = true;
    void generate(text);
    router.replace(`/workspace/${initial.project.id}`, { scroll: false });
  }, [autoStart, initial.messages.length, initial.project.description, initial.project.id, router]);

  async function restore(versionId: string) {
    if (playground || !allowEdit) return;
    if (!confirm("Restaurer cette version ? Une nouvelle version de récupération sera créée.")) {
      return;
    }
    const response = await fetch(`/api/projects/${bundle.project.id}/restore`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ versionId }),
    });
    if (!response.ok) {
      const payload = await response.json();
      setError(payload.error || "Restauration impossible.");
      return;
    }
    await refreshBundle();
    setTab("preview");
    setDrawer("none");
  }

  async function rename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (playground || !allowManage) return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "");
    await fetch(`/api/projects/${bundle.project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    await refreshBundle();
  }

  function onPromptKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void generate(prompt);
    }
  }

  const publicPath = bundle.project.publishToken ? publicSitePath(bundle.project.publishToken) : null;

  useEffect(() => {
    if (drawer !== "publish" || !allowManage) return;
    void fetch(`/api/projects/${bundle.project.id}/members`)
      .then((response) => response.json())
      .then((payload) => {
        if (Array.isArray(payload.members)) setMembers(payload.members);
      })
      .catch(() => undefined);
  }, [allowManage, bundle.project.id, drawer]);

  async function createInvite(role: "editor" | "viewer") {
    setPublishBusy(true);
    setError(null);
    const response = await fetch(`/api/projects/${bundle.project.id}/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const payload = await response.json();
    setPublishBusy(false);
    if (!response.ok) {
      setError(payload.error || "Invitation impossible.");
      return;
    }
    setInviteUrl(payload.url as string);
    await navigator.clipboard.writeText(payload.url as string).catch(() => undefined);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function publish(rotate = false) {
    if (!allowManage) return;
    setPublishBusy(true);
    setError(null);
    const response = await fetch(`/api/projects/${bundle.project.id}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rotate, slug: slug.trim() || undefined }),
    });
    const payload = await response.json();
    setPublishBusy(false);
    if (!response.ok) {
      setError(payload.error || "Publication impossible.");
      return;
    }
    setBundle((current) => ({ ...current, project: payload.project }));
    if (payload.project.publishToken && isPublishSlug(payload.project.publishToken)) {
      setSlug(payload.project.publishToken);
    }
  }

  async function unpublish() {
    if (!allowManage) return;
    setPublishBusy(true);
    setError(null);
    const response = await fetch(`/api/projects/${bundle.project.id}/publish`, { method: "DELETE" });
    const payload = await response.json();
    setPublishBusy(false);
    if (!response.ok) {
      setError(payload.error || "Retrait impossible.");
      return;
    }
    setBundle((current) => ({ ...current, project: payload.project }));
  }

  async function saveFile() {
    if (playground || !allowEdit) return;
    if (!selectedFile || !dirty || saving) return;
    setSaving(true);
    setError(null);
    const response = await fetch(`/api/projects/${bundle.project.id}/files`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: selectedFile, content: draft }),
    });
    const payload = await response.json();
    setSaving(false);
    if (!response.ok) {
      setError(payload.error || "Enregistrement impossible.");
      return;
    }
    await refreshBundle();
  }

  function openFile(path: string) {
    setSelectedFile(path);
    setStudioTab("files");
    if (path.endsWith(".html")) {
      setPreviewPage(path);
      setTab("preview");
    }
  }

  async function uploadMedia(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file || playground || !allowEdit) return;
    setSaving(true);
    setError(null);
    const body = new FormData();
    body.append("file", file);
    const response = await fetch(`/api/projects/${bundle.project.id}/media`, { method: "POST", body });
    const payload = await response.json();
    setSaving(false);
    if (!response.ok) {
      setError(payload.error || "Import d’image impossible.");
      return;
    }
    await refreshBundle();
  }

  async function copyPublicLink() {
    if (!publicPath) return;
    await navigator.clipboard.writeText(`${window.location.origin}${publicPath}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  const fileGroups = useMemo(() => groupProjectFiles(bundle.files.map((file) => file.path)), [bundle.files]);

  const filesBody = (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {allowEdit && !playground ? (
        <div className="border-b px-4 py-3">
          <label className="flex cursor-pointer justify-center rounded-full border px-4 py-2 text-sm font-medium">
            {t("uploadImage")}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/x-icon"
              className="hidden"
              onChange={(event) => void uploadMedia(event.target.files)}
            />
          </label>
          <p className="mt-1 text-center text-xs text-muted">{t("mediaHint")}</p>
        </div>
      ) : null}
      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden md:grid-cols-[minmax(140px,180px)_minmax(0,1fr)]">
        <div className="overflow-auto border-b p-3 text-sm md:border-b-0 md:border-r">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{t("filesTree")}</p>
          <ul className="space-y-1">
            {fileGroups.root.map((path) => (
              <li key={path}>
                <button
                  type="button"
                  className={`w-full truncate rounded-lg px-2 py-1 text-left ${
                    path === selectedFile ? "bg-brand-soft font-semibold text-brand" : "text-muted"
                  }`}
                  onClick={() => openFile(path)}
                >
                  {path}
                </button>
              </li>
            ))}
            {[...fileGroups.folders.entries()].map(([folder, paths]) => (
              <li key={folder}>
                <p className="px-2 py-1 text-xs font-semibold text-foreground">{folder}/</p>
                <ul className="ml-2 space-y-0.5">
                  {paths.map((path) => (
                    <li key={path}>
                      <button
                        type="button"
                        className={`w-full truncate rounded-lg px-2 py-1 text-left ${
                          path === selectedFile ? "bg-brand-soft font-semibold text-brand" : "text-muted"
                        }`}
                        onClick={() => openFile(path)}
                      >
                        {path.slice(folder.length + 1)}
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
        <div className="overflow-auto p-3">
          {selected ? (
            isBinaryFilePath(selected.path) ? (
              <div className="space-y-2">
                <img
                  src={
                    playground
                      ? `data:image/png;base64,${selected.content.replace(/\s/g, "")}`
                      : previewPageUrl(previewToken, selected.path, previewKey)
                  }
                  alt={selected.path}
                  className="max-h-48 rounded-2xl border bg-slate-50 object-contain p-2"
                />
                <p className="text-xs text-muted">{t("binaryFile")}</p>
              </div>
            ) : (
              <>
                <p className="mb-2 font-mono text-xs text-muted">{selected.path}</p>
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  readOnly={!allowEdit}
                  className="h-64 w-full resize-y rounded-2xl border bg-slate-50 p-3 font-mono text-xs"
                  spellCheck={false}
                />
                {allowEdit && !playground ? (
                  <button
                    type="button"
                    disabled={!dirty || saving}
                    onClick={() => void saveFile()}
                    className="mt-2 w-full rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                  >
                    {saving ? "…" : dirty ? t("saveFile") : t("saved")}
                  </button>
                ) : null}
              </>
            )
          ) : (
            <p className="p-6 text-center text-sm text-muted">{t("selectFile")}</p>
          )}
        </div>
      </div>
    </div>
  );

  const versionsBody = (
    <ul className="space-y-2 overflow-auto p-4 text-sm">
      {bundle.versions.length === 0 ? (
        <li className="text-muted">{t("noVersions")}</li>
      ) : (
        bundle.versions.map((version) => (
          <li key={version.id} className="flex items-center justify-between gap-2 rounded-2xl bg-slate-50 px-3 py-2">
            <span className="truncate">{version.label}</span>
            {allowEdit && !playground ? (
              <button type="button" className="shrink-0 text-brand" onClick={() => restore(version.id)}>
                {t("restore")}
              </button>
            ) : null}
          </li>
        ))
      )}
    </ul>
  );

  const conversationPanel = (
    <section className="flex h-full min-h-0 flex-col border-r bg-white">
      <div className="flex gap-1 border-b px-3 py-2">
        {(["conversation", "files", "versions"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setStudioTab(item)}
            className={`rounded-full px-3 py-1 text-sm ${studioTab === item ? "bg-accent text-white" : "text-muted hover:bg-slate-50"}`}
          >
            {item === "conversation" ? t("conversation") : item === "files" ? t("files") : t("versions")}
          </button>
        ))}
      </div>
      {studioTab === "files" ? filesBody : null}
      {studioTab === "versions" ? versionsBody : null}
      {studioTab === "conversation" ? (
      <>
      <div ref={threadRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {bundle.messages.length === 0 && !pending ? (
          <div className="space-y-4">
            <p className="text-sm text-muted">{t("conversationEmpty")}</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("examplesTitle")}</p>
            <ul className="space-y-2">
              {EXAMPLE_KEYS.map((key) => (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => void generate(t(key))}
                    className="w-full rounded-2xl border bg-slate-50 px-3 py-2.5 text-left text-sm leading-relaxed hover:border-brand hover:bg-brand-soft"
                  >
                    {t(key)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          bundle.messages.map((message) => (
            <Bubble
              key={message.id}
              role={message.role === "user" ? "user" : "assistant"}
              demo={message.demoMode}
            >
              {message.content}
            </Bubble>
          ))
        )}
        {pending ? (
          <>
            <Bubble role="user">{lastPrompt}</Bubble>
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 text-sm">
              <p className="font-semibold text-brand">{t("genTitle")}</p>
              <ul className="mt-3 space-y-1.5 text-muted">
                <li>{t("genStep1")}</li>
                <li>{t("genStep2")}</li>
                <li>{t("genStep3")}</li>
                <li className="font-medium text-brand">{t("genStep4")}</li>
              </ul>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white">
                <div className="h-full w-2/3 animate-pulse rounded-full bg-brand" />
              </div>
              <p className="mt-2 text-xs text-muted">{t("genWait")}</p>
            </div>
            <p className="rounded-2xl bg-slate-50 px-3 py-2 text-xs text-muted">{t("genExpect")}</p>
          </>
        ) : null}
      </div>
      {error ? (
        <div className="border-t px-4 py-3 text-sm text-danger">
          <p>{error}</p>
          {lastPrompt ? (
            <button type="button" className="mt-2 font-medium underline" onClick={() => generate(lastPrompt)}>
              {t("retry")}
            </button>
          ) : null}
        </div>
      ) : null}
      <form
        className="border-t p-3"
        onSubmit={(event) => {
          event.preventDefault();
          void generate(prompt);
        }}
      >
        <div className="flex items-end gap-2 rounded-2xl border bg-slate-50 px-3 py-2">
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={onPromptKey}
            placeholder={bundle.messages.length ? t("iteratePlaceholder") : t("promptPlaceholder")}
            rows={2}
            disabled={pending || !allowEdit}
            className="min-h-[44px] flex-1 resize-none bg-transparent py-1.5 text-sm outline-none disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={pending || !prompt.trim() || !allowEdit}
            className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-white disabled:opacity-40"
            aria-label={t("send")}
          >
            →
          </button>
        </div>
        <p className="mt-2 text-xs text-muted">{pending ? t("generating") : t("sendHint")}</p>
      </form>
      </>
      ) : null}
    </section>
  );

  const previewPanel = (
    <section className="flex h-full min-h-0 flex-col bg-[#f6f8ff]">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
        <p className="font-semibold">{t("livePreview")}</p>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 lg:hidden">
            {(Object.keys(frames) as Device[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setDevice(item)}
                className={`rounded-full px-2 py-0.5 text-[11px] ${device === item ? "bg-slate-900 text-white" : "border bg-white"}`}
              >
                {t(item)}
              </button>
            ))}
          </div>
          {hasPreview && !playground ? (
            <a href={previewSrc} target="_blank" rel="noreferrer" className="text-xs font-medium text-brand">
              {t("openInTab")}
            </a>
          ) : null}
        </div>
      </div>
      <div className="relative min-h-0 flex-1 p-3 pt-0">
        <div className="flex h-full flex-col overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b bg-slate-50 px-3 py-2 sm:flex-row sm:items-center">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="h-2 w-2 shrink-0 rounded-full bg-red-400" />
              <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" />
              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
              <span className="ml-2 truncate rounded-md bg-white px-2 py-0.5 text-[11px] text-muted">
                {previewPage}
              </span>
            </div>
            {htmlPages.length > 1 ? (
              <div className="flex gap-1 overflow-x-auto sm:ml-auto">
                {htmlPages.map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setPreviewPage(page)}
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${
                      previewPage === page ? "bg-accent text-white" : "border bg-white"
                    }`}
                  >
                    {page.replace(/\.html$/, "")}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className={`flex flex-1 justify-center overflow-auto bg-slate-50 ${pending ? "opacity-50" : ""}`}>
            {hasPreview ? (
              <iframe
                title="Aperçu du projet"
                src={playground ? undefined : previewSrc}
                srcDoc={playground ? playgroundSrcDoc(bundle.files, previewPage) : undefined}
                sandbox="allow-scripts"
                referrerPolicy="no-referrer"
                className="h-full min-h-[480px] bg-white"
                style={{ width: frames[device], maxWidth: "100%" }}
              />
            ) : (
              <p className="self-center p-6 text-sm text-muted">{t("previewEmpty")}</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#f6f8ff]">
      <AppRail variant="dashboard" />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b bg-white px-3 py-2 sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              className="shrink-0 text-sm text-muted lg:hidden"
              onClick={() => router.push(playground ? "/" : "/dashboard")}
            >
              ←
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                {allowManage && !playground ? (
                  <form onSubmit={rename} className="flex min-w-0 flex-1 items-center gap-2">
                    <input
                      name="name"
                      defaultValue={bundle.project.name}
                      className="min-w-0 w-full truncate rounded-xl border-0 bg-transparent px-1 py-0.5 text-base font-bold outline-none focus:bg-slate-50"
                    />
                  </form>
                ) : (
                  <p className="min-w-0 truncate text-base font-bold">{bundle.project.name}</p>
                )}
                {pending ? (
                  <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                    {t("inProgress")}
                  </span>
                ) : publicPath ? (
                  <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                    {t("publishLive")}
                  </span>
                ) : null}
              </div>
              <p className="truncate px-1 text-[11px] text-muted">
                {t("createdLabel")} {formatShortDate(bundle.project.createdAt)} · {formatUpdated(bundle.project.updatedAt)}
              </p>
            </div>
            <div className="hidden items-center gap-1 lg:flex">
              {(Object.keys(frames) as Device[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setDevice(item)}
                  className={`rounded-full px-3 py-1 text-xs ${device === item ? "bg-slate-900 text-white" : "border bg-white"}`}
                >
                  {t(item)}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setDrawer(drawer === "publish" ? "none" : "publish")}
              className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-white"
            >
              {publicPath ? t("publishLive") : t("publish")}
            </button>
            {demoMode ? (
              <span className="hidden rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand sm:inline">
                {t("demoMode")}
              </span>
            ) : null}
          </div>
        </header>
        {playground ? (
          <p className="border-b bg-brand-soft px-4 py-2 text-xs sm:text-sm">
            {t("playgroundHint")}{" "}
            <Link href="/signup" className="font-semibold text-brand">
              {t("saveToAccount")}
            </Link>
          </p>
        ) : demoMode ? (
          <p className="border-b bg-brand-soft px-4 py-2 text-xs sm:text-sm">{t("demoModeHint")}</p>
        ) : !allowEdit ? (
          <p className="border-b bg-brand-soft px-4 py-2 text-xs sm:text-sm">{t("readOnlyHint")}</p>
        ) : null}

        <div className="flex gap-2 border-b bg-white px-3 py-2 lg:hidden">
          {(["conversation", "preview"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={`rounded-full px-3 py-1 text-sm ${tab === item ? "bg-accent text-white" : "border"}`}
            >
              {t(item)}
            </button>
          ))}
        </div>

        <div className="relative min-h-0 flex-1">
          <div className="hidden h-full lg:grid lg:grid-cols-[minmax(320px,440px)_minmax(0,1fr)]">
            {conversationPanel}
            {previewPanel}
          </div>
          <div className="h-full overflow-hidden lg:hidden">
            {tab === "conversation" ? conversationPanel : previewPanel}
          </div>

          {drawer !== "none" ? (
            <aside className="absolute inset-y-0 right-0 z-20 flex w-full max-w-sm flex-col border-l bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <p className="font-semibold">{drawer === "publish" ? t("publish") : t("files")}</p>
                <button type="button" className="text-sm text-muted" onClick={() => setDrawer("none")}>
                  {t("cancel")}
                </button>
              </div>
              {drawer === "publish" ? (
                <div className="space-y-3 p-4 text-sm">
                  {playground ? (
                    <Link href="/signup" className="flex justify-center rounded-full bg-accent px-4 py-2.5 font-semibold text-white">
                      {t("saveToAccount")}
                    </Link>
                  ) : (
                    <>
                  <p className="text-muted">{t("publishHint")}</p>
                  <label className="block text-xs font-medium text-muted" htmlFor="publish-slug">
                    {t("publishSlug")}
                  </label>
                  <div className="flex items-center rounded-2xl border bg-slate-50 px-3 py-2 font-mono text-xs">
                    <span className="shrink-0 text-muted">/s/</span>
                    <input
                      id="publish-slug"
                      value={slug}
                      onChange={(event) => setSlug(event.target.value.toLowerCase())}
                      spellCheck={false}
                      className="min-w-0 flex-1 bg-transparent outline-none"
                    />
                  </div>
                  <p className="text-xs text-muted">{t("publishSlugHint")}</p>
                  {publicPath ? (
                    <>
                      <p className="break-all rounded-2xl bg-slate-50 px-3 py-2 font-mono text-xs">{publicPath}</p>
                      <button
                        type="button"
                        onClick={() => void copyPublicLink()}
                        className="flex w-full justify-center rounded-full bg-accent px-4 py-2.5 font-semibold text-white"
                      >
                        {copied ? t("copied") : t("copyLink")}
                      </button>
                      <a
                        href={publicPath}
                        target="_blank"
                        rel="noreferrer"
                        className="flex justify-center rounded-full border px-4 py-2.5 font-medium"
                      >
                        {t("openPublicSite")}
                      </a>
                      {allowManage ? (
                        <>
                      <button
                        type="button"
                        disabled={publishBusy}
                        onClick={() => void publish(true)}
                        className="flex w-full justify-center rounded-full border px-4 py-2.5 disabled:opacity-60"
                      >
                        {t("rotateLink")}
                      </button>
                      <button
                        type="button"
                        disabled={publishBusy}
                        onClick={() => void unpublish()}
                        className="flex w-full justify-center rounded-full border px-4 py-2.5 text-danger disabled:opacity-60"
                      >
                        {t("unpublish")}
                      </button>
                        </>
                      ) : null}
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={publishBusy || !hasPreview || !allowManage}
                      onClick={() => void publish(false)}
                      className="flex w-full justify-center rounded-full bg-accent px-4 py-2.5 font-semibold text-white disabled:opacity-60"
                    >
                      {t("putOnline")}
                    </button>
                  )}
                  {allowManage ? (
                    <div className="space-y-2 border-t pt-3">
                      <p className="font-medium">{t("invite")}</p>
                      <p className="text-xs text-muted">{t("inviteHint")}</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={publishBusy}
                          onClick={() => void createInvite("editor")}
                          className="flex-1 rounded-full border px-3 py-2"
                        >
                          {t("inviteEditor")}
                        </button>
                        <button
                          type="button"
                          disabled={publishBusy}
                          onClick={() => void createInvite("viewer")}
                          className="flex-1 rounded-full border px-3 py-2"
                        >
                          {t("inviteViewer")}
                        </button>
                      </div>
                      {inviteUrl ? <p className="break-all font-mono text-[11px]">{inviteUrl}</p> : null}
                      <p className="font-medium">{t("members")}</p>
                      <ul className="space-y-1 text-xs">
                        {members.map((member) => (
                          <li key={member.userId} className="flex items-center justify-between gap-2">
                            <span className="truncate">
                              {member.displayName || member.email} ·{" "}
                              {member.role === "owner"
                                ? t("roleOwner")
                                : member.role === "editor"
                                  ? t("roleEditor")
                                  : t("roleViewer")}
                            </span>
                            {member.role !== "owner" ? (
                              <button
                                type="button"
                                className="text-danger"
                                onClick={() => {
                                  void fetch(`/api/projects/${bundle.project.id}/members`, {
                                    method: "DELETE",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ userId: member.userId }),
                                  }).then(() =>
                                    setMembers((current) => current.filter((item) => item.userId !== member.userId)),
                                  );
                                }}
                              >
                                {t("removeMember")}
                              </button>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {hasPreview && !playground ? (
                    <a
                      href={previewSrc}
                      target="_blank"
                      rel="noreferrer"
                      className="flex justify-center rounded-full border px-4 py-2.5 font-medium"
                    >
                      {t("openPreview")}
                    </a>
                  ) : null}
                  {!playground ? (
                  <a
                    href={`/api/projects/${bundle.project.id}/export`}
                    className="flex justify-center rounded-full border px-4 py-2.5 font-medium"
                  >
                    {t("export")}
                  </a>
                  ) : null}
                    </>
                  )}
                </div>
              ) : (
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  <div className="border-b p-4">
                    <p className="text-sm font-medium">{t("versions")}</p>
                    <ul className="mt-2 max-h-40 space-y-2 overflow-auto text-sm">
                      {bundle.versions.length === 0 ? (
                        <li className="text-muted">{t("noVersions")}</li>
                      ) : (
                        bundle.versions.map((version) => (
                          <li key={version.id} className="flex items-center justify-between gap-2">
                            <span className="truncate">{version.label}</span>
                            {allowEdit && !playground ? (
                            <button type="button" className="text-brand" onClick={() => restore(version.id)}>
                              {t("restore")}
                            </button>
                            ) : null}
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                  <div className="flex-1 overflow-auto p-4">
                    <p className="text-sm font-medium">{t("files")}</p>
                    {allowEdit && !playground ? (
                      <>
                    <label className="mt-3 flex cursor-pointer justify-center rounded-full border px-4 py-2 text-sm font-medium">
                      {t("uploadImage")}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif,image/x-icon"
                        className="hidden"
                        onChange={(event) => void uploadMedia(event.target.files)}
                      />
                    </label>
                    <p className="mt-1 text-xs text-muted">{t("mediaHint")}</p>
                      </>
                    ) : null}
                    <ul className="mt-2 space-y-1 text-sm">
                      {bundle.files.map((file) => (
                        <li key={file.id}>
                          <button
                            type="button"
                            className={file.path === selectedFile ? "font-semibold text-brand" : "text-muted"}
                            onClick={() => openFile(file.path)}
                          >
                            {file.path}
                          </button>
                        </li>
                      ))}
                    </ul>
                    {selected ? (
                      isBinaryFilePath(selected.path) ? (
                        <div className="mt-3 space-y-2">
                          <img
                            src={
                              playground
                                ? `data:image/png;base64,${selected.content.replace(/\s/g, "")}`
                                : previewPageUrl(previewToken, selected.path, previewKey)
                            }
                            alt={selected.path}
                            className="max-h-48 rounded-2xl border bg-slate-50 object-contain p-2"
                          />
                          <p className="text-xs text-muted">{t("binaryFile")}</p>
                        </div>
                      ) : (
                      <>
                        <textarea
                          value={draft}
                          onChange={(event) => setDraft(event.target.value)}
                          readOnly={!allowEdit}
                          className="mt-3 h-56 w-full resize-y rounded-2xl border bg-slate-50 p-3 font-mono text-xs"
                          spellCheck={false}
                        />
                        {allowEdit && !playground ? (
                        <button
                          type="button"
                          disabled={!dirty || saving}
                          onClick={() => void saveFile()}
                          className="mt-2 w-full rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                        >
                          {saving ? "…" : dirty ? t("saveFile") : t("saved")}
                        </button>
                        ) : null}
                      </>
                      )
                    ) : null}
                  </div>
                </div>
              )}
            </aside>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function groupProjectFiles(paths: string[]) {
  const root: string[] = [];
  const folders = new Map<string, string[]>();
  for (const path of paths) {
    const slash = path.indexOf("/");
    if (slash === -1) {
      root.push(path);
      continue;
    }
    const folder = path.slice(0, slash);
    const list = folders.get(folder) ?? [];
    list.push(path);
    folders.set(folder, list);
  }
  return { root, folders };
}

function formatShortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
  return new Intl.DateTimeFormat("fr", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function formatUpdated(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.max(0, Math.round(diff / 3_600_000));
  if (hours < 1) return t("editedJustNow");
  if (hours < 24) return t("editedHours").replace("{n}", String(hours));
  return t("editedDays").replace("{n}", String(Math.max(1, Math.round(hours / 24))));
}

function Bubble({
  children,
  role,
  demo,
}: {
  children: ReactNode;
  role: "user" | "assistant";
  demo?: boolean;
}) {
  const isUser = role === "user";
  return (
    <article className={`flex gap-2 ${isUser ? "flex-row-reverse" : ""}`}>
      <span
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
          isUser ? "bg-brand-soft text-brand" : "bg-emerald-100 text-emerald-800"
        }`}
      >
        {isUser ? "Vous" : "IA"}
      </span>
      <div className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm ${isUser ? "bg-brand-soft" : "bg-slate-50"}`}>
        {demo ? <p className="mb-1 text-[10px] uppercase tracking-wide text-muted">{t("demoMode")}</p> : null}
        <div className="whitespace-pre-wrap">{children}</div>
      </div>
    </article>
  );
}
