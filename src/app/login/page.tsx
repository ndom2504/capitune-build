import { Suspense } from "react";
import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { Brand } from "@/components/brand";
import { t } from "@/lib/i18n/messages";
import { isSupabaseEnabled } from "@/lib/supabase/config";

export default function LoginPage() {
  return (
    <div className="min-h-screen px-6 py-8">
      <Brand />
      <div className="mt-16">
        <Suspense>
          <AuthForm mode="login" googleEnabled={isSupabaseEnabled()} />
        </Suspense>
        <p className="mx-auto mt-4 max-w-md text-center text-sm text-muted">
          Pas encore de compte ?{" "}
          <Link href="/signup" className="text-accent underline">
            {t("signup")}
          </Link>
        </p>
      </div>
    </div>
  );
}
