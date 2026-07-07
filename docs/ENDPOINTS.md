# Soupis API endpointů

> Poslední ověření proti kódu: 2026-06-21  
> Zdroj: `server/server.js`, `server/controllers/*.controller.js`, `server/services/*.service.js`, `client/src/api/api.js`

Výchozí adresa: `http://localhost:3001` (nebo port z env `PORT`)

---

## Legenda využití

| Označení | Význam |
|----------|--------|
| *(bez označení)* | Používá React frontend (`client/src/api/api.js`) |
| **EXTERNÍ** | Nepoužívá frontend — volá externí systém (ChirpStack, monitoring) |
| **NEPOUŽÍVANÉ** | Implementováno v API, frontend ho nevolá |

---

## Health check

| Metoda | Endpoint | Využití | Co dělá |
|--------|----------|---------|---------|
| `GET` | `/` | **EXTERNÍ** | Ověří, že API běží — vrátí status, verzi a uptime |

Controller: `server/server.js`

**DTO in:** žádné (prázdný GET)

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

## Webhook

| Metoda | Endpoint | Využití | Co dělá |
|--------|----------|---------|---------|
| `POST` | `/webhook` | **EXTERNÍ** | Přijme data ze senzoru (ChirpStack VS135), uloží odečet obsazenosti a aktualizuje `lastSeenAt` senzoru |

Controller: `server/controllers/webhook.controller.js`

**Autentizace:** pokud je nastaveno `WEBHOOK_API_KEY` v `.env`, vyžaduje header `X-API-Key`.

**Identifikace senzoru:** `req.body.deviceInfo.devEui` (ne slug v URL).

**DTO in:**
- Header (volitelné): `X-API-Key: <WEBHOOK_API_KEY>`
- Body:
```json
{
  "time": "2026-06-07T10:30:00.000Z",
  "deviceInfo": {
    "devEui": "24E124767F020849"
  },
  "object": {
    "line_1_total_in": 150,
    "line_1_total_out": 120,
    "line_1_period_in": 2,
    "line_1_period_out": 1
  }
}
```
Pole `time` a další linky (`line_2_*`, …) jsou volitelné.

**DTO out** `200` (úspěch):
```json
{
  "ok": true,
  "occupancy": 30
}
```

**DTO out** `200` (logická chyba):
```json
{
  "ok": false,
  "error": "Neznámý senzor"
}
```

**DTO out** `401` (špatný API klíč):
```json
{
  "ok": false,
  "error": "Neautorizováno"
}
```

---

## Senzory — `/api/sensors`

Controller: `server/controllers/sensor.controller.js`

### `GET /api/sensors`

Vrátí seznam všech senzorů včetně info, ke které místnosti jsou přiřazeny.

**Použití frontend:** stránky Senzory, Plánek, Dashboard (indirect přes místnosti).

**DTO in:** žádné

**DTO out** `200`:
```json
[
  {
    "id": "665a1b2c3d4e5f6a7b8c9d0e",
    "name": "Senzor vchod A",
    "devEui": "0123456789ABCDEF",
    "lastSeenAt": "2026-06-07T10:30:00.000Z",
    "isActive": true,
    "room": {
      "id": "665a1b2c3d4e5f6a7b8c9d0f",
      "name": "Učebna 101"
    }
  }
]
```
`room` je `null`, pokud senzor není přiřazen.

---

### `GET /api/sensors/:id` — **NEPOUŽÍVANÉ**

Vrátí detail jednoho senzoru. Frontend pracuje se seznamem z `GET /api/sensors`.

**DTO in:** path param `:id` — MongoDB ObjectId

**DTO out** `200`: stejný objekt jako jedna položka ze seznamu výše

**DTO out** `404`:
```json
{ "error": "Senzor nenalezen" }
```

---

### `POST /api/sensors`

Vytvoří nový senzor.

**Použití frontend:** stránka Senzory.

**DTO in:**
```json
{
  "name": "Senzor vchod A",
  "devEui": "0123456789ABCDEF"
}
```

**DTO out** `201`: formát senzoru (viz GET seznam)

**DTO out** `400`:
```json
{ "error": "Povinné pole: name, devEui" }
```

**DTO out** `409`:
```json
{ "error": "Senzor s tímto DevEUI již existuje" }
```

---

### `PATCH /api/sensors/:id`

Upraví senzor.

**Použití frontend:** stránka Senzory.

**DTO in:** libovolná podmnožina polí
```json
{
  "name": "Senzor vchod B",
  "devEui": "FEDCBA9876543210",
  "isActive": false
}
```

**DTO out** `200`: aktualizovaný senzor (formát jako GET detail)

**DTO out** `404`:
```json
{ "error": "Senzor nenalezen" }
```

