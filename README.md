# Klantendashboard

Dashboard met klanten en feedbackmomenten, gebouwd op het Ontwerpdossier-concept
(origineel / feedback / eindresultaat / reflectie + PDF-export). Eén gebruiker,
geen klantlogins, geen wachtwoord-gate — direct open.

## Zelf opzetten (moet je zelf doen, hier heeft Claude geen toegang toe)

### 1. Supabase

1. Maak een account op [supabase.com](https://supabase.com) en een nieuw project (gratis tier).
2. Ga naar **SQL Editor** en plak de inhoud van [`supabase/schema.sql`](supabase/schema.sql), run het.
3. Ga naar **Storage** → maak een bucket genaamd `feedback-images`, zet 'm op **Public**.
4. Ga naar **Project Settings → API** en kopieer:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `service_role` secret key → `SUPABASE_SERVICE_ROLE_KEY` (nooit publiek delen)

### 2. Lokaal draaien

```bash
cp .env.example .env.local
# vul de 2 variabelen in .env.local in
npm install
npm run dev
```

Open `http://localhost:3000`.

### 3. Deployen naar Vercel

1. Maak een GitHub-repo aan en push deze map ernaartoe.
2. Maak een account op [vercel.com](https://vercel.com), importeer die repo.
3. Zet dezelfde 2 env vars in Vercel (Project Settings → Environment Variables).
4. Deploy.

## Wat er wel/niet in zit

- Dashboard met klantkaarten, drag-and-drop ("snel": maakt meteen klant + moment aan) en
  een handmatige modus (formuliertje eerst).
- Klantpagina met lijst van feedbackmomenten, sorteerbaar.
- Feedbackmoment-pagina: de Ontwerpdossier-tool, met autosave naar Supabase en
  PDF-export die client-side blijft draaien (html2canvas + jsPDF), net als voorheen.
- Geen klantlogins, geen rollen, geen betaalde tiers — bewust buiten scope, zie de
  bouwspec.
