"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Project } from "@/lib/domain";
import { t } from "@/lib/i18n/messages";

export function DashboardClient({ initialProjects }: { initialProjects: Project[] }) {
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const empty = useMemo(() => projects.length === 0, [projects.length]);

  async function createProject(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Création impossible.");
      return;
    }
    setName("");
    setDescription("");
    router.push(`/workspace/${payload.project.id}`);
  }

  async function remove(id: string) {
    if (!confirm("Supprimer ce projet et ses versions ?")) return;
    const response = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (response.ok) {
      setProjects((current) => current.filter((project) => project.id !== id));
    }
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

  return (
    <div className="space-y-8">
      <form onSubmit={createProject} className="rounded-xl border bg-card p-5">
        <h2 className="text-lg font-medium">{t("newProject")}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <input
            required
            placeholder={t("projectName")}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-md border bg-background px-3 py-2"
          />
          <input
            placeholder={t("projectDescription")}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="rounded-md border bg-background px-3 py-2"
          />
        </div>
        {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
        <button type="submit" className="mt-4 rounded-md bg-accent px-4 py-2 text-white">
          {t("newProject")}
        </button>
      </form>

      {empty ? (
        <p className="rounded-xl border border-dashed bg-card p-8 text-muted">{t("emptyProjects")}</p>
      ) : (
        <ul className="grid gap-4">
          {projects.map((project) => (
            <li key={project.id} className="flex flex-col gap-3 rounded-xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg">{project.name}</h3>
                <p className="text-sm text-muted">{project.description || "—"}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <a href={`/workspace/${project.id}`} className="rounded-md bg-accent px-3 py-2 text-white">
                  {t("open")}
                </a>
                {renaming === project.id ? (
                  <>
                    <input
                      value={renameValue}
                      onChange={(event) => setRenameValue(event.target.value)}
                      className="rounded-md border px-2 py-1"
                    />
                    <button type="button" onClick={() => rename(project.id)} className="rounded-md border px-3 py-2">
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
                    className="rounded-md border px-3 py-2"
                  >
                    {t("rename")}
                  </button>
                )}
                <a href={`/api/projects/${project.id}/export`} className="rounded-md border px-3 py-2">
                  {t("export")}
                </a>
                <button type="button" onClick={() => remove(project.id)} className="rounded-md border px-3 py-2 text-danger">
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