**DTO out** `409`:
```json
{ "error": "Senzor s tímto DevEUI již existuje" }
```

---

### `DELETE /api/sensors/:id`

Smaže senzor. Pokud je přiřazen k místnosti, vrátí 409.

**Použití frontend:** stránka Senzory.

**DTO in:** path param `:id`

**DTO out** `200`:
```json
{ "ok": true }
```

**DTO out** `409`:
```json
{ "error": "Senzor je přiřazen k místnosti. Nejdříve ho odpoj." }
```

---

## Místnosti — `/api/rooms`

Controller: `server/controllers/room.controller.js`

### `GET /api/rooms`

Vrátí seznam místností s aktuální obsazeností.

**Použití frontend:** Dashboard, Plánek.

**DTO in:** žádné

**DTO out** `200`:
```json
[
  {
    "id": "665a1b2c3d4e5f6a7b8c9d0f",
    "name": "Učebna 101",
    "capacity": 30,
    "geometry": {
      "x": 50,
      "y": 50,
      "width": 150,
      "height": 100
    },
    "sensorId": "665a1b2c3d4e5f6a7b8c9d0e",
    "sensor": {
      "id": "665a1b2c3d4e5f6a7b8c9d0e",
      "name": "Senzor vchod A",
      "devEui": "0123456789ABCDEF"
    },
    "currentOccupancy": 12,
    "occupancyPercent": 40
  }
]
```
`sensor` a `sensorId` jsou `null`, pokud místnost nemá senzor.

---

### `GET /api/rooms/:id` — **NEPOUŽÍVANÉ**

Vrátí detail místnosti. Frontend pracuje se seznamem z `GET /api/rooms` a lokálním stavem po `PATCH`.

**DTO in:** path param `:id`

**DTO out** `200`:
```json
{
  "id": "665a1b2c3d4e5f6a7b8c9d0f",
  "name": "Učebna 101",
  "capacity": 30,
  "geometry": {
    "x": 50,
    "y": 50,
    "width": 150,
    "height": 100
  },
  "currentOccupancy": 12,
  "occupancyPercent": 40,
  "sensor": {
    "id": "665a1b2c3d4e5f6a7b8c9d0e",
    "name": "Senzor vchod A",
    "devEui": "0123456789ABCDEF"
  }
}
```
`sensor` je `null`, pokud místnost nemá senzor.

**DTO out** `404`:
```json
{ "error": "Místnost nenalezena" }
```

---

### `GET /api/rooms/:id/readings`

Historie odečtů senzoru místnosti. Query parametry stejné jako u `GET /api/readings`.

**Použití frontend:** Dashboard (graf obsazenosti vybrané místnosti).

**DTO in:**
- Path: `:id`
- Query (volitelné): `from`, `to`, `limit`, `page`, `offset`, `interval`

**DTO out** `200`:
```json
{
  "room": {
    "id": "665a1b2c3d4e5f6a7b8c9d0f",
    "name": "Učebna 101",
    "capacity": 30,
    "sensor": {
      "id": "665a1b2c3d4e5f6a7b8c9d0e",
      "name": "Senzor vchod A",
      "devEui": "0123456789ABCDEF"
    }
  },
  "readings": [
    {
      "id": "665a1b2c3d4e5f6a7b8c9d10",
      "sensor": {
        "id": "665a1b2c3d4e5f6a7b8c9d0e",
        "name": "Senzor vchod A",
        "devEui": "0123456789ABCDEF"
      },
      "timestamp": "2026-06-07T10:30:00.000Z",
      "totalIn": 150,
      "totalOut": 120,
      "periodIn": 2,
      "periodOut": 1,
      "occupancy": 30
    }
  ]
}
```

**DTO out** `404`:
```json
{ "error": "Místnost nemá přiřazený senzor" }
```

---

### `POST /api/rooms`

Vytvoří novou místnost.

**Použití frontend:** Plánek.

**DTO in:**
```json
{
  "name": "Učebna 101",
  "capacity": 30,
  "geometry": {
    "x": 50,
    "y": 50,
    "width": 150,
    "height": 100
  }
}
```
Pole `geometry` je volitelné (výchozí hodnoty ze schématu).

**DTO out** `201`: formát detailu místnosti (viz GET `/:id`)

**DTO out** `400`:
```json
{ "error": "Povinné pole: name, capacity" }
```

---

### `PATCH /api/rooms/:id`

Upraví místnost. `sensorId: null` odpojí senzor.

**Použití frontend:** Plánek (detail místnosti, drag/resize na plátně).

**DTO in:**
```json
{
  "name": "Učebna 102",
  "capacity": 25,
  "geometry": { "x": 60, "y": 40, "width": 120, "height": 90 },
  "sensorId": "665a1b2c3d4e5f6a7b8c9d0e"
}
```
Pro odpojení senzoru:
```json
{ "sensorId": null }
```

