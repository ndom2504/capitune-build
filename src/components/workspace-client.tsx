"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { ProjectBundle } from "@/lib/domain";
import { t } from "@/lib/i18n/messages";

const frames = {
  desktop: "100%",
  tablet: "768px",
  mobile: "390px",
} as const;

type Device = keyof typeof frames;

export function WorkspaceClient({
  initial,
  demoMode,
}: {
  initial: ProjectBundle;
  demoMode: boolean;
}) {
  const router = useRouter();
  const [bundle, setBundle] = useState(initial);
  const [prompt, setPrompt] = useState("");
  const [lastPrompt, setLastPrompt] = useState("");
  const [device, setDevice] = useState<Device>("desktop");
  const [tab, setTab] = useState<"conversation" | "preview" | "files">("conversation");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [selectedFile, setSelectedFile] = useState<string | null>(
    initial.files.find((file) => file.path === "index.html")?.path ?? initial.files[0]?.path ?? null,
  );

  const previewSrc = `/api/preview/${bundle.project.id}/index.html?v=${previewKey}`;
  const selected = useMemo(
    () => bundle.files.find((file) => file.path === selectedFile) ?? null,
    [bundle.files, selectedFile],
  );

  async function refreshBundle() {
    const response = await fetch(`/api/projects/${bundle.project.id}`);
    if (response.ok) {
      setBundle(await response.json());
      setPreviewKey((value) => value + 1);
    }
  }

  async function generate(text: string) {
    const value = text.trim();
    if (!value) return;
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
  }

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

  const conversationPanel = (
    <section className="flex h-full min-h-0 flex-col border-r bg-card">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {bundle.messages.length === 0 ? (
          <p className="text-sm text-muted">Décrivez le site à générer pour commencer.</p>
        ) : (
          bundle.messages.map((message) => (
            <article
              key={message.id}
              className={`rounded-lg px-3 py-2 text-sm ${
                message.role === "user" ? "bg-accent-soft" : "border bg-background"
              }`}
            >
              <p className="text-xs uppercase tracking-wide text-muted">
                {message.role === "user" ? "Vous" : "Capitune"}
                {message.demoMode ? " · démo" : ""}
              </p>
              <p className="mt-1 whitespace-pre-wrap">{message.content}</p>
            </article>
          ))
        )}
      </div>
      {error ? (
        <div className="border-t px-4 py-3 text-sm text-danger">
          <p>{error}</p>
          {lastPrompt ? (
            <button type="button" className="mt-2 underline" onClick={() => generate(lastPrompt)}>
              {t("retry")}
            </button>
          ) : null}
        </div>
      ) : null}
      {pending ? <p className="px-4 text-sm text-muted">{t("generating")}</p> : null}
      <form
        className="border-t p-3"
        onSubmit={(event) => {
          event.preventDefault();
          void generate(prompt);
        }}
      >
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder={t("promptPlaceholder")}
          rows={3}
          className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="mt-2 w-full rounded-md bg-accent px-3 py-2 text-sm text-white disabled:opacity-60"
        >
          {t("send")}
        </button>
      </form>
    </section>
  );

  const previewPanel = (
    <section className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2 text-sm">
        {(Object.keys(frames) as Device[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setDevice(item)}
            className={`rounded-md px-2 py-1 ${device === item ? "bg-accent text-white" : "border"}`}
          >
            {t(item)}
          </button>
        ))}
        {pending ? <span className="ml-auto text-muted">{t("generating")}</span> : null}
      </div>
      <div className="flex flex-1 justify-center overflow-auto p-3">
        {bundle.files.some((file) => file.path === "index.html") ? (
          <iframe
            title="Aperçu du projet"
            src={previewSrc}
            sandbox="allow-scripts"
            referrerPolicy="no-referrer"
            className="h-full min-h-[480px] rounded-md border bg-white"
            style={{ width: frames[device], maxWidth: "100%" }}
          />
        ) : (
          <p className="self-center text-sm text-muted">Aucun aperçu. Générez d’abord un projet.</p>
        )}
      </div>
    </section>
  );

  const filesPanel = (
    <aside className="flex h-full min-h-0 flex-col border-l bg-card">
      <div className="border-b p-3">
        <p className="text-sm font-medium">{t("versions")}</p>
        <ul className="mt-2 max-h-32 space-y-1 overflow-auto text-sm">
          {bundle.versions.length === 0 ? (
            <li className="text-muted">Aucune version.</li>
          ) : (
            bundle.versions.map((version) => (
              <li key={version.id} className="flex items-center justify-between gap-2">
                <span className="truncate">{version.label}</span>
                <button type="button" className="text-accent" onClick={() => restore(version.id)}>
                  {t("restore")}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
      <div className="flex-1 overflow-auto p-3">
        <p className="text-sm font-medium">{t("files")}</p>
        <ul className="mt-2 space-y-1 text-sm">
          {bundle.files.map((file) => (
            <li key={file.id}>
              <button
                type="button"
                className={file.path === selectedFile ? "text-accent" : ""}
                onClick={() => setSelectedFile(file.path)}
              >
                {file.path}
              </button>
            </li>
          ))}
        </ul>
        {selected ? (
          <pre className="mt-3 max-h-64 overflow-auto rounded-md border bg-background p-2 text-xs">
            {selected.content.slice(0, 4000)}
          </pre>
        ) : null}
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b bg-card px-4 py-3">
        <button type="button" className="text-sm" onClick={() => router.push("/dashboard")}>
          ← {t("dashboard")}
        </button>
        <form onSubmit={rename} className="flex min-w-0 flex-1 items-center gap-2">
          <input
            name="name"
            defaultValue={bundle.project.name}
            className="min-w-0 flex-1 rounded-md border bg-background px-2 py-1 text-sm"
          />
          <button type="submit" className="rounded-md border px-2 py-1 text-sm">
            {t("rename")}
          </button>
        </form>
        <a href={`/api/projects/${bundle.project.id}/export`} className="rounded-md border px-3 py-1 text-sm">
          {t("export")}
        </a>
        {demoMode ? (
          <span className="rounded-full bg-accent-soft px-3 py-1 text-xs">{t("demoMode")}</span>
        ) : null}
      </header>
      {demoMode ? <p className="border-b bg-accent-soft px-4 py-2 text-xs sm:text-sm">{t("demoModeHint")}</p> : null}

      <div className="flex gap-2 border-b px-3 py-2 lg:hidden">
        {(["conversation", "preview", "files"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`rounded-md px-3 py-1 text-sm ${tab === item ? "bg-accent text-white" : "border"}`}
          >
            {t(item === "files" ? "files" : item)}
          </button>
        ))}
      </div>

      <div className="hidden min-h-0 flex-1 lg:grid lg:grid-cols-[320px_minmax(0,1fr)_280px]">
        {conversationPanel}
        {previewPanel}
        {filesPanel}
      </div>
      <div className="min-h-0 flex-1 lg:hidden">
        {tab === "conversation" ? conversationPanel : null}
        {tab === "preview" ? previewPanel : null}
        {tab === "files" ? filesPanel : null}
      </div>
    </div>
  );
}
