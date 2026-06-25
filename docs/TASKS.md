# Plán úprav API — task list

> Poslední aktualizace: 2026-06-07 — všechny tasky implementovány

---

## 🔴 Priorita 1 — Kritické (nutné pro funkční UI)

- [x] **TASK-01** — `GET /api/sensors/:id` — detail senzoru
- [x] **TASK-02** — `GET /api/rooms/:id` — detail místnosti
- [x] **TASK-03** — Odpojení senzoru (`PATCH /api/rooms/:id` + `sensorId: null`)
- [x] **TASK-04** — Přiřazená místnost v seznamu/detailu senzorů

---

## 🟡 Priorita 2 — Důležité (zlepšení funkcionality)

- [x] **TASK-05** — `GET /api/rooms/:id/readings` — historie obsazenosti místnosti
- [x] **TASK-06** — `GET /api/readings/aggregate` — agregace pro grafy
- [x] **TASK-07** — Stránkování odečtů (`page`, `offset`) — varianta B

---

## 🟢 Priorita 3 — Nízká (bezpečnost a rozšiřitelnost)

- [x] **TASK-08** — Autentizace webhooku (`X-Webhook-Secret`)
- [x] **TASK-09** — Podpora více linek senzoru (agregace)
- [x] **TASK-10** — Rozšíření health check (`version`, `uptime`)

---

## Přehled

| Task | Popis | Priorita | Stav |
|------|-------|----------|------|
| TASK-01 | GET /api/sensors/:id | 🔴 | ✅ |
| TASK-02 | GET /api/rooms/:id | 🔴 | ✅ |
| TASK-03 | Odpojení senzoru | 🔴 | ✅ |
| TASK-04 | Místnost v seznamu senzorů | 🔴 | ✅ |
| TASK-05 | GET /api/rooms/:id/readings | 🟡 | ✅ |
| TASK-06 | Agregační endpoint | 🟡 | ✅ |
| TASK-07 | Stránkování odečtů | 🟡 | ✅ |
| TASK-08 | Autentizace webhooku | 🟢 | ✅ |
| TASK-09 | Podpora více linek | 🟢 | ✅ |
| TASK-10 | Rozšíření health check | 🟢 | ✅ |

**Pořadí implementace:** TASK-01 → 02 → 03 → 04 → 07 → 05 → 06 → 08 → 09 → 10

---

## Poznámky k implementaci

- **TASK-03:** `PATCH /api/rooms/:id` vrací formát detailu místnosti (stejný jako `GET /:id`)
- **TASK-07:** Bez `page`/`offset` vrací pole záznamů (zpětná kompatibilita). S paginací vrací `{ data, pagination }`
- **TASK-08:** Ověření probíhá jen pokud je nastavena env proměnná `WEBHOOK_SECRET`
- **TASK-09:** Hodnoty ze všech linek (`line_1_*`, `line_2_*`, …) se sčítají do jednoho odečtu
