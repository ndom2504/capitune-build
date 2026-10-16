# Supabase (jalon 2)

Le store JSON local (`.data/store.json`) reste le défaut (`DATA_STORE=local`). Quand un projet Supabase du palier gratuit est prêt, Capitune peut basculer l’auth et la persistance.

## Activer

1. Créer un projet dans le palier gratuit.
2. Authentication → Providers → Email : pour le développement local, désactiver **Confirm email** (sinon l’inscription attend un lien mail).
3. Exécuter `supabase/migrations/0001_init.sql`, `0002_publish.sql`, `0003_quota.sql`, `0004_plan.sql` et `0005_collab.sql` dans le SQL Editor.
4. Settings → API : copier Project URL, `anon` `public`, et `service_role`.
5. Dans `.env.local` :

```
DATA_STORE=supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

6. Redémarrer `npm run dev`.

`SUPABASE_SERVICE_ROLE_KEY` ne quitte jamais le serveur. Les routes vérifient encore `owner_id` avant chaque lecture/écriture. RLS reste une défense supplémentaire si un client utilisait la clé anon.

Les identifiants locaux (cookie `capitune_session`) ne sont pas migrés automatiquement : recréez un compte après le bascule.

## Connexion Google

Capitune utilise le fournisseur Google de **Supabase Auth** (même session et même `auth.uid()` que l’e-mail). Ne pas brancher Firebase Auth en parallèle.

1. Google Cloud (projet `capitunebuild` ou équivalent) → APIs & Services → Credentials → **OAuth 2.0 Client ID** (Web).
2. Authorized JavaScript origins : `http://localhost:3000` et l’URL de production.
3. Authorized redirect URIs : `https://<ref>.supabase.co/auth/v1/callback`.
4. Supabase → Authentication → Providers → **Google** : coller Client ID et Client Secret, activer.
5. Supabase → Authentication → URL configuration :
   - Site URL : `https://www.capitune.com` (prod) ou `http://localhost:3000` (dev)
   - Redirect URLs (toutes) :
     - `http://localhost:3000/auth/callback`
     - `https://www.capitune.com/auth/callback`
     - `https://capitune.com/auth/callback`
     - `https://www.capitune.com/**`
     - `https://capitune.com/**`

Si une URL n’est pas dans cette liste, Supabase renvoie vers la Site URL (la page d’accueil) après Google.

