# MongoDB Integration Assignment (Sprint Evidence)

## Project context

This project integrates MongoDB + Mongoose for the **Music Festival Planner** backend.

- Backend runtime: Node.js + Express
- ODM: Mongoose
- Local Mongo URI used by check script: `mongodb://localhost:27017/music-festival-planner`

## Database schema design

### Collections

1. `festivals`
2. `stages`
3. `artists`
4. `performances`

### Validation and constraints implemented

#### Festival (`backend/models/festival.js`)

- `name`: required, trimmed
- `location`: required, trimmed
- `startDate`: required
- `endDate`: required, validated `endDate >= startDate`
- Unique index: `{ name: 1, startDate: 1 }`

#### Stage (`backend/models/stage.js`)

- `festival`: required ObjectId ref to Festival
- `name`: required
- `environment`: enum (`indoor`, `outdoor`, `tent`, `club`)
- `capacity`: numeric min/max validation
- Unique index: `{ festival: 1, name: 1 }`

#### Artist (`backend/models/artist.js`)

- `name`: required, unique
- `genre`: required
- Optional descriptive metadata fields (`description`, `country`, `imageUrl`)

#### Performance (`backend/models/performance.js`)

- Required refs: `festival`, `artist`, `stage`
- Required date range: `startDateTime`, `endDateTime`
- Validation: `endDateTime > startDateTime`
- Pre-validation middleware computes `day` from `startDateTime`
- Query indexes:
  - `{ festival: 1, startDateTime: 1 }`
  - `{ festival: 1, stage: 1, startDateTime: 1 }`
  - `{ artist: 1, startDateTime: 1 }`

## CRUD/API implementation

REST endpoints are implemented through Express route modules:

- `/api/festivals`
- `/api/stages`
- `/api/performances`

These provide list/create/update/delete flows through controller + Mongoose model operations.

## Seed and assignment data generation

Seed script: `backend/scripts/seed.js`

### Safety improvements

- Default seed **does not** wipe existing data if collections are non-empty.
- Destructive reseed requires explicit confirmation:
  - `--reset --confirm WIPE`

### Commands

- Safe check seed: `npm run seed`
- Intentional destructive reseed: `npm run seed:reset`
- Mongo connectivity + counts: `npm run mongo:check`

## Evidence: 100+ documents in database

Verified on **2026-04-15** after `npm run seed:reset` + `npm run mongo:check`:

- festivals: 2
- stages: 8
- artists: 16
- performances: 152
- **Total documents across core collections: 178**

This exceeds the sprint requirement of at least 100 records.

## Challenges encountered and solutions

1. **Accidental destructive seeding risk**
   - Challenge: Previous seed flow wiped collections by default.
   - Solution: Added non-destructive default behavior + explicit reset confirmation token.

2. **Need to consistently exceed 100 records**
   - Challenge: Original static seed generated fewer records.
   - Solution: Added generated performance schedule expansion (curated base + generated slots) to reliably produce 152 performances.

3. **Team environment consistency**
   - Challenge: Different developers may target different DBs (local vs Atlas).
   - Solution: Included clear scripts and DB check command to verify active URI/database and counts.
