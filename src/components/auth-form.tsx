"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { t } from "@/lib/i18n/messages";

export function AuthForm({
  mode,
  googleEnabled,
}: {
  mode: "login" | "signup";
  googleEnabled?: boolean;
}) {
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(search.get("error"));
  const [pending, setPending] = useState(false);

  async function onGoogle() {
    setPending(true);
    setError(null);
    const response = await fetch("/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ next: search.get("next") || "/dashboard" }),
    });
    const payload = (await response.json()) as { url?: string; error?: string };
    if (!response.ok || !payload.url) {
      setPending(false);
      setError(payload.error || "Connexion Google impossible.");
      return;
    }
    window.location.href = payload.url;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const response = await fetch(mode === "login" ? "/api/auth/login" : "/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, displayName }),
    });
    const payload = (await response.json()) as { error?: string; needsConfirmation?: boolean };
    setPending(false);
    if (payload.needsConfirmation) {
      setError(payload.error || "Confirmez votre e-mail, puis connectez-vous.");
      return;
    }
    if (!response.ok) {
      setError(payload.error || "Une erreur est survenue.");
      return;
    }
    router.push(search.get("next") || "/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto w-full max-w-md space-y-4 rounded-xl border bg-card p-6 shadow-sm">
      <h1 className="font-[family-name:var(--font-serif-actual)] text-3xl">
        {mode === "login" ? t("login") : t("signup")}
      </h1>
      {googleEnabled ? (
        <>
          <button
            type="button"
            disabled={pending}
            onClick={() => void onGoogle()}
            className="flex w-full items-center justify-center gap-2 rounded-md border bg-background px-4 py-2.5 text-sm disabled:opacity-60"
          >
            <GoogleMark />
            {t("continueWithGoogle")}
          </button>
          <p className="text-center text-xs uppercase tracking-wide text-muted">{t("orEmail")}</p>
        </>
      ) : null}
      {mode === "signup" ? (
        <label className="block space-y-1 text-sm">
          <span>{t("name")}</span>
          <input
            required
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2"
          />
        </label>
      ) : null}
      <label className="block space-y-1 text-sm">
        <span>{t("email")}</span>
        <input
          required
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-md border bg-background px-3 py-2"
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span>{t("password")}</span>
        <input
          required
          type="password"
          minLength={mode === "signup" ? 8 : 1}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-md border bg-background px-3 py-2"
        />
      </label>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-accent px-4 py-2.5 text-white disabled:opacity-60"
      >
        {pending ? "…" : mode === "login" ? t("login") : t("signup")}
      </button>
    </form>
  );
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35.2 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-1 2.9-3.1 5.2-5.9 6.6l6.3 5.3C37.8 41.3 44 36 44 24c0-1.3-.1-2.5-.4-3.5z"
      />
    </svg>
  );
}
