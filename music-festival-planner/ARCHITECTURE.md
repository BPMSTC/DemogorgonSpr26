# Music Festival Planner — Architecture Guide

> **Audience:** New team members and contributors
> **Last updated:** 2026-03-08
> **Angular version:** 21.2.x | **Test runner:** Vitest | **CSS framework:** Bootstrap 5

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Folder Structure](#2-folder-structure)
3. [Component Hierarchy](#3-component-hierarchy)
4. [Component Reference](#4-component-reference)
5. [Services](#5-services)
6. [Models](#6-models)
7. [Routing](#7-routing)
8. [Module Architecture](#8-module-architecture)
9. [Data Flow](#9-data-flow)
10. [Development Conventions](#10-development-conventions)

---

## 1. Project Overview

Music Festival Planner is an Angular 21 single-page application that lets users browse festivals and manage a personal schedule. The app uses a **NgModule-based** (non-standalone) architecture, Bootstrap 5 for layout and components, and Vitest for unit testing.

---

## 2. Folder Structure

```
music-festival-planner/
├── public/
│   └── favicon.ico
├── src/
│   ├── index.html              # Shell HTML — mounts <app-root>
│   ├── main.ts                 # Bootstrap entry — calls platformBrowser().bootstrapModule(AppModule)
│   ├── styles.css              # Global styles (Bootstrap imported via angular.json)
│   └── app/
│       ├── app-module.ts       # Root NgModule — declares & imports everything
│       ├── app-routing-module.ts  # Route definitions
│       ├── app.ts              # Root component (App)
│       ├── app.html            # Navbar + <router-outlet>
│       ├── app.css             # Root component styles
│       ├── app.spec.ts         # Root component tests
│       ├── components/
│       │   ├── home/           # Landing page component
│       │   ├── festivals/      # Festival listing component
│       │   └── my-schedule/    # User schedule component
│       ├── models/
│       │   └── festival.model.ts   # Festival interface
│       └── services/
│           ├── festival.service.ts       # CRUD service for festivals
│           └── festival.service.spec.ts  # Service unit tests
├── angular.json                # Angular CLI config (build, serve, test)
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.spec.json
├── .prettierrc
└── .editorconfig
```

---

## 3. Component Hierarchy

```
AppModule (bootstraps)
└── App  [selector: app-root]          ← mounted in index.html
    ├── <nav>  (Bootstrap navbar, defined inline in app.html)
    └── <router-outlet>                ← swaps in routed views
        ├── Home               [route: /]
        ├── Festivals          [route: /festivals]
        ├── FestivalCreate     [route: /festivals/create]
        └── MySchedule         [route: /my-schedule]
```

**Dependency injection tree (services)**

```
FestivalService  (providedIn: 'root' — singleton across the app)
    └── injected into → Festivals, MySchedule (planned)
```

---

## 4. Component Reference

### 4.1 `App` — Root Shell

| Property | Value |
|---|---|
| **File** | `src/app/app.ts` |
| **Selector** | `app-root` |
| **Template** | `app.html` |
| **Standalone** | `false` (NgModule-based) |

**Purpose:** Provides the persistent navbar and the `<router-outlet>` that all route-level views render into.

**Inputs / Outputs:** None — this is the shell; it has no parent component.

**Internal signals:**

| Signal | Type | Description |
|---|---|---|
| `title` | `Signal<string>` | App title (`'music-festival-planner'`). Protected, read-only. |

**Responsibilities:**
- Render the Bootstrap 5 responsive navbar with links to `/`, `/festivals`, and `/my-schedule`.
- Host `<router-outlet>` so the router can swap views without a full page reload.

---

### 4.2 `Home` — Landing Page

| Property | Value |
|---|---|
| **File** | `src/app/components/home/home.ts` |
| **Selector** | `app-home` |
| **Template** | `components/home/home.html` |
| **Route** | `/` (default) |
| **Standalone** | `false` |

**Purpose:** Entry point displayed to users when they first open the app. Intended to welcome users and provide navigation cues to the main features.

**Inputs / Outputs:** None currently.

**Responsibilities:**
- Display a welcoming landing view.
- (Planned) Surface summary statistics — upcoming festivals count, scheduled events, etc.

---

### 4.3 `Festivals` — Festival Listing

| Property | Value |
|---|---|
| **File** | `src/app/components/festivals/festivals.ts` |
| **Selector** | `app-festivals` |
| **Template** | `components/festivals/festivals.html` |
| **Route** | `/festivals` |
| **Standalone** | `false` |

**Purpose:** Displays the list of available music festivals. This view will be the primary consumer of `FestivalService` for read and write operations.

**Inputs / Outputs:** None currently.

**Planned injections:**

| Service | Usage |
|---|---|
| `FestivalService` | Load, create, update, delete festivals |

**Responsibilities:**
- (Planned) Render a list/grid of `Festival` objects retrieved from `FestivalService`.
- (Planned) Provide UI to add, edit, and delete festivals (CRUD).
- (Planned) Support filtering/sorting by genre, date, or location.

---

### 4.4 `MySchedule` — Personal Schedule

| Property | Value |
|---|---|
| **File** | `src/app/components/my-schedule/my-schedule.ts` |
| **Selector** | `app-my-schedule` |
| **Template** | `components/my-schedule/my-schedule.html` |
| **Route** | `/my-schedule` |
| **Standalone** | `false` |

**Purpose:** Allows users to view and manage their personal festival schedule — adding festivals they plan to attend.

**Inputs / Outputs:** None currently.

**Planned injections:**

| Service | Usage |
|---|---|
| `FestivalService` | Look up festival details by ID |

**Responsibilities:**
- (Planned) Render the user's saved/scheduled festivals.
- (Planned) Let users remove festivals from their schedule.
- (Planned) Show date-ordered schedule view.

---

### 4.5 `AppModule` — Root NgModule

| Property | Value |
|---|---|
| **File** | `src/app/app-module.ts` |
| **Type** | NgModule (not a rendered component) |

**Purpose:** The Angular root module that wires the whole application together. It declares all components, imports `BrowserModule` and `AppRoutingModule`, and bootstraps the `App` component.

**Declarations:**

| Component | Role |
|---|---|
| `App` | Root shell |
| `Home` | Landing page |
| `Festivals` | Festival listing |
| `MySchedule` | Personal schedule |

**Imports:**

| Module | Why |
|---|---|
| `BrowserModule` | Required for browser rendering |
| `AppRoutingModule` | Registers the router with the route table |

**Providers:**
- `provideBrowserGlobalErrorListeners()` — captures unhandled browser errors.

---

## 5. Services

### 5.1 `FestivalService`

| Property | Value |
|---|---|
| **File** | `src/app/services/festival.service.ts` |
| **Scope** | `providedIn: 'root'` (app-wide singleton) |
| **Test file** | `src/app/services/festival.service.spec.ts` |

**Purpose:** Provides in-memory CRUD operations for `Festival` objects. Acts as the single source of truth for festival data within the running app.

**Internal state:**

| Field | Type | Description |
|---|---|---|
| `festivals` | `Festival[]` | Private in-memory list of all festivals |
| `nextId` | `number` | Auto-incrementing ID counter, starts at `1` |

**Public API:**

| Method | Signature | Returns | Description |
|---|---|---|---|
| `getFestivals` | `(): Festival[]` | `Festival[]` | Returns an array of **independent copies** (each element spread) |
| `getFestivalById` | `(id: string): Festival \| undefined` | `Festival \| undefined` | Returns a copy of the matching festival, or `undefined` |
| `createFestival` | `(data: Omit<Festival, 'id'>): Festival` | `Festival` | Creates a new festival, assigns the next ID, returns a copy |
| `updateFestival` | `(id: string, updates: Partial<Omit<Festival, 'id'>>): Festival \| null` | `Festival \| null` | Merges updates into the matching festival; returns `null` if not found |
| `deleteFestival` | `(id: string): boolean` | `boolean` | Removes a festival by ID; returns `true` on success, `false` if not found |

**Data flow:**

```
Component (Festivals / MySchedule)
  │  calls getFestivals() / createFestival() / etc.
  ▼
FestivalService  ──(mutates)──▶  private festivals[]
  │  returns copy
  ▼
Component updates its local view
```

> **Note:** The service returns copies (`this.festivals.map(f => ({ ...f }))` and `{ ...found }`) so external code cannot mutate the internal list or its elements directly. All `Festival` fields are primitives (`string`/`number`), so a shallow spread is a full copy. Future work may replace the in-memory array with HTTP calls or a state management library.

---

## 6. Models

### 6.1 `Festival`

**File:** `src/app/models/festival.model.ts`

```typescript
export interface Festival {
  id: string;         // Unique identifier (assigned by FestivalService)
  name: string;       // Display name of the festival
  startDate: string;  // ISO 8601 start date string (e.g. "2026-07-15")
  endDate: string;    // ISO 8601 end date string (e.g. "2026-07-18")
  location: string;   // City/venue name
  genre?: string;     // Optional primary music genre
  capacity?: number;  // Optional maximum attendee count
}
```

---

## 7. Routing

### 7.1 Current Routes

**File:** `src/app/app-routing-module.ts`

| Path | Component | Description |
|---|---|---|
| `` (empty string) | `Home` | Default landing page |
| `festivals` | `Festivals` | Festival listing and management |
| `festivals/create` | `FestivalCreate` | Create a new festival |
| `my-schedule` | `MySchedule` | Personal schedule view |

The router is initialized with `RouterModule.forRoot(routes)` and uses the default **HTML5 `pushState`** strategy (`<base href="/">` in `index.html`).

### 7.2 Navigation Hierarchy

```
/                        ← Home (default)
├── /festivals           ← Festival listing
│   └── /festivals/create  ← Create new festival
└── /my-schedule         ← Personal schedule
```

### 7.3 Planned Routes

| Path | Component | Description |
|---|---|---|
| `festivals/:id` | `FestivalDetail` (planned) | Detail view for a single festival |
| `festivals/new` | `FestivalForm` (planned) | Create new festival form |
| `festivals/:id/edit` | `FestivalForm` (planned) | Edit existing festival |
| `**` | `NotFound` (planned) | 404 catch-all |

---

## 8. Module Architecture

```
index.html
  └── <app-root>
        └── AppModule  (bootstrapped in main.ts via platformBrowser)
              ├── BrowserModule
              ├── AppRoutingModule  ──▶  RouterModule.forRoot(routes)
              └── declarations: [App, Home, Festivals, MySchedule]
```

All four components are **NgModule-declared** (non-standalone). New components generated with `ng generate component` are automatically placed in `src/app/components/<name>/` and must be manually added to `AppModule.declarations`.

---

## 9. Data Flow

### 9.1 Reading Festivals

```
User navigates to /festivals
        │
        ▼
Festivals component (ngOnInit planned)
        │  calls FestivalService.getFestivals()
        ▼
FestivalService  returns Festival[]  (copy)
        │
        ▼
Festivals renders list via *ngFor
```

### 9.2 Creating a Festival

```
User fills in form → submits
        │
        ▼
Festivals component calls FestivalService.createFestival(formData)
        │
        ▼
FestivalService assigns ID, pushes to internal array, returns copy
        │
        ▼
Festivals refreshes its local list via getFestivals()
```

### 9.3 Component Interaction Diagram

```
┌───────────────────────────────────────────────┐
│                   AppModule                   │
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │               App (Shell)               │  │
│  │  ┌──────────────────────────────────┐   │  │
│  │  │         Bootstrap Navbar         │   │  │
│  │  │  [Home] [Festivals] [My Schedule] │   │  │
│  │  └──────────────────────────────────┘   │  │
│  │  ┌──────────────────────────────────┐   │  │
│  │  │         <router-outlet>          │   │  │
│  │  │  ┌──────────────────────────┐    │   │  │
│  │  │  │  Home / Festivals /      │    │   │  │
│  │  │  │  MySchedule              │    │   │  │
│  │  │  │  (one rendered at a time)│    │   │  │
│  │  │  └──────────────────────────┘    │   │  │
│  │  └──────────────────────────────────┘   │  │
│  └─────────────────────────────────────────┘  │
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │  FestivalService  (root singleton)      │  │
│  │  festivals: Festival[]  (in-memory)     │  │
│  │  CRUD methods available app-wide        │  │
│  └─────────────────────────────────────────┘  │
└───────────────────────────────────────────────┘
```

---

## 10. Development Conventions

### Branch Naming
Following the project's git conventions (see `codeAndBrew/CODING-STANDARDS.md`):

| Type | Pattern | Example |
|---|---|---|
| Feature ticket | `Dem-XX-short-description` | `Dem-62-CRUD-operations` |
| Automated/tool branch | `claude/<description>-<sessionId>` | `claude/architecture-docs-e9Hu6` |

### Commit Messages
Start with the ticket ID: `DEM-62: Add FestivalService with CRUD operations`

### Generating New Components
```bash
ng generate component components/<component-name>
```
Then add the new class to `AppModule.declarations` in `src/app/app-module.ts`.

### Generating New Services
```bash
ng generate service services/<service-name>
```
Services with `providedIn: 'root'` are automatically available app-wide without adding to `AppModule.providers`.

### Running the App Locally
```bash
cd music-festival-planner
npm install
npm start          # ng serve → http://localhost:4200
```

### Running Tests
```bash
npm test           # ng test (Vitest)
```

### Building for Production
```bash
npm run build      # output in dist/music-festival-planner/
```

### Code Style
- **TypeScript** — strict mode, no implicit `any`
- **Prettier** — config in `.prettierrc`, run `npx prettier --write .` before committing
- **Component selectors** — prefix `app-` (enforced by `angular.json` schematic prefix)
- All component files live in `src/app/components/<name>/` with four files: `.ts`, `.html`, `.css`, `.spec.ts`
