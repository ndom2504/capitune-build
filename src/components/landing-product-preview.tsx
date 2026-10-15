import type { ReactNode } from "react";

export function LandingProductPreview() {
  return (
    <div
      id="demo"
      className="relative mx-auto w-full max-w-[640px] lg:mx-0 lg:max-w-none"
      aria-hidden="true"
    >
      <div className="absolute -inset-6 rounded-[2.2rem] bg-gradient-to-br from-indigo-200/50 via-white to-sky-100/80 blur-2xl" />
      <div className="relative overflow-hidden rounded-[1.6rem] border border-white/80 bg-white/90 p-2.5 shadow-[0_30px_80px_-24px_rgba(15,23,42,0.35)]">
        <div className="flex min-h-[420px] overflow-hidden rounded-[1.25rem] border bg-[#f8fafc] sm:min-h-[470px]">
          <aside className="hidden w-12 flex-col items-center gap-4 bg-[#111827] py-4 text-white/70 sm:flex">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10 text-[10px] font-bold text-white">
              C
            </span>
            <NavDot />
            <NavDot active />
            <NavDot />
            <NavDot />
          </aside>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center justify-between border-b bg-white px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold tracking-[0.16em] text-foreground">CAPITUNE</span>
                <span className="hidden text-xs text-muted sm:inline">Mon projet</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-md border bg-slate-50" />
                <span className="h-6 w-6 rounded-md border bg-slate-50" />
                <span className="rounded-md bg-accent px-2.5 py-1 text-[10px] font-semibold text-white">Publier</span>
              </div>
            </div>
            <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[0.9fr_1.35fr]">
              <section className="flex min-h-[220px] flex-col border-b bg-white p-3 md:border-b-0 md:border-r">
                <div className="space-y-3 text-[11px] leading-relaxed">
                  <Bubble align="right">
                    Crée un site web pour une entreprise de construction avec une page d’accueil, des services, une galerie de projets et un formulaire de contact.
                  </Bubble>
                  <Bubble>
                    Je génère votre site web avec un design professionnel et moderne. Voici un aperçu de votre projet :
                    <ul className="mt-1.5 space-y-0.5 text-emerald-600">
                      <li>✓ Page d’accueil</li>
                      <li>✓ Services</li>
                      <li>✓ Galerie de projets</li>
                      <li>✓ Formulaire de contact</li>
                    </ul>
                  </Bubble>
                </div>
                <div className="mt-auto pt-3">
                  <div className="flex items-center gap-2 rounded-xl border bg-slate-50 px-3 py-2 text-[11px] text-muted">
                    <span className="flex-1">Décrivez vos modifications…</span>
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent text-white">→</span>
                  </div>
                </div>
              </section>
              <section className="bg-slate-100 p-2">
                <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
                  <div className="flex items-center gap-1.5 border-b bg-slate-50 px-2 py-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span className="ml-2 rounded bg-white px-2 py-0.5 text-[9px] text-muted">
                      https://monprojet.capitune.app
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 text-[10px]">
                    <span className="font-extrabold tracking-wide">CONSTRUCT</span>
                    <span className="hidden gap-3 text-muted sm:flex">
                      <span>Accueil</span>
                      <span>Services</span>
                      <span>Projets</span>
                      <span>Contact</span>
                    </span>
                    <span className="rounded-full bg-amber-400 px-2 py-0.5 font-semibold text-slate-900">
                      Demander un devis
                    </span>
                  </div>
                  <div className="relative h-36 overflow-hidden bg-slate-800 sm:h-44">
                    <div className="absolute inset-0 bg-[linear-gradient(135deg,#1e293b_0%,#334155_40%,#0f172a_100%)]" />
                    <div className="absolute inset-0 opacity-40">
                      <div className="absolute right-4 top-6 h-24 w-40 rounded-sm bg-slate-300/30" />
                      <div className="absolute bottom-0 right-10 h-28 w-24 bg-white/10" />
                      <div className="absolute bottom-0 right-28 h-20 w-16 bg-white/20" />
                    </div>
                    <div className="relative z-10 max-w-[70%] px-4 py-6 text-white">
                      <p className="text-[9px] uppercase tracking-[0.18em] text-white/70">
                        Construction · Rénovation · Aménagement
                      </p>
                      <p className="mt-1 text-lg font-bold leading-tight sm:text-xl">
                        Bâtir aujourd’hui les espaces de demain
                      </p>
                      <p className="mt-1 text-[10px] text-white/75">
                        Des solutions durables et sur mesure pour vos projets de construction et de rénovation.
                      </p>
                      <span className="mt-3 inline-flex rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-semibold text-slate-900">
                        Nos services
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 px-3 py-3 text-center">
                    <PreviewStat icon="⌂" title="Qualité" />
                    <PreviewStat icon="☺" title="Expertise" />
                    <PreviewStat icon="▣" title="Respect des délais" />
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NavDot({ active = false }: { active?: boolean }) {
  return <span className={`h-2 w-2 rounded-full ${active ? "bg-white" : "bg-white/25"}`} />;
}

function Bubble({
  children,
  align = "left",
}: {
  children: ReactNode;
  align?: "left" | "right";
}) {
  return (
    <div className={`flex gap-2 ${align === "right" ? "flex-row-reverse text-right" : ""}`}>
      <span
        className={`mt-0.5 h-5 w-5 shrink-0 rounded-full ${align === "right" ? "bg-indigo-100 text-[9px]" : "bg-emerald-100 text-[9px]"} flex items-center justify-center font-bold`}
      >
        {align === "right" ? "Vous" : "IA"}
      </span>
      <div className="rounded-2xl bg-slate-50 px-3 py-2 text-left text-slate-600">{children}</div>
    </div>
  );
}

function PreviewStat({ title, icon }: { title: string; icon: string }) {
  return (
    <div>
      <p className="text-sm">{icon}</p>
      <p className="text-[10px] font-semibold">{title}</p>
      <p className="text-[9px] text-muted">Des standards élevés</p>
    </div>
  );
}
