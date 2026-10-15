import { previewSecurityHeaders } from "@/lib/preview/headers";

export function publishedNotFoundResponse(status = 404): Response {
  const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Site introuvable — Capitune</title>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: "Segoe UI", sans-serif; background: #f5f7ff; color: #0b1220; }
    main { max-width: 28rem; padding: 2rem; text-align: center; }
    p.brand { letter-spacing: 0.18em; font-weight: 800; font-size: 0.75rem; }
    h1 { font-size: 1.6rem; margin: 0.75rem 0 0.5rem; }
    p.lead { color: #5b6578; line-height: 1.5; }
    a { color: #4f46e5; }
  </style>
</head>
<body>
  <main>
    <p class="brand">CAPITUNE</p>
    <h1>Ce site n’est plus en ligne</h1>
    <p class="lead">Le lien est invalide, ou le propriétaire l’a retiré. Si vous avez créé ce projet, republiez-le depuis l’atelier.</p>
    <p><a href="/">Retour à Capitune</a></p>
  </main>
</body>
</html>`;
  return new Response(html, {
    status: 404,
    headers: { ...previewSecurityHeaders(), "Content-Type": "text/html; charset=utf-8" },
  });
}
