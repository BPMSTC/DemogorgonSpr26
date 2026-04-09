# Music Festival Planner

An Angular 21 single-page application for browsing music festivals, managing stages and performances, and viewing a personal timetable.

> **New team member?** Start with [ARCHITECTURE.md](./ARCHITECTURE.md) for a full overview of the folder structure, components, services, and routing.

---

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:4200)
npm start

# Run unit tests
npm test

# Production build (output → dist/)
npm run build
```

---

## Tech Stack

| Tool | Version | Purpose |
|---|---|---|
| Angular | 21.2.x | Framework |
| TypeScript | ~5.9.x | Language |
| Bootstrap | 5.3.x | UI / layout |
| Vitest | 4.x | Unit testing |
| Angular CLI | 21.2.x | Scaffolding & build |

---

## Features

- Browse festivals as expandable cards with stage previews
- Create new festivals via a validated reactive form
- Manage stages per festival (add, delete; pre-seeded demo data for festival 1)
- Schedule performances per festival with double-booking conflict detection
- Timetable view with day tabs, stage/genre filters, and conflict highlighting
- Performance data persists across page refreshes via `localStorage`

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

See [ARCHITECTURE.md](./ARCHITECTURE.md) for full details including component inputs/outputs, service API, data flow diagrams, and planned routes.

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

- GitHub Pages deployment plan (pre-workflow): [GITHUB_PAGES_WORKFLOW_PLAN.md](./GITHUB_PAGES_WORKFLOW_PLAN.md)
- [Angular CLI documentation](https://angular.dev/tools/cli)
- [Angular 21 docs](https://angular.dev)
- [Bootstrap 5 docs](https://getbootstrap.com/docs/5.3/)
- Project coding standards: `codeAndBrew/CODING-STANDARDS.md`
