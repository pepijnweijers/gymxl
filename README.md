# GymXL Niveauvolgsysteem

PocketBase (backend, `pb_migrations`, `pb_hooks`) + Nuxt/Nuxt UI (`web/`, statisch gebouwd naar `pb_public`). Eén container.

## Draaien met Docker

```bash
APP_URL=https://gym.example.nl docker compose up -d --build
```

- Open de app op poort 8090. Bij de eerste keer verschijnt de installatiewizard (clubnaam + eerste admin).
- Data staat in het volume `pb_data` (SQLite, uploads, back-ups).
- Zet er een reverse proxy met HTTPS voor (bijv. Caddy: `reverse_proxy localhost:8090`). Zonder HTTPS werkt de PWA niet op een telefoon.

### Eenmalig na installatie, in het PocketBase-beheerscherm (`/_/`)

De link om een superuser aan te maken staat in `docker compose logs`, of:

```bash
docker compose exec gymxl /pb/pocketbase superuser upsert jij@club.nl STERK-WACHTWOORD --dir /pb/pb_data
```

Daarna in **Settings → Backups**: dagelijkse back-up naar S3-compatibele opslag in de EU aanzetten.

## Accounts zonder mail

De app verstuurt geen e-mail.

- **Toegang (whitelist).** De admin zet bij *Beheer → Toegang* een e-mailadres met rol (trainer of admin) op de lijst. Die persoon maakt zelf een account via `/registreren`; de rol komt van de lijst.
- **Wachtwoord vergeten.** De admin maakt bij *Beheer → Gebruikers* een tijdelijk wachtwoord en geeft dat persoonlijk door. Wijzigen kan bij *Mijn account*.
- **Trainersgroepen.** De admin maakt groepen bij *Beheer → Groepen*. Een team kan gedeeld worden met een groep of met één collega (op e-mail), met recht *bewerken* of *inzien*. De admin kan een team aanmaken met een trainer als eigenaar.

## Offline

De app werkt ook als het bereik in de zaal tijdelijk wegvalt, mits hij eerder online is geopend:

- De app zelf staat in de cache van de service worker (PWA).
- Wat je online hebt bekeken, kun je offline opnieuw zien. Oefeningen en skills worden na het inloggen vooraf geladen.
- Training starten, aanwezigheid, groepjes maken en verplaatsen, beoordelen en leerlingen toevoegen kunnen offline. Ze komen in een wachtrij (zie de badge *X wacht* rechtsboven) en worden op volgorde verstuurd zodra er weer bereik is.
- Online-only: inloggen, delen, beheer en het beheren van skills en oefeningen.
- Uitloggen kan pas als de wachtrij leeg is. Bij uitloggen wordt de offline-cache gewist.

## Ontwikkelen

```bash
pocketbase serve --dir pb_data   # in de projectmap, op :8090
cd web && npm install && npm run dev
```

```bash
cd web && npm test
```

## Afwijkingen van het bouwplan

- **Geen collectie `team_toegang`.** Toegang staat als relatievelden op `teams` (`eigenaar`, `bewerkers`, `inzieners`, `groepen_bewerken`, `groepen_inzien`). Zo staan een gebruiker en zijn recht in één rij, en kan een API-regel niet per ongeluk de gebruiker van de ene rij combineren met het recht van een andere.
- De naam van een gebruiker staat in het standaardveld `name` van PocketBase.
- Skills en oefeningen worden beheerd door de admin; trainers kunnen ze alleen bekijken (open keuze uit het plan).
- Beoordelen met 1 tot 5 sterren in plaats van 1 tot 3 (nog niet / bezig / beheerst). Oude scores zijn omgezet: 1 → 1, 2 → 3, 3 → 5.
- Geen uitnodigingsmails: zie *Accounts zonder mail*.
