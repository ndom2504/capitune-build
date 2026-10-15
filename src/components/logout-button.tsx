"use client";

import { useRouter } from "next/navigation";
import { t } from "@/lib/i18n/messages";

export function LogoutButton() {
  const router = useRouter();
  async function onClick() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }
  return (
    <button type="button" onClick={onClick} className="rounded-md px-3 py-2 text-sm hover:bg-card">
      {t("logout")}
    </button>
  );
}
