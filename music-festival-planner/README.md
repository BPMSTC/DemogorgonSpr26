# Music Festival Planner

An Angular 21 single-page application for browsing music festivals, managing stages and performances, and viewing a personal timetable.

This project lives inside the `DemogorgonSpr26` repository. All project documentation now lives in `music-festival-planner/docs/`.

> **New team member?** Start with [ARCHITECTURE.md](./docs/ARCHITECTURE.md) for a full overview of the folder structure, components, services, and routing.

---

## Quick Start

The app now requires a running backend API connected to MongoDB.  Start the
backend first, then the Angular dev server.

### 1. Start the backend

```bash
cd music-festival-planner/backend

# Install backend dependencies (first time only)
npm install

# Create your Atlas environment file
cp .env.example .env
# Open .env and set MONGODB_URI to your Atlas connection string.
# Local MongoDB is still available for explicit local-only scripts via backend/.env.local.

# Start with auto-reload (development)
npm run dev

# — or — plain Node (production-like)
npm start
```

The API listens on **<http://localhost:3000>** by default (override with the `PORT` env var).

### 2. Start the Angular app

```bash
cd music-festival-planner

# Install frontend dependencies (first time only)
npm install

# Start dev server (http://localhost:4200)
npm start

# Run unit tests
npm test

# Production build (output → dist/)
npm run build
```

---

## MongoDB Setup (Beginner Friendly)

The Angular app is currently frontend-first. MongoDB setup in this repo lives under `backend/` so you can seed and validate realistic festival data while backend API work is added.

### 1) Prerequisites

- Node.js 20+
- npm
- A running MongoDB instance:
  - Local MongoDB Community Server, or
  - MongoDB Atlas connection string

### 2) Configure environment

Create your local env file from the example:

```powershell
Copy-Item backend/.env.example backend/.env.local
```

Then edit `backend/.env.local` and set:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/music-festival-planner-dev
```

### 3) Seed the database (repeatable)

```bash
npm run seed
```

What this does:

- Connects to MongoDB using `MONGODB_URI`
- Clears existing seed collections
- Inserts data in order: festivals -> stages/artists -> performances
- Produces deterministic dataset shape on every run

### 4) Verify connection and counts

```bash
npm run mongo:check
```

This checks connectivity and prints document counts for each collection.

### 5) Optional manual checks in mongosh

```javascript
use('music-festival-planner-dev');
db.festivals.countDocuments();
db.stages.countDocuments();
db.artists.countDocuments();
db.performances.countDocuments();
```

Expected minimum seeded shape:

- 2 festivals
- 3-5 stages per festival (8 total)
- 15+ artists (16 total)
- 30+ performances across multiple days (32 total)

### MongoDB collection/model map

- `festivals` -> `backend/models/festival.js`
- `stages` -> `backend/models/stage.js`
- `artists` -> `backend/models/artist.js`
- `performances` -> `backend/models/performance.js`

`performances` stores these required references and fields:

- `festival` (ObjectId ref)
- `artist` (ObjectId ref)
- `stage` (ObjectId ref)
- `startDateTime`
- `endDateTime`
- `day` (derived automatically from `startDateTime`)

---

## Tech Stack

### Frontend

| Tool | Version | Purpose |
|---|---|---|
| Angular | 21.2.x | Framework |
| TypeScript | ~5.9.x | Language |
| Bootstrap | 5.3.x | UI / layout |
| Vitest | 4.x | Unit testing |
| Angular CLI | 21.2.x | Scaffolding & build |

### Backend

| Tool | Version | Purpose |
|---|---|---|
| Node.js | ≥18 | Runtime |
| Express | 4.x | HTTP server |
| Mongoose | 8.x | MongoDB ODM |
| dotenv | 16.x | Environment config |

---

## Features

- Browse festivals as expandable cards with stage previews
- Create new festivals via a validated reactive form
- Manage stages per festival (add, delete; pre-seeded demo data for festival 1)
- Schedule performances per festival with double-booking conflict detection
- Timetable view with day tabs, stage/genre filters, and conflict highlighting
- Festival, stage, and performance data stored in MongoDB via a Node.js/Express REST API
- Personal "My Schedule" bookmarks still persisted locally via `localStorage`

---

## Documentation Index

- Architecture guide: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- GitHub Pages deployment plan: [docs/GITHUB_PAGES_WORKFLOW_PLAN.md](./docs/GITHUB_PAGES_WORKFLOW_PLAN.md)
- Person A walkthrough: [docs/PERSON-A-WALKTHROUGH.md](./docs/PERSON-A-WALKTHROUGH.md)
- Person B walkthrough: [docs/PERSON-B-WALKTHROUGH.md](./docs/PERSON-B-WALKTHROUGH.md)
- DEM-64 full change documentation: [docs/DEM-64_FULL_CHANGE_DOCUMENTATION.md](./docs/DEM-64_FULL_CHANGE_DOCUMENTATION.md)
- Sprint 2–3 technical debt backlog: [docs/TECH_DEBT_SPRINT2_BACKLOG.md](./docs/TECH_DEBT_SPRINT2_BACKLOG.md)

---

## Project Structure (summary)

```
src/app/
├── app-module.ts               # Root NgModule
├── app-routing-module.ts       # Route definitions
├── app.ts / app.html           # Root shell + navbar
├── components/
│   ├── home/                   # Landing page  (/)
│   ├── festivals/              # Festival listing  (/festivals)
│   ├── festival-create/        # Create festival form  (/festivals/create)
│   ├── my-schedule/            # Timetable view  (/my-schedule, /festivals/:id/schedule)
│   ├── stage-list/             # Stage management  (/festivals/:id/stages)
│   ├── stage-create/           # Add stage form  (/festivals/:id/stages/new)
│   ├── performance-list/       # Performance list  (/festivals/:id/performances)
│   └── performance-create/     # Add performance form  (/festivals/:id/performances/new)
├── models/
│   ├── festival.model.ts       # Festival interface
│   ├── stage.model.ts          # Stage interface + StageStatus/StageEnvironment types
│   ├── performance.model.ts    # Performance interface
│   └── index.ts                # Barrel re-export
└── services/
    ├── festival.service.ts     # In-memory CRUD for festivals
    ├── stage.service.ts        # In-memory CRUD for stages (demo data pre-seeded)
    └── schedule.service.ts     # localStorage-backed CRUD for performances + conflict detection
```

See [ARCHITECTURE.md](./docs/ARCHITECTURE.md) for full details including component inputs/outputs, service API, data flow diagrams, and planned routes.

---

## Generating Code

```bash
# New component (add to AppModule.declarations afterward)
ng generate component components/<name>

# New service (providedIn: 'root' by default)
ng generate service services/<name>
```

---

## Additional Resources

- GitHub Pages deployment plan (pre-workflow): [GITHUB_PAGES_WORKFLOW_PLAN.md](./docs/GITHUB_PAGES_WORKFLOW_PLAN.md)
- [Angular CLI documentation](https://angular.dev/tools/cli)
- [Angular 21 docs](https://angular.dev)
- [Bootstrap 5 docs](https://getbootstrap.com/docs/5.3/)
- Project coding standards: `codeAndBrew/CODING-STANDARDS.md`
