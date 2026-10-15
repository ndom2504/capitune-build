# Aperçu et isolation

## Approche du jalon 1

Les projets générés sont des fichiers HTML/CSS (éventuellement JS) stockés comme données utilisateur, séparées du code de Capitune.

L’aperçu est servi par `/api/preview/[projectId]/...` après vérification du propriétaire. L’iframe du workspace utilise `sandbox="allow-scripts"` **sans** `allow-same-origin`.

Cela donne à la page générée une origine opaque : elle ne peut pas lire le DOM parent ni, en principe, les cookies de l’application Capitune.

## Ce qui n’est pas une barrière complète

- Une iframe seule n’est pas une frontière de sécurité suffisante.
- Le contenu est encore servi depuis la même origine applicative (`/api/preview/...`).
- `script-src 'unsafe-inline'` autorise le JS inline dans l’aperçu, limité au bac à sable.
- Un onglet ouvert directement sur l’URL d’aperçu reste authentifié.

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
