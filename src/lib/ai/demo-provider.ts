import type { AIProvider, GenerateProjectInput } from "@/lib/ai/provider";
import { validateGenerationResult, type GenerationResult } from "@/lib/ai/schema";
import { PIXEL_PNG_BASE64 } from "@/lib/media/files";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function sampleSite(input: GenerateProjectInput): GenerationResult {
  const title = escapeHtml(input.projectName || "Projet Capitune");
  const instruction = escapeHtml(input.prompt);
  const nav = `<nav class="nav"><a href="index.html">Accueil</a><a href="contact.html">Contact</a></nav>`;
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  ${nav}
  <header class="hero">
    <p class="eyebrow">Projet généré par Capitune</p>
    <p><img src="images/mark.png" width="48" height="48" alt="" /></p>
    <h1>${title}</h1>
    <p class="lead">${escapeHtml(input.projectDescription || "Site d’exemple déterministe.")}</p>
  </header>
  <main>
    <section>
      <h2>Instruction</h2>
      <p>${instruction}</p>
    </section>
    <section class="grid">
      <article>
        <h3>Aperçu sûr</h3>
        <p>Cette vitrine est du HTML et du CSS statiques. Aucun code généré n’est exécuté sur le serveur Capitune.</p>
      </article>
      <article>
        <h3>Versions</h3>
        <p>Chaque génération réussie crée une version récupérable dans l’espace de travail.</p>
      </article>
    </section>
  </main>
  <footer>
    <p>Mode démonstration — sortie déterministe, pas une requête modèle réelle.</p>
  </footer>
</body>
</html>
`;

  const contact = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Contact — ${title}</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  ${nav}
  <header class="hero">
    <p class="eyebrow">Contact</p>
    <h1>Écrivons-nous</h1>
    <p class="lead">Page d’exemple pour parcourir le site dans l’aperçu Capitune.</p>
  </header>
  <main>
    <section>
      <h2>Coordonnées</h2>
      <p>contact@${escapeHtml((input.projectName || "projet").toLowerCase().replaceAll(" ", ""))}.example</p>
    </section>
  </main>
</body>
</html>
`;

  const css = `:root {
  --ink: #0b1220;
  --muted: #5b6578;
  --paper: #f5f7ff;
  --card: #ffffff;
  --line: #e4e9f4;
  --accent: #4f46e5;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: "Segoe UI", system-ui, sans-serif;
  background: radial-gradient(900px 400px at 10% -10%, #e0e7ff, transparent 55%), var(--paper);
  color: var(--ink);
}
.nav { display: flex; gap: 1.25rem; max-width: 880px; margin: 0 auto; padding: 1.25rem 1.5rem; }
.nav a { color: var(--ink); text-decoration: none; font-weight: 600; font-size: 0.9rem; }
.hero, main, footer { max-width: 880px; margin: 0 auto; padding: 2.5rem 1.5rem; }
.eyebrow { letter-spacing: 0.14em; text-transform: uppercase; font-size: 0.72rem; color: var(--accent); font-weight: 700; }
h1 { font-size: clamp(2rem, 5vw, 3.2rem); line-height: 1.08; margin: 0.4rem 0 1rem; letter-spacing: -0.03em; }
.lead, p { color: var(--muted); line-height: 1.65; }
.grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); margin-top: 1.5rem; }
article { background: var(--card); border: 1px solid var(--line); border-radius: 1.25rem; padding: 1.25rem; }
footer { font-size: 0.85rem; border-top: 1px solid var(--line); }
`;

  const readme = `# ${input.projectName}

Ce dossier contient le code généré par Capitune, distinct du code source de la plateforme Capitune.

## Instruction
${input.prompt}

## Exécution
Ouvrez \`index.html\` dans un navigateur. Aucun serveur n’est requis pour cette vitrine HTML/CSS.

Mode démonstration: sortie déterministe sans appel à un modèle IA.
`;

  return validateGenerationResult({
    summary: `Projet d’exemple généré pour « ${input.projectName} ». Mode démonstration.`,
    files: [
      { path: "index.html", content: html },
      { path: "contact.html", content: contact },
      { path: "styles.css", content: css },
      { path: "README.md", content: readme },
      { path: "images/mark.png", content: PIXEL_PNG_BASE64 },
    ],
  });
}

export const demoProvider: AIProvider = {
  id: "demo",
  demoMode: true,
  async generate(input) {
    return sampleSite(input);
  },
};
