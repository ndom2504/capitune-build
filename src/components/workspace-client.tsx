"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AppRail } from "@/components/app-rail";
import type { ProjectBundle } from "@/lib/domain";
import { t } from "@/lib/i18n/messages";
import { publicSitePath } from "@/lib/publish/url";

const frames = {
  desktop: "100%",
  tablet: "768px",
  mobile: "390px",
} as const;

type Device = keyof typeof frames;
type Drawer = "none" | "files" | "publish";

const EXAMPLE_KEYS = ["examplePrompt1", "examplePrompt2", "examplePrompt3"] as const;

export function WorkspaceClient({
  initial,
  demoMode,
  autoStart = false,
}: {
  initial: ProjectBundle;
  demoMode: boolean;
  autoStart?: boolean;
}) {
  const router = useRouter();
  const [bundle, setBundle] = useState(initial);
  const [prompt, setPrompt] = useState("");
  const [lastPrompt, setLastPrompt] = useState("");
  const [device, setDevice] = useState<Device>("desktop");
  const [tab, setTab] = useState<"conversation" | "preview">("conversation");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [drawer, setDrawer] = useState<Drawer>("none");
  const [copied, setCopied] = useState(false);
  const [publishBusy, setPublishBusy] = useState(false);
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
  const threadRef = useRef<HTMLDivElement>(null);
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
  const previewSrc = `/api/preview/${bundle.project.id}/${previewPage}?v=${previewKey}`;
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
    if (!value || pending) return;
    setPending(true);
    setError(null);
    setLastPrompt(value);
    const response = await fetch(`/api/projects/${bundle.project.id}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: value }),
    });
    const payload = await response.json();
    setPending(false);
    if (!response.ok) {
      setError(payload.error || "La génération a échoué.");
      return;
    }
    setPrompt("");
    await refreshBundle();
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

  async function publish(rotate = false) {
    setPublishBusy(true);
    setError(null);
    const response = await fetch(`/api/projects/${bundle.project.id}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rotate }),
    });
    const payload = await response.json();
    setPublishBusy(false);
    if (!response.ok) {
      setError(payload.error || "Publication impossible.");
      return;
    }
    setBundle((current) => ({ ...current, project: payload.project }));
  }

  async function unpublish() {
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
    if (path.endsWith(".html")) {
      setPreviewPage(path);
      setTab("preview");
    }
  }

  async function copyPublicLink() {
    if (!publicPath) return;
    await navigator.clipboard.writeText(`${window.location.origin}${publicPath}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  const conversationPanel = (
    <section className="flex h-full min-h-0 flex-col border-r bg-white">
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
            <Bubble role="assistant">
              <span className="text-muted">{t("generatingHint")}</span>
            </Bubble>
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
            disabled={pending}
            className="min-h-[44px] flex-1 resize-none bg-transparent py-1.5 text-sm outline-none disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={pending || !prompt.trim()}
            className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-white disabled:opacity-40"
            aria-label={t("send")}
          >
            →
          </button>
        </div>
        <p className="mt-2 text-xs text-muted">{pending ? t("generating") : t("sendHint")}</p>
      </form>
    </section>
  );

  const previewPanel = (
    <section className="flex h-full min-h-0 flex-col bg-slate-100">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
        {(Object.keys(frames) as Device[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setDevice(item)}
            className={`rounded-full px-3 py-1 ${device === item ? "bg-accent text-white" : "border bg-white"}`}
          >
            {t(item)}
          </button>
        ))}
        {pending ? <span className="ml-auto text-muted">{t("generating")}</span> : null}
      </div>
      <div className="relative min-h-0 flex-1 p-3">
        <div className="flex h-full flex-col overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="flex items-center gap-1.5 border-b bg-slate-50 px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-red-400" />
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="ml-2 truncate rounded-md bg-white px-2 py-0.5 text-[11px] text-muted">
              {t("preview")} · {previewPage}
            </span>
            {htmlPages.length > 1 ? (
              <div className="ml-auto flex min-w-0 gap-1 overflow-x-auto">
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
                src={previewSrc}
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
    <div className="flex h-screen overflow-hidden">
      <AppRail />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-3 border-b bg-white px-4 py-2.5">
          <button type="button" className="text-sm text-muted" onClick={() => router.push("/dashboard")}>
            ← {t("projects")}
          </button>
          <form onSubmit={rename} className="flex min-w-0 flex-1 items-center gap-2">
            <input
              name="name"
              defaultValue={bundle.project.name}
              className="min-w-0 flex-1 rounded-xl border-0 bg-transparent px-1 py-1 text-sm font-semibold outline-none focus:bg-slate-50"
            />
            <button type="submit" className="rounded-full border px-3 py-1 text-xs font-medium">
              {t("rename")}
            </button>
          </form>
          <button
            type="button"
            onClick={() => setDrawer(drawer === "files" ? "none" : "files")}
            className="rounded-full border px-3 py-1.5 text-sm"
          >
            {t("files")}
          </button>
          <button
            type="button"
            onClick={() => setDrawer(drawer === "publish" ? "none" : "publish")}
            className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-white"
          >
            {publicPath ? t("publishLive") : t("publish")}
          </button>
          {demoMode ? (
            <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand">{t("demoMode")}</span>
          ) : null}
        </header>
        {demoMode ? <p className="border-b bg-brand-soft px-4 py-2 text-xs sm:text-sm">{t("demoModeHint")}</p> : null}

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
          <div className="hidden h-full lg:grid lg:grid-cols-[minmax(280px,380px)_minmax(0,1fr)]">
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
                  <p className="text-muted">{t("publishHint")}</p>
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
                  ) : (
                    <button
                      type="button"
                      disabled={publishBusy || !hasPreview}
                      onClick={() => void publish(false)}
                      className="flex w-full justify-center rounded-full bg-accent px-4 py-2.5 font-semibold text-white disabled:opacity-60"
                    >
                      {t("putOnline")}
                    </button>
                  )}
                  {hasPreview ? (
                    <a
                      href={previewSrc}
                      target="_blank"
                      rel="noreferrer"
                      className="flex justify-center rounded-full border px-4 py-2.5 font-medium"
                    >
                      {t("openPreview")}
                    </a>
                  ) : null}
                  <a
                    href={`/api/projects/${bundle.project.id}/export`}
                    className="flex justify-center rounded-full border px-4 py-2.5 font-medium"
                  >
                    {t("export")}
                  </a>
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
                            <button type="button" className="text-brand" onClick={() => restore(version.id)}>
                              {t("restore")}
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                  <div className="flex-1 overflow-auto p-4">
                    <p className="text-sm font-medium">{t("files")}</p>
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
                      <>
                        <textarea
                          value={draft}
                          onChange={(event) => setDraft(event.target.value)}
                          className="mt-3 h-56 w-full resize-y rounded-2xl border bg-slate-50 p-3 font-mono text-xs"
                          spellCheck={false}
                        />
                        <button
                          type="button"
                          disabled={!dirty || saving}
                          onClick={() => void saveFile()}
                          className="mt-2 w-full rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                        >
                          {saving ? "…" : dirty ? t("saveFile") : t("saved")}
                        </button>
                      </>
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
