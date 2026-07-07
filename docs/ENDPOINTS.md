# Soupis API endpointů

> Poslední ověření proti kódu: 2026-07-07  
> Zdroj: `server/server.js`, `server/controllers/*.controller.js`, `client/src/api/*.js`

Výchozí adresa: `http://localhost:3001` (nebo port z env `PORT`)

---

## Legenda

| Označení | Význam |
|----------|--------|
| **FE** | Volá React frontend |
| **EXTERNÍ** | Volá externí systém (ChirpStack), ne frontend |
| **Admin** | Vyžaduje roli `admin` |

Všechny `/api/*` endpointy kromě auth login vyžadují header `Authorization: Bearer <token>`.

---

## Přehled endpointů v aplikaci

| Metoda | Endpoint | Kdo volá | Stránka / účel |
|--------|----------|----------|----------------|
| `GET` | `/` | EXTERNÍ | Health check |
| `POST` | `/api/auth/login` | FE | Přihlášení |
| `GET` | `/api/users` | FE (admin) | Uživatelé |
| `POST` | `/api/users` | FE (admin) | Uživatelé |
| `PATCH` | `/api/users/:id` | FE (admin) | Uživatelé |
| `DELETE` | `/api/users/:id` | FE (admin) | Uživatelé |
| `GET` | `/api/sensors` | FE | Senzory, Plánek |
| `POST` | `/api/sensors` | FE (admin) | Senzory |
| `PATCH` | `/api/sensors/:id` | FE (admin) | Senzory |
| `DELETE` | `/api/sensors/:id` | FE (admin) | Senzory |
| `GET` | `/api/rooms` | FE | Dashboard, Plánek |
| `POST` | `/api/rooms` | FE (admin) | Plánek |
| `PATCH` | `/api/rooms/:id` | FE (admin) | Plánek |
| `DELETE` | `/api/rooms/:id` | FE (admin) | Plánek |
| `GET` | `/api/readings/aggregate` | FE | Dashboard — grafy |
| `POST` | `/api/readings/collect` | EXTERNÍ | ChirpStack webhook |
| `POST` | `/webhook` | EXTERNÍ | Alias pro ChirpStack |

**Celkem: 17 endpointů** (10 FE + 2 externí webhook aliasy + 1 health + 4 users CRUD)

---

## Health check

### `GET /`

**Využití:** EXTERNÍ (monitoring)

**DTO out** `200`:
```json
{
  "status": "ok",
  "message": "People Counter API",
  "version": "1.0.0",
  "uptime": 123
}
```

---

## Autentizace — `/api/auth`

### `POST /api/auth/login`

**Využití:** FE — přihlášení

**DTO in:**
```json
{
  "email": "admin@example.com",
  "password": "heslo123"
}
```

**DTO out** `200`:
```json
{
  "token": "jwt...",
  "user": { "id": "...", "email": "...", "role": "admin" }
}
```

---

## Uživatelé — `/api/users` (Admin)

Controller: `server/controllers/user.controller.js`  
Frontend: `client/src/api/users.api.js`, stránka Uživatelé

| Metoda | Endpoint | Co dělá |
|--------|----------|---------|
| `GET` | `/api/users` | Seznam uživatelů |
| `POST` | `/api/users` | Vytvoření uživatele |
| `PATCH` | `/api/users/:id` | Úprava role / emailu |
| `DELETE` | `/api/users/:id` | Smazání uživatele |

---

## Senzory — `/api/sensors`

Controller: `server/controllers/sensor.controller.js`  
Frontend: `client/src/api/api.js`, stránky Senzory a Plánek

### `GET /api/sensors`

Seznam senzorů včetně přiřazené místnosti (`room`).

**DTO out** `200`:
```json
[
  {
    "id": "...",
    "name": "Recepce",
    "devEui": "0123456789ABCDEF",
    "lastSeenAt": "2026-07-07T10:30:00.000Z",
    "room": { "id": "...", "name": "Učebna 101" }
  }
]
```
`room` je `null`, pokud senzor není přiřazen.

### `POST /api/sensors` (Admin)

**DTO in:** `{ "name": "...", "devEui": "..." }`

