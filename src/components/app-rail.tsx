"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { t } from "@/lib/i18n/messages";

export function AppRail() {
  const pathname = usePathname();
  const router = useRouter();
  const onDashboard = pathname === "/dashboard";
  const onWorkspace = pathname.startsWith("/workspace");

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <aside className="flex w-14 shrink-0 flex-col items-center gap-4 bg-accent py-4 text-white">
      <Link
        href="/dashboard"
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-xs font-bold"
        aria-label="Capitune"
      >
        C
      </Link>
      <Link
        href="/dashboard"
        title={t("dashboard")}
        className={`flex h-9 w-9 items-center justify-center rounded-xl ${
          onDashboard ? "bg-white text-accent" : "text-white/70 hover:bg-white/10 hover:text-white"
        }`}
      >
        <HomeIcon />
      </Link>
      <span
        title={t("conversation")}
        className={`flex h-9 w-9 items-center justify-center rounded-xl ${
          onWorkspace ? "bg-white text-accent" : "text-white/40"
        }`}
      >
        <ChatIcon />
      </span>
      <button
        type="button"
        onClick={() => void logout()}
        title={t("logout")}
        className="mt-auto flex h-9 w-9 items-center justify-center rounded-xl text-white/70 hover:bg-white/10 hover:text-white"
      >
        <LogoutIcon />
      </button>
    </aside>
  );
}

function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 11.5 12 5l8 6.5V20H4z" strokeLinejoin="round" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M5 6.5h14v9H9l-4 3z" strokeLinejoin="round" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M10 6H6v12h4M10 12h8M15 9l3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
