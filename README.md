# ixa-ads-app

KI-gesteuerte Google-Ads-Kampagnenerstellung. Ein Nutzer verbindet sein Google-Ads-Konto, beschreibt sein Unternehmen, und ein Loop aus OpenAI (Entwurf) und Claude (Review gegen feste Regeln) erzeugt einen kampagnenfertigen Entwurf — erst nach ausdrücklicher Freigabe wird etwas bei Google Ads angelegt.

## Setup

```bash
npm install
npm run dev
```

Ohne konfigurierte API-Keys läuft die App vollständig im Test-/Simulationsmodus (Vorlagen-Entwurf statt KI, simulierte Google-Ads-Verbindung, simulierter Push) — siehe `.env.local` für die benötigten Variablen.
