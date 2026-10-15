# Aperçu et isolation

## Approche du jalon 1

Les projets générés sont des fichiers HTML/CSS (éventuellement JS) stockés comme données utilisateur, séparées du code de Capitune.

L’aperçu authentifié est servi par `/api/preview/[projectId]/...` après vérification du propriétaire. L’iframe du workspace utilise `sandbox="allow-scripts"` **sans** `allow-same-origin`.

Un site **publié** est servi par `/s/[jeton]/index.html` sans session : uniquement les fichiers du projet, jamais la conversation. `/s/[jeton]` redirige vers `index.html` pour que les CSS/JS relatifs se résolvent. Le jeton est imprévisible ; le retirer invalide le lien. La même CSP s’applique.

Cela donne à la page générée une origine opaque : elle ne peut pas lire le DOM parent ni, en principe, les cookies de l’application Capitune.

## Ce qui n’est pas une barrière complète

- Une iframe seule n’est pas une frontière de sécurité suffisante.
- Le contenu est encore servi depuis la même origine applicative (`/api/preview/...`).
- `script-src 'unsafe-inline'` autorise le JS inline dans l’aperçu, limité au bac à sable.
- Un onglet ouvert directement sur `/api/preview/...` reste authentifié.
- Un lien `/s/[jeton]/` est public : quiconque a l’URL voit les fichiers générés.

## En-têtes

L’aperçu envoie une CSP restrictive (`default-src 'none'`, `connect-src 'none'`, `form-action 'none'`, `frame-ancestors 'self'`), `X-Content-Type-Options: nosniff`, et `Cache-Control: no-store`.

## Hors périmètre volontaire

- Aucune exécution de commandes shell générées par le modèle.
- Aucun accès base de données pour le modèle.
- Les applications React complètes nécessiteront un **service d’exécution isolé** (autre origine, réseau restreint, pas de secrets Capitune). L’interface actuelle (`AIProvider` + fichiers versionnés + module d’aperçu) est le point d’extension.

## Intégration future recommandée

Un worker ou une sandbox (par exemple un origin `preview.capitune.example` ou un runtime WebContainer-like auto-hébergé) qui :

1. Reçoit un snapshot de fichiers validés.
2. Les sert depuis une origine distincte.
3. N’a pas les cookies de session Capitune.
4. N’a pas la clé IA ni le rôle de service Supabase.
