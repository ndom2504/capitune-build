"use client";

import { useState } from "react";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { LogoutButton } from "@/components/logout-button";
import { t } from "@/lib/i18n/messages";

const NAV = [
  { href: "#fonctionnalites", labelKey: "navFeatures" as const },
  { href: "#tarifs", labelKey: "navPricing" as const },
  { href: "#ressources", labelKey: "navResources" as const },
  { href: "#a-propos", labelKey: "navAbout" as const },
];

export function LandingHeader({
  signedIn,
}: {
  signedIn: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-transparent bg-white/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 lg:px-6">
        <Brand href={signedIn ? "/dashboard" : "/"} />
        <nav className="hidden items-center gap-7 text-sm font-medium text-muted lg:flex">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="transition hover:text-foreground">
              {t(item.labelKey)}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-3 lg:flex">
          {signedIn ? (
            <>
              <Link href="/dashboard" className="text-sm font-medium text-muted hover:text-foreground">
                {t("dashboard")}
              </Link>
              <LogoutButton />
            </>
          ) : (
            <Link href="/login" className="text-sm font-medium text-muted hover:text-foreground">
              {t("login")}
            </Link>
          )}
          <Link
            href={signedIn ? "/dashboard" : "/signup"}
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm"
          >
            {t("startFree")}
          </Link>
        </div>
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border bg-white lg:hidden"
          aria-expanded={open}
          aria-label="Menu"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="sr-only">Menu</span>
          <span className="flex flex-col gap-1.5">
            <span className="block h-0.5 w-4 bg-foreground" />
            <span className="block h-0.5 w-4 bg-foreground" />
            <span className="block h-0.5 w-4 bg-foreground" />
          </span>
        </button>
      </div>
      {open ? (
        <div className="border-t bg-white px-5 py-4 lg:hidden">
          <nav className="grid gap-3 text-sm font-medium">
            {NAV.map((item) => (
              <a key={item.href} href={item.href} onClick={() => setOpen(false)}>
                {t(item.labelKey)}
              </a>
            ))}
            {signedIn ? (
              <Link href="/dashboard" onClick={() => setOpen(false)}>
                {t("dashboard")}
              </Link>
            ) : (
              <Link href="/login" onClick={() => setOpen(false)}>
                {t("login")}
              </Link>
            )}
            <Link
              href={signedIn ? "/dashboard" : "/signup"}
              className="mt-1 inline-flex justify-center rounded-full bg-accent px-4 py-2.5 font-semibold text-white"
              onClick={() => setOpen(false)}
            >
              {t("startFree")}
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
