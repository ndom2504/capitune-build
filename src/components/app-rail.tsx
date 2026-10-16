"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { t } from "@/lib/i18n/messages";

export function AppRail({
  variant = "compact",
}: {
  variant?: "compact" | "dashboard";
}) {
  const pathname = usePathname();
  const router = useRouter();
  const onDashboard = pathname === "/dashboard";
  const onWorkspace = pathname.startsWith("/workspace");
  const expanded = variant === "dashboard";

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <aside
      className={`flex shrink-0 flex-col bg-[#0f172a] text-white ${
        expanded ? "w-14 lg:w-64" : "w-14"
      }`}
    >
      <div className={`flex items-center gap-2 px-3 py-5 ${expanded ? "lg:px-5" : "justify-center"}`}>
        <Link
          href="/dashboard"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-xs font-bold"
          aria-label="Capitune"
        >
          C
        </Link>
        {expanded ? (
          <span className="hidden text-sm font-extrabold tracking-[0.16em] lg:inline">CAPITUNE</span>
        ) : null}
      </div>
      <nav className={`flex flex-1 flex-col gap-1 px-2 ${expanded ? "lg:px-3" : "items-center"}`}>
        <RailLink href="/dashboard" active={onDashboard} expanded={expanded} icon={<HomeIcon />} label={t("dashboard")} />
        {expanded ? (
          <>
            <RailLink href="/dashboard#projets" expanded icon={<ProjectsIcon />} label={t("myProjects")} />
            <RailLink href="/dashboard#nouveau" expanded icon={<SparkIcon />} label={t("navCreate")} />
            <RailLink href="/dashboard#exemples" expanded icon={<GridIcon />} label={t("navExamples")} />
          </>
        ) : (
          <span
            title={t("conversation")}
            className={`flex h-9 w-9 items-center justify-center rounded-xl ${
              onWorkspace ? "bg-white text-accent" : "text-white/40"
            }`}
          >
            <ChatIcon />
          </span>
        )}
      </nav>
      <div className={`px-2 pb-4 ${expanded ? "lg:px-3" : ""}`}>
        {expanded ? (
          <div className="mb-3 hidden rounded-2xl bg-white/10 p-3 lg:block">
            <p className="text-xs font-semibold">{t("upgradeSpeed")}</p>
            <p className="mt-1 text-[11px] text-white/60">{t("upgradeLead")}</p>
            <a
              href="/#tarifs"
              className="mt-2 inline-flex rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-900"
            >
              {t("viewPlans")}
            </a>
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => void logout()}
          title={t("logout")}
          className={`flex h-9 items-center gap-2 rounded-xl text-white/70 hover:bg-white/10 hover:text-white ${
            expanded ? "w-full px-2 lg:px-3" : "w-9 justify-center"
          }`}
        >
          <LogoutIcon />
          {expanded ? <span className="hidden text-sm lg:inline">{t("logout")}</span> : null}
        </button>
      </div>
    </aside>
  );
}

function RailLink({
  href,
  label,
  icon,
  active,
  expanded,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
  expanded: boolean;
}) {
  return (
    <Link
      href={href}
      title={label}
      className={`flex h-9 items-center gap-3 rounded-xl ${
        expanded ? "justify-center px-2 lg:justify-start lg:px-3" : "w-9 justify-center"
      } ${active ? "bg-white text-slate-900" : "text-white/70 hover:bg-white/10 hover:text-white"}`}
    >
      {icon}
      {expanded ? <span className="hidden text-sm font-medium lg:inline">{label}</span> : null}
    </Link>
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

function ProjectsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M4 10h16" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 3v4M12 17v4M4 12h4M16 12h4M7 7l2.5 2.5M14.5 14.5 17 17M17 7l-2.5 2.5M9.5 14.5 7 17" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="4" y="4" width="7" height="7" rx="1" />
      <rect x="13" y="4" width="7" height="7" rx="1" />
      <rect x="4" y="13" width="7" height="7" rx="1" />
      <rect x="13" y="13" width="7" height="7" rx="1" />
    </svg>
  );
}