### `PATCH /api/sensors/:id` (Admin)

**DTO in:** libovolná podmnožina `{ "name", "devEui" }`

### `DELETE /api/sensors/:id` (Admin)

Smaže senzor. Pokud je přiřazen k místnosti → `409`.

---

## Místnosti — `/api/rooms`

Controller: `server/controllers/room.controller.js`  
Frontend: Dashboard, Plánek

### `GET /api/rooms`

Seznam místností s aktuální obsazeností. Dashboard polluje každé **3 minuty**.

**DTO out** `200`:
```json
[
  {
    "id": "...",
    "name": "Učebna 101",
    "capacity": 30,
    "geometry": { "x": 50, "y": 50, "width": 150, "height": 100 },
    "sensorId": "...",
    "sensor": { "id": "...", "name": "...", "devEui": "..." },
    "currentOccupancy": 12,
    "occupancyPercent": 40
  }
]
```

### `POST /api/rooms` (Admin)

**DTO in:** `{ "name", "capacity", "geometry?" }`

### `PATCH /api/rooms/:id` (Admin)

Úprava místnosti. `sensorId: <id>` přiřadí senzor (stará vazba se automaticky odpojí). `sensorId: null` odpojí senzor.

### `DELETE /api/rooms/:id` (Admin)

---

## Odečty — `/api/readings`

Controller: `server/controllers/reading.controller.js`  
Service: `server/services/reading.service.js`

### `GET /api/readings/aggregate`

Agregovaná data pro grafy. Bez `roomId` = celé patro (součet senzorů), s `roomId` = jedna místnost.

**Frontend:** Dashboard (`chartData.js` → `getAggregate`)

**DTO in** (query):
```
?from=2026-07-01T00:00:00.000Z&to=2026-07-07T00:00:00.000Z&interval=hour
?roomId=...&from=...&to=...&interval=minute
```

| Parametr | Popis |
|----------|-------|
| `from` | Začátek rozsahu (ISO 8601) |
| `to` | Konec rozsahu (ISO 8601) |
| `interval` | `minute` (5min sloty), `hour` (výchozí), `day` |
| `roomId` | Volitelné — filtr na místnost |

**DTO out** `200`:
```json
[
  { "timestamp": "2026-07-07T10:00:00.000Z", "value": 28 },
  { "timestamp": "2026-07-07T11:00:00.000Z", "value": null }
]
```

Agregace probíhá v MongoDB (`$dateTrunc` + `$last` pro `minute`, `$avg` pro `hour`/`day`). U patra se hodnoty senzorů v každém slotu sečtou v service.

**DTO out** `400`:
```json
{ "error": "Parametr interval musí být 'minute', 'hour' nebo 'day'" }
```

---

## Webhook — příjem dat ze senzoru

Controller: `server/controllers/webhook.controller.js`  
Service: `server/services/webhook.service.js` (`extractLineCounts`)

| Metoda | Endpoint | Poznámka |
|--------|----------|----------|
| `POST` | `/api/readings/collect` | Primární URL pro ChirpStack |
| `POST` | `/webhook` | Alias — stejný handler |

**Autentizace:** header `X-API-Key` (env `WEBHOOK_API_KEY`). Při neshodě → `401`. Při logické chybě → `200` s `ok: false`.

**DTO in:**
```json
{
  "time": "2026-07-07T10:30:00.000Z",
  "deviceInfo": { "devEui": "24E124767F020849" },
  "object": {
    "line_1_total_in": 150,
    "line_1_total_out": 120,
    "line_1_period_in": 2,
    "line_1_period_out": 1
  }
}
```

**DTO out** `200` (úspěch):
```json
{ "ok": true, "occupancy": 30 }
```

---

## Společné chybové odpovědi

| Status | Kdy |
|--------|-----|
| `400` | Neplatný vstup, špatný formát data |
| `401` | Chybí / neplatný token, špatný webhook klíč |
| `404` | Entita nenalezena, neexistující endpoint |
| `409` | Konflikt (duplicitní DevEUI, senzor přiřazen k místnosti) |
| `500` | Interní chyba serveru |