**DTO out** `200`: formát detailu místnosti (viz GET `/:id`)

**DTO out** `404`:
```json
{ "error": "Místnost nenalezena" }
```

---

### `DELETE /api/rooms/:id`

Smaže místnost a odpojí senzor.

**Použití frontend:** Plánek.

**DTO in:** path param `:id`

**DTO out** `200`:
```json
{ "ok": true }
```

**DTO out** `404`:
```json
{ "error": "Místnost nenalezena" }
```

---

## Odečty — `/api/readings`

Controller: `server/controllers/reading.controller.js`

### `GET /api/readings` — **NEPOUŽÍVANÉ**

Historie odečtů s filtrováním a volitelnou paginací. Frontend používá `/api/rooms/:id/readings` a `/api/readings/aggregate`.

**DTO in** (query):
```
?sensorId=665a1b2c3d4e5f6a7b8c9d0e&from=2026-06-01&to=2026-06-07&limit=100
?sensorId=665a1b2c3d4e5f6a7b8c9d0e&page=1&limit=50
```

**DTO out** `200` (bez paginace):
```json
[
  {
    "id": "665a1b2c3d4e5f6a7b8c9d10",
    "sensor": {
      "id": "665a1b2c3d4e5f6a7b8c9d0e",
      "name": "Senzor vchod A",
      "devEui": "0123456789ABCDEF"
    },
    "timestamp": "2026-06-07T10:30:00.000Z",
    "totalIn": 150,
    "totalOut": 120,
    "periodIn": 2,
    "periodOut": 1,
    "occupancy": 30
  }
]
```

**DTO out** `200` (s `page` nebo `offset`):
```json
{
  "data": [ "...stejný formát jako položka výše..." ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "offset": 0,
    "total": 240,
    "totalPages": 5
  }
}
```

**DTO out** `400`:
```json
{ "error": "Neplatný formát data" }
```

---

### `GET /api/readings/latest` — **NEPOUŽÍVANÉ**

Poslední odečet. Aktuální obsazenost frontend bere z `GET /api/rooms`.

**DTO in** (query, volitelné):
```
?sensorId=665a1b2c3d4e5f6a7b8c9d0e
```

**DTO out** `200`: jeden objekt odečtu (formát jako položka v seznamu výše)

**DTO out** `404`:
```json
{ "error": "Žádný záznam" }
```

---

### `GET /api/readings/aggregate`

Agregovaná data pro grafy. Umí vrátit časovou řadu pro celé podlaží, konkrétní místnost nebo konkrétní senzor.

**Použití frontend:** Dashboard (graf obsazenosti celého podlaží).

**DTO in** (query):
```
?from=2026-06-01&to=2026-06-07&interval=hour
?roomId=665a1b2c3d4e5f6a7b8c9d0f&from=2026-06-01&to=2026-06-07&interval=day
?sensorId=665a1b2c3d4e5f6a7b8c9d0e&from=2026-06-01&to=2026-06-07&interval=minute
```
`interval`: `minute`, `hour` (výchozí) nebo `day`

**DTO out** `200`:
```json
[
  {
    "timestamp": "2026-06-07T10:00:00.000Z",
    "value": 28
  }
]
```

**DTO out** `400`:
```json
{ "error": "Parametr interval musí být 'minute', 'hour' nebo 'day'" }
```

---

## Společné chybové odpovědi

**Neplatné MongoDB ID** `400`:
```json
{ "error": "Neplatné ID" }
```

**Neexistující endpoint** `404`:
```json
{ "error": "Endpoint neexistuje" }
```

**Obecná chyba serveru** `500`:
```json
{ "error": "Popis chyby" }
```

---

## Souhrn

| Skupina | Počet | Frontend | Externí | Nepoužívané |
|---------|-------|----------|---------|-------------|
| Health check | 1 | 0 | 1 | 0 |
| Webhook | 1 | 0 | 1 | 0 |
| Senzory | 5 | 4 | 0 | 1 |
| Místnosti | 6 | 5 | 0 | 1 |
| Odečty | 3 | 1 | 0 | 2 |
| **Celkem** | **16** | **10** | **2** | **4** |

### Endpointy označené **NEPOUŽÍVANÉ**

| Metoda | Endpoint | Důvod |
|--------|----------|-------|
| `GET` | `/api/sensors/:id` | Frontend používá seznam `GET /api/sensors` |
| `GET` | `/api/rooms/:id` | Frontend používá seznam `GET /api/rooms` |
| `GET` | `/api/readings` | Frontend používá agregaci a `/rooms/:id/readings` |
| `GET` | `/api/readings/latest` | Aktuální obsazenost jde z `GET /api/rooms` |
