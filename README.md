# ixa-ads-app

KI-gesteuerte Google-Ads-Kampagnenerstellung. Ein Nutzer verbindet sein Google-Ads-Konto, beschreibt sein Unternehmen, und ein Loop aus OpenAI (Entwurf) und Claude (Review gegen feste Regeln) erzeugt einen kampagnenfertigen Entwurf — erst nach ausdrücklicher Freigabe wird etwas bei Google Ads angelegt.

## Setup

```bash
npm install
npm run dev
```

Ohne konfigurierte API-Keys läuft die App vollständig im Test-/Simulationsmodus (Vorlagen-Entwurf statt KI, simulierte Google-Ads-Verbindung, simulierter Push) — siehe `.env.local` für die benötigten Variablen.

## Abo-System

Login läuft über Supabase Auth (Magic Link, kein Passwort). Drei Abo-Stufen (Basic/Pro/Agency) begrenzen die Kampagnen pro Monat; Abrechnung läuft über Stripe Checkout + Customer Portal. Ohne `STRIPE_SECRET_KEY` wird das Abonnieren/Kündigen direkt in der Datenbank simuliert — kein echtes Geld bewegt sich.

**Einmalige manuelle Schritte im Supabase-Dashboard (Projekt "ixa-ads-app"), sonst funktioniert der Magic-Link-Login nicht:**

1. **Authentication → Emails**: In den Templates "Magic Link" und "Confirm signup" den Link von `{{ .ConfirmationURL }}` auf `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email` ändern.
2. **Authentication → URL Configuration**: Site URL auf die Produktions-URL setzen (z. B. `https://ixa-ads-app.vercel.app`) und dieselbe URL unter Redirect URLs hinzufügen (plus `http://localhost:3002` für lokale Entwicklung).

**Stripe-Setup** (sobald echtes Abrechnen gewünscht ist): drei Produkte/Preise (Basic/Pro/Agency, monatlich) in Stripe anlegen, die Price-IDs in `STRIPE_PRICE_BASIC`/`_PRO`/`_AGENCY` eintragen, einen Webhook auf `/api/billing/webhook` für die Events `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` registrieren und dessen Signing Secret in `STRIPE_WEBHOOK_SECRET` eintragen.
