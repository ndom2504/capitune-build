# Capitune

Capitune génère des sites web à partir d’instructions en langage naturel. Ce dépôt est le code de la **plateforme**, distinct des fichiers générés pour chaque projet utilisateur.

## État du jalon 20

Application Next.js avec :

- pages `/`, `/demo`, `/login`, `/signup`, `/dashboard`, `/workspace/[projectId]`, `/join/[token]`
- Auth e-mail + Google via Supabase, persistance Postgres
- génération **IA réelle** si `AI_API_KEY` est défini (OpenAI-compatible) ; sinon mode démonstration explicite
- atelier : exemples cliquables, génération dès la description, **aperçu multi-pages**, **édition + sauvegarde** (nouvelle version)
- **Publier** : lien public `/s/[slug]/index.html` (slug lisible, anciens jetons encore valides, index.html obligatoire, copie du lien, 404 soignée) ; si Supabase : exécuter `0002_publish.sql` (bannière si la colonne manque)
- génération : consignes de design plus strictes ; vitrine démo alignée sur la charte Capitune
- quota IA persisté par compte (8 / 10 min) ; `0003_quota.sql` sur Supabase (sinon repli mémoire + bannière)
- aperçu **signé** `/p/[jeton]/…` (pas de session) ; origine dédiée optionnelle `NEXT_PUBLIC_PREVIEW_ORIGIN`
- aperçu HTML/CSS sandboxé, versions récupérables, export ZIP
- **médias** : PNG/JPG/WebP/GIF dans `images/`, conservés entre générations, ZIP binaire
- **plans** : Gratuit (8 gén./10 min) et Pro (40) ; Stripe Checkout optionnel ; `0004_plan.sql` sur Supabase
- **démo publique** `/demo` : atelier sans compte, aperçu `srcDoc`, rien n’est persisté
- **collaboration** : lien d’invitation (éditeur / lecteur, 7 jours) ; `0005_collab.sql` sur Supabase
- **runtime isolé** : JS vanilla dans l’aperçu (sandbox, CSP `connect-src 'none'`, pas de secrets Capitune) ; origine dédiée optionnelle `NEXT_PUBLIC_PREVIEW_ORIGIN`
- ownership vérifié côté serveur ; RLS activé sur le schéma Supabase

## Prérequis

- Node.js 20 ou 22
- npm

## Installation

```bash
npm install
cp .env.example .env.local
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000). Créer un compte, ouvrir le projet **Atelier vitrine**, envoyer une instruction.

Sans `AI_API_KEY`, l’interface affiche clairement le **mode démonstration**. Ce n’est pas une requête modèle réelle.

En production (Vercel), ajoute `AI_API_KEY` (et optionnellement `AI_BASE_URL` / `AI_MODEL`) dans les variables d’environnement, puis redéploie. Sinon le site public reste en démo.

## Scripts

```bash
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
```

## Variables d’environnement

Voir `.env.example`.

| Variable | Rôle |
| --- | --- |
| `SESSION_SECRET` | Signature des cookies de session |
| `DATA_FILE` | Fichier JSON local |
| `AI_API_KEY` | Optionnel. Absent = mode démo |
| `AI_BASE_URL` / `AI_MODEL` | Fournisseur compatible OpenAI |
| `DATA_STORE` | `local` (défaut) ou `supabase` |
| `NEXT_PUBLIC_SITE_URL` | URL canonique de l’app (OAuth) |
| `NEXT_PUBLIC_PREVIEW_ORIGIN` | Optionnel. Hôte d’aperçu isolé (ex. `https://preview.capitune.com`) |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRICE_PRO` | Optionnel. Paiement Pro |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Projet Supabase (client + refresh de session) |
| `SUPABASE_SERVICE_ROLE_KEY` | Serveur uniquement, jamais `NEXT_PUBLIC_` |

Aucune clé secrète n’est préfixée `NEXT_PUBLIC_` sauf l’URL/anon Supabase, destinées au client **avec RLS**.

## Architecture

- `src/lib/ai` — contrat `AIProvider` (démo + OpenAI compatible)
- `src/lib/store` — persistance locale ou Supabase, ownership vérifié côté serveur
- `src/lib/supabase` — clients Auth SSR (anon) et admin (service role)
- `src/lib/generation` — validation, chemins, versions
- `src/lib/preview` — jeton d’aperçu, origine, CSP
- `docs/PREVIEW_SECURITY.md` — limites du bac à sable
- `supabase/migrations` — schéma + RLS

## Déploiement

Cible compatible Next.js (Vercel palier gratuit, ou Node). Ne pas déployer publiquement sans `SESSION_SECRET` fort et sans l’accord du fondateur.

## Licence

Usage privé du projet Capitune.
