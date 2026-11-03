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

Daarna in **Settings**:

1. **Mail settings**: SMTP instellen. Zonder SMTP komen uitnodigingen en wachtwoordmails niet aan.
2. **Application**: Application URL controleren (wordt alleen bij de eerste start uit `APP_URL` gezet).
3. **Backups**: dagelijkse back-up naar S3-compatibele opslag in de EU aanzetten.

## Ontwikkelen

```bash
pocketbase serve --dir pb_data   # in de projectmap, op :8090
cd web && npm install && npm run dev
```

```bash
cd web && npm test
```

## Afwijkingen van het bouwplan

- **Geen collectie `team_toegang`.** Toegang staat als relatievelden op `teams` (`eigenaar`, `bewerkers`, `inzieners`). Zo staan een gebruiker en zijn recht in één rij, en kan een API-regel niet per ongeluk de gebruiker van de ene rij combineren met het recht van een andere.
- De naam van een gebruiker staat in het standaardveld `name` van PocketBase.
- Skills en oefeningen worden beheerd door de admin; trainers kunnen ze alleen bekijken (open keuze uit het plan).
