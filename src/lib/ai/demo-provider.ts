import type { AIProvider, GenerateProjectInput } from "@/lib/ai/provider";
import { validateGenerationResult, type GenerationResult } from "@/lib/ai/schema";

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
  --ink: #1c1917;
  --muted: #57534e;
  --paper: #f5f1ea;
  --card: #fffdf8;
  --line: #e7e0d6;
  --accent: #1f4e46;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: Georgia, "Times New Roman", serif;
  background: var(--paper);
  color: var(--ink);
}
.nav { display: flex; gap: 1rem; max-width: 880px; margin: 0 auto; padding: 1rem 1.5rem; }
.nav a { color: var(--accent); text-decoration: none; }
.hero, main, footer { max-width: 880px; margin: 0 auto; padding: 2.5rem 1.5rem; }
.eyebrow { letter-spacing: 0.16em; text-transform: uppercase; font-size: 0.72rem; color: var(--accent); }
h1 { font-size: clamp(2rem, 5vw, 3.4rem); line-height: 1.1; margin: 0.4rem 0 1rem; }
.lead, p { color: var(--muted); line-height: 1.6; }
.grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); margin-top: 1.5rem; }
article { background: var(--card); border: 1px solid var(--line); padding: 1.2rem; }
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
