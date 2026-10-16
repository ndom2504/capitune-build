# Aperçu et isolation

## Jalon 14

L’aperçu du workspace est servi par `/p/[jeton]/index.html`. Le jeton est une capacité HMAC (propriétaire + projet, 8 h), **sans cookie de session**. L’iframe utilise `sandbox="allow-scripts"` **sans** `allow-same-origin`.

Un site **publié** est servi par `/s/[slug]/index.html` sans session : uniquement les fichiers du projet, jamais la conversation. `/s/[slug]` redirige vers `index.html`. Le slug est unique ; le changer ou le retirer invalide l’ancienne URL. Les anciens jetons imprévisibles restent valides. La même CSP s’applique.

`/p/` et `/s/` redirigent la racine vers `index.html`. Les assets en URL absolue (`/styles.css`, imports JS) sont réécrits vers le préfixe du jeton.

## Jalon 20 — runtime isolé

Le JS **vanilla** du projet (`app.js`) s’exécute dans le navigateur de l’utilisateur, jamais dans le processus Capitune :

- iframe `sandbox="allow-scripts"` (pas `allow-same-origin`) ;
- CSP : `script-src 'self' 'unsafe-inline'`, `worker-src 'self' blob:`, `connect-src 'none'`, `form-action 'none'` ;
- `Cross-Origin-Resource-Policy: same-origin` ;
- pas de fetch, pas de cookies de session, pas de clé IA ni de rôle de service ;
- playground `/demo` : le JS est inliné dans `srcDoc` (pas d’hôte `/p/`).

Ce n’est pas un bundler ni un WebContainer : pas de npm, pas de React compilé, pas de Node.

## Origine dédiée

Si `NEXT_PUBLIC_PREVIEW_ORIGIN` pointe vers un **autre hôte** que `NEXT_PUBLIC_SITE_URL` (ex. `https://preview.capitune.com` sur le même projet Vercel) :

- l’iframe charge cet hôte ;
- le cookie de session Capitune est *host-only* : il n’est pas envoyé au sous-domaine d’aperçu ;
- le middleware refuse tout chemin hors `/p/` sur cet hôte ;
- la CSP `frame-ancestors` autorise uniquement l’origine de l’application.

Sans cette variable, `/p/…` est servi sur l’origine de l’app (jeton signé, pas de session requise). Le cookie HttpOnly peut encore voyager sur le même hôte.

## Ce qui n’est pas une barrière complète

- Une iframe seule n’est pas une frontière de sécurité suffisante.
- Sans origine dédiée, le HTML généré reste sur le même hôte que l’app.
- `script-src 'self' 'unsafe-inline'` autorise le JS du projet, limité au bac à sable et à `connect-src 'none'`.
- Un lien `/s/[slug]/` est public et peut être deviné s’il est court : quiconque a l’URL voit les fichiers générés.
- Un jeton `/p/` fuité reste valable jusqu’à expiration.

## En-têtes

CSP (`default-src 'none'`, `connect-src 'none'`, `form-action 'none'`, `style-src` / `script-src` `'self' 'unsafe-inline'`, `worker-src 'self' blob:`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Cache-Control: no-store`, `Cross-Origin-Resource-Policy: same-origin`. `X-Frame-Options` n’est pas posé sur `/p/` pour permettre l’iframe d’une origine dédiée.

## Hors périmètre volontaire

- Aucune exécution de commandes shell générées par le modèle.
- Aucun accès base de données pour le modèle.
- Les applications React/bundlées nécessiteraient un **service d’exécution isolé** séparé (autre origine, réseau restreint, pas de secrets Capitune).
