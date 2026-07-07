# Stav API — dokončené úkoly

> Poslední aktualizace: 2026-07-07

Všechny níže uvedené funkce jsou implementované a odpovídají aktuálnímu stavu aplikace.

---

## Implementováno a používané frontendem

- [x] Přihlášení (`POST /api/auth/login`)
- [x] Správa uživatelů (CRUD `/api/users`)
- [x] Správa senzorů (CRUD `/api/sensors`, včetně info o přiřazené místnosti)
- [x] Správa místností (CRUD `/api/rooms`, přiřazení/odpojení senzoru přes `PATCH`)
- [x] Aktuální obsazenost v seznamu místností (`GET /api/rooms` + `getRoomsOccupancyMap`)
- [x] Agregace pro grafy (`GET /api/readings/aggregate`, MongoDB pipeline)
- [x] Příjem dat ze senzoru (`POST /api/readings/collect`, ChirpStack)
- [x] Autentizace webhooku (`X-API-Key`)
- [x] Podpora více detekčních linií (`extractLineCounts`)
- [x] Health check (`GET /`)

---

## Odstraněno při úklidu (nepoužíval frontend)

- `GET /api/sensors/:id` — detail senzoru
- `GET /api/rooms/:id` — detail místnosti
- `GET /api/rooms/:id/readings` — raw historie místnosti
- `GET /api/readings` — raw historie odečtů
- `server/scripts/` — vývojové skripty (benchmark)
- `server/utils/` — agregace přesunuta do `reading.service.js`

---

## Související dokumentace

Kompletní výpis aktivních endpointů: [ENDPOINTS.md](./ENDPOINTS.md)
