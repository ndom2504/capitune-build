# Capitune

Capitune génère des sites web à partir d’instructions en langage naturel. Ce dépôt est le code de la **plateforme**, distinct des fichiers générés pour chaque projet utilisateur.

## État du jalon 2

Application Next.js avec :

- pages `/`, `/login`, `/signup`, `/dashboard`, `/workspace/[projectId]`
- store JSON local par défaut (`DATA_STORE=local`) ou Auth + Postgres Supabase (`DATA_STORE=supabase`)
- projet de démonstration créé à l’inscription (et à la première connexion Supabase)
- conversation → génération déterministe (mode démo sans clé IA)
- aperçu HTML/CSS sandboxé, versions récupérables, export ZIP
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
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Projet Supabase (client + refresh de session) |
| `SUPABASE_SERVICE_ROLE_KEY` | Serveur uniquement, jamais `NEXT_PUBLIC_` |

Aucune clé secrète n’est préfixée `NEXT_PUBLIC_` sauf l’URL/anon Supabase, destinées au client **avec RLS**.

## Architecture

- `src/lib/ai` — contrat `AIProvider` (démo + OpenAI compatible)
- `src/lib/store` — persistance locale ou Supabase, ownership vérifié côté serveur
- `src/lib/supabase` — clients Auth SSR (anon) et admin (service role)
- `src/lib/generation` — validation, chemins, versions
- `src/lib/preview` — en-têtes CSP de l’aperçu
- `docs/PREVIEW_SECURITY.md` — limites du bac à sable
- `supabase/migrations` — schéma + RLS

## Déploiement

Cible compatible Next.js (Vercel palier gratuit, ou Node). Ne pas déployer publiquement sans `SESSION_SECRET` fort et sans l’accord du fondateur.

## Licence

Usage privé du projet Capitune.
