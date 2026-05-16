# Music Festival Planner — Architecture Guide

> **Audience:** New team members and contributors
> **Last updated:** 2026-04-14
> **Angular version:** 21.2.x | **Test runner:** Vitest | **CSS framework:** Bootstrap 5 | **Backend:** Node.js/Express + MongoDB

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Folder Structure](#2-folder-structure)
3. [Component Hierarchy](#3-component-hierarchy)
4. [Component Reference](#4-component-reference)
5. [Angular Services](#5-angular-services)
6. [Backend API](#6-backend-api)
7. [Models](#7-models)
8. [Routing](#8-routing)
9. [Module Architecture](#9-module-architecture)
10. [Data Flow](#10-data-flow)
11. [Development Conventions](#11-development-conventions)

---

## 1. Project Overview

Music Festival Planner is a full-stack web application consisting of an **Angular 21 SPA** (frontend) and a **Node.js/Express REST API** (backend) backed by **MongoDB**.

- The Angular app handles all UI, routing, and reactive state. It calls the backend API over HTTP for all festival, stage, and performance data.
- The Express backend exposes a REST API, validates business rules (date ordering, double-booking), and persists data to MongoDB via Mongoose.
- The frontend uses a **NgModule-based** (non-standalone) Angular architecture, Bootstrap 5 for layout, and Vitest for unit testing.

---

## 2. Folder Structure

```
music-festival-planner/
├── backend/                        # Node.js/Express REST API
│   ├── server.js                   # Entry point — middleware, routes, DB connect
│   ├── package.json
│   ├── .env.example                # Template: MONGODB_URI, PORT (copy → .env)
│   ├── .gitignore                  # Excludes node_modules/ and .env
│   ├── models/                     # Mongoose schemas
│   │   ├── Festival.js
│   │   ├── Stage.js
│   │   └── Performance.js
│   ├── controllers/                # Business logic — one file per resource
│   │   ├── festivalController.js
│   │   ├── stageController.js
│   │   └── performanceController.js
│   └── routes/                     # Thin Express routers — path → controller
│       ├── festivals.js
│       ├── stages.js
│       └── performances.js
├── css/                            # All frontend stylesheets (one per component + global)
│   ├── styles.css                  # Global styles (Bootstrap via angular.json)
│   ├── app.css
│   ├── home.css
│   ├── festivals.css
│   ├── festival-create.css
│   ├── my-schedule.css
│   ├── stage-list.css
│   ├── stage-create.css
│   ├── performance-list.css
│   └── performance-create.css
├── images/                         # Static assets served by Angular build
│   ├── favicon.ico
│   ├── festival-logo.svg
│   ├── neon-festival-2023.jpg
│   ├── Lollapalooza-2022.jpg
│   └── 404.html
├── pages/                          # All HTML templates (one per component + shell)
│   ├── index.html                  # Shell HTML — mounts <app-root>
│   ├── app.html                    # Navbar + <router-outlet>
│   ├── home.html
│   ├── festivals.html
│   ├── festival-create.html
│   ├── my-schedule.html
│   ├── stage-list.html
│   ├── stage-create.html
│   ├── performance-list.html
│   └── performance-create.html
├── js/                             # All TypeScript source files
│   ├── main.ts                     # Bootstrap entry point
│   ├── app.ts                      # Root component (App)
│   ├── app-module.ts               # Root NgModule — declares & imports everything
│   ├── app-routing-module.ts       # Route definitions
│   ├── app.spec.ts
│   ├── components/                 # Component logic (flat — one .ts file per view)
│   │   ├── home.ts                 # Landing page
│   │   ├── festivals.ts            # Festival listing (expandable cards)
│   │   ├── festival-create.ts      # Create festival form
│   │   ├── my-schedule.ts          # Timetable view
│   │   ├── stage-list.ts           # Stage management list
│   │   ├── stage-create.ts         # Add stage form
│   │   ├── performance-list.ts     # Performance listing
│   │   └── performance-create.ts   # Add performance form
│   ├── models/
│   │   ├── festival.model.ts       # Festival interface
│   │   ├── stage.model.ts          # Stage interface + StageStatus/StageEnvironment types
│   │   ├── performance.model.ts    # Performance interface
│   │   └── index.ts                # Barrel re-export
│   ├── services/
│   │   ├── festival.service.ts         # HTTP CRUD for festivals
│   │   ├── festival.service.spec.ts
│   │   ├── stage.service.ts            # HTTP CRUD for stages
│   │   ├── stage.service.spec.ts
│   │   ├── schedule.service.ts         # HTTP CRUD for performances + conflict detection
│   │   ├── schedule.service.spec.ts
│   │   └── personal-schedule.service.ts # localStorage — attendee bookmarks only
│   ├── guards/
│   │   ├── admin.guard.ts
│   │   └── auth.guard.ts
│   ├── interceptors/
│   │   └── auth.interceptor.ts
│   └── environments/
│       ├── environment.ts          # Dev config (apiUrl: http://localhost:3000)
│       └── environment.prod.ts     # Prod config (apiUrl: your deployed API)
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
└── App  [selector: app-root]              ← mounted in index.html
    ├── <nav>  (Bootstrap navbar, defined inline in app.html)
    └── <router-outlet>                    ← swaps in routed views
        ├── Home                   [route: /]
        ├── Festivals              [route: /festivals]
        ├── FestivalCreate         [route: /festivals/create]
        ├── MySchedule             [route: /my-schedule]
        ├── MySchedule             [route: /festivals/:id/schedule]
        ├── StageList              [route: /festivals/:id/stages]
        ├── StageCreate            [route: /festivals/:id/stages/new]
        ├── PerformanceList        [route: /festivals/:id/performances]
        └── PerformanceCreate      [route: /festivals/:id/performances/new]
```

**Dependency injection tree (services)**

```
FestivalService   (providedIn: 'root' — singleton)
    └── injected into → Festivals, FestivalCreate, StageList, StageCreate,
                        PerformanceList, PerformanceCreate

StageService      (providedIn: 'root' — singleton)
    └── injected into → Festivals, StageList, StageCreate, PerformanceCreate

ScheduleService   (providedIn: 'root' — singleton, localStorage-backed)
    └── injected into → MySchedule, PerformanceList, PerformanceCreate
```

---

## 4. Component Reference

### 4.1 `App` — Root Shell

| Property       | Value                    |
| -------------- | ------------------------ |
| **File**       | `js/app.ts`              |
| **Selector**   | `app-root`               |
| **Template**   | `app.html`               |
| **Standalone** | `false` (NgModule-based) |

**Purpose:** Provides the persistent navbar and the `<router-outlet>` that all route-level views render into.

**Inputs / Outputs:** None — this is the shell; it has no parent component.

**Internal signals:**

| Signal  | Type             | Description                                                   |
| ------- | ---------------- | ------------------------------------------------------------- |
| `title` | `Signal<string>` | App title (`'music-festival-planner'`). Protected, read-only. |

**Responsibilities:**

- Render the Bootstrap 5 responsive navbar with links to `/`, `/festivals`, and `/my-schedule`.
- Host `<router-outlet>` so the router can swap views without a full page reload.

---

### 4.2 `Home` — Landing Page

| Property       | Value                   |
| -------------- | ----------------------- |
| **File**       | `js/components/home.ts` |
| **Selector**   | `app-home`              |
| **Template**   | `pages/home.html`       |
| **Route**      | `/` (default)           |
| **Standalone** | `false`                 |

**Purpose:** Entry point displayed to users when they first open the app. Welcomes users and provides navigation cues to the main features.

**Inputs / Outputs:** None.

---

### 4.3 `Festivals` — Festival Listing

| Property       | Value                        |
| -------------- | ---------------------------- |
| **File**       | `js/components/festivals.ts` |
| **Selector**   | `app-festivals`              |
| **Template**   | `pages/festivals.html`       |
| **Route**      | `/festivals`                 |
| **Standalone** | `false`                      |

**Purpose:** Displays all music festivals as expandable cards. Each card can be expanded to show its stages and provides links to manage stages and performances.

**Injections:**

| Service           | Usage                                   |
| ----------------- | --------------------------------------- |
| `FestivalService` | Load festival list; delete festivals    |
| `StageService`    | Pre-fetch stages for each festival card |

**Key state:**

| Field                     | Type                      | Description                                        |
| ------------------------- | ------------------------- | -------------------------------------------------- |
| `festivalsList`           | `Festival[]`              | All festivals loaded on init                       |
| `stagesByFestivalId`      | `Record<string, Stage[]>` | Stages pre-fetched per festival for instant expand |
| `expandedFestivalId`      | `string \| null`          | Which festival card is currently expanded          |
| `isOrganizerUser`         | `boolean`                 | Shows organizer actions (stub — no auth yet)       |
| `openKebabMenuFestivalId` | `string \| null`          | Which festival's options menu (⋮) is open          |

**Responsibilities:**

- Render festival cards with expand/collapse toggling (click or keyboard Enter/Space).
- Show per-festival stage list in the expanded panel using pre-fetched `stagesByFestivalId`.
- Provide kebab menu (⋮) with organizer actions: manage stages, add performance.
- Link to `/festivals/create` to add new festivals.

---

### 4.4 `FestivalCreate` — Create Festival Form

| Property       | Value                              |
| -------------- | ---------------------------------- |
| **File**       | `js/components/festival-create.ts` |
| **Selector**   | `app-festival-create`              |
| **Template**   | `pages/festival-create.html`       |
| **Route**      | `/festivals/create`                |
| **Standalone** | `false`                            |

**Purpose:** Reactive form for creating a new festival. Validates required fields and enforces that `endDate >= startDate`.

**Injections:**

| Service/Dep       | Usage                               |
| ----------------- | ----------------------------------- |
| `FormBuilder`     | Build the reactive form group       |
| `FestivalService` | Save the new festival               |
| `Router`          | Navigate to `/festivals` on success |

**Key state:**

| Field                 | Type        | Description                                                      |
| --------------------- | ----------- | ---------------------------------------------------------------- |
| `festivalForm`        | `FormGroup` | Reactive form (name, startDate, endDate, location)               |
| `hasAttemptedSubmit`  | `boolean`   | Enables full error display after first submit attempt            |
| `serviceErrorMessage` | `string`    | Shows service-thrown errors (e.g. date range) in the form banner |

**Validation:**

- `name`, `startDate`, `endDate`, `location` — all required.
- Cross-field group validator: `endDate` must be on or after `startDate`.

---

### 4.5 `MySchedule` — Timetable View

| Property       | Value                                                                                  |
| -------------- | -------------------------------------------------------------------------------------- |
| **File**       | `js/components/my-schedule.ts`                                                         |
| **Selector**   | `app-my-schedule`                                                                      |
| **Template**   | `pages/my-schedule.html`                                                               |
| **Routes**     | `/my-schedule` (standalone, defaults to festival ID "1") and `/festivals/:id/schedule` |
| **Standalone** | `false`                                                                                |

**Purpose:** Interactive timetable grid showing all performances for a festival. Supports day tabs, stage filter, genre filter, and highlights scheduling conflicts.

**Injections:**

| Service/Dep       | Usage                              |
| ----------------- | ---------------------------------- |
| `ActivatedRoute`  | Read `:id` URL param               |
| `ScheduleService` | Load performances for the festival |

**Key state:**

| Field             | Type                          | Description                                             |
| ----------------- | ----------------------------- | ------------------------------------------------------- |
| `festivalId`      | `string`                      | ID from URL param (defaults to `'1'` on `/my-schedule`) |
| `allPerformances` | `Performance[]`               | Full unfiltered list for this festival                  |
| `festivalDays`    | `string[]`                    | Sorted unique dates — one tab button per day            |
| `selectedDay`     | `string`                      | Currently displayed day                                 |
| `selectedStage`   | `string`                      | Active stage filter (`ALL_STAGES` = show all)           |
| `selectedGenre`   | `string`                      | Active genre filter (`ALL_GENRES` = show all)           |
| `stages`          | `string[]`                    | Stage column headers for the visible timetable          |
| `times`           | `string[]`                    | Time row headers, sorted chronologically                |
| `performanceGrid` | `Record<string, Performance>` | O(1) cell lookup keyed by `"startTime-stageName"`       |
| `conflicts`       | `ConflictInfo[]`              | Detected scheduling conflicts on the current day        |

**Responsibilities:**

- Render a grid timetable (stages as columns, time slots as rows).
- Provide day-tab navigation — auto-selects the first day on load.
- Filter timetable by stage and genre; reset filters when the day changes.
- Detect and highlight scheduling conflicts (overlapping time windows on the same stage).

---

### 4.6 `StageList` — Stage Management List

| Property       | Value                         |
| -------------- | ----------------------------- |
| **File**       | `js/components/stage-list.ts` |
| **Selector**   | `app-stage-list`              |
| **Template**   | `pages/stage-list.html`       |
| **Route**      | `/festivals/:id/stages`       |
| **Standalone** | `false`                       |

**Purpose:** Displays all stages belonging to a specific festival. Allows adding and deleting stages.

**Injections:**

| Service/Dep       | Usage                                            |
| ----------------- | ------------------------------------------------ |
| `ActivatedRoute`  | Read `:id` URL param                             |
| `Router`          | Navigate to add-stage form or back to festivals  |
| `StageService`    | Load and delete stages                           |
| `FestivalService` | Look up parent festival name for the page header |

**Key state:**

| Field             | Type                    | Description                  |
| ----------------- | ----------------------- | ---------------------------- |
| `festivalId`      | `string`                | ID from URL param            |
| `currentFestival` | `Festival \| undefined` | Parent festival record       |
| `stageList`       | `Stage[]`               | All stages for this festival |

**Responsibilities:**

- List stage cards with name, capacity, environment, status badge, and notes.
- Delete a stage via a confirm dialog.
- Navigate to `/festivals/:id/stages/new` to add a stage.

---

### 4.7 `StageCreate` — Add Stage Form

| Property       | Value                           |
| -------------- | ------------------------------- |
| **File**       | `js/components/stage-create.ts` |
| **Selector**   | `app-stage-create`              |
| **Template**   | `pages/stage-create.html`       |
| **Route**      | `/festivals/:id/stages/new`     |
| **Standalone** | `false`                         |

**Purpose:** Reactive form for adding a new stage to a festival. Validates capacity as a positive integer and prevents duplicate stage names within the same festival.

**Injections:**

| Service/Dep       | Usage                                       |
| ----------------- | ------------------------------------------- |
| `FormBuilder`     | Build the reactive form group               |
| `ActivatedRoute`  | Read `:id` URL param                        |
| `Router`          | Navigate after save or cancel               |
| `StageService`    | Save the new stage                          |
| `FestivalService` | Look up parent festival for the page header |

**Key state:**

| Field                    | Type                    | Description                                                |
| ------------------------ | ----------------------- | ---------------------------------------------------------- |
| `stageForm`              | `FormGroup`             | Reactive form (name, capacity, environment, status, notes) |
| `hasAttemptedSubmit`     | `boolean`               | Enables full error display after first submit attempt      |
| `serviceErrorMessage`    | `string`                | Service-thrown errors shown in the form banner             |
| `currentFestival`        | `Festival \| undefined` | Parent festival for the page header                        |
| `existingFestivalStages` | `Stage[]`               | Used to detect duplicate names                             |

**Validation:**

- `name`, `capacity`, `environment`, `status` — required.
- `capacity` — must be a positive integer (custom validator).
- `notes` — optional, max 300 characters.
- Duplicate stage names within the same festival are blocked at both the template level (dropdown disables taken options) and in `onSubmit`.

**UX features:**

- Stage name chosen from a fixed dropdown (ensures naming consistency).
- Selecting a stage name auto-fills a suggested capacity (still editable).

---

### 4.8 `PerformanceList` — Performance Listing

| Property       | Value                               |
| -------------- | ----------------------------------- |
| **File**       | `js/components/performance-list.ts` |
| **Selector**   | `app-performance-list`              |
| **Template**   | `pages/performance-list.html`       |
| **Route**      | `/festivals/:id/performances`       |
| **Standalone** | `false`                             |

**Purpose:** Displays all performances for a specific festival, sorted chronologically by date then start time. Allows deleting individual performances or clearing all at once.

**Injections:**

| Service/Dep       | Usage                                                 |
| ----------------- | ----------------------------------------------------- |
| `ActivatedRoute`  | Read `:id` URL param                                  |
| `Router`          | Navigate to add-performance form or back to festivals |
| `ScheduleService` | Load, delete, and clear performances                  |
| `FestivalService` | Look up parent festival for the page header           |

**Key state:**

| Field                | Type                    | Description                                 |
| -------------------- | ----------------------- | ------------------------------------------- |
| `festivalId`         | `string`                | ID from URL param                           |
| `currentFestival`    | `Festival \| undefined` | Parent festival record                      |
| `sortedPerformances` | `Performance[]`         | Performances sorted by date then start time |

**Responsibilities:**

- List performance cards sorted chronologically.
- Delete a single performance via a confirm dialog.
- Clear all performances for this festival via a confirm dialog ("Clear All").
- Navigate to `/festivals/:id/performances/new` to add a performance.

---

### 4.9 `PerformanceCreate` — Add Performance Form

| Property       | Value                                 |
| -------------- | ------------------------------------- |
| **File**       | `js/components/performance-create.ts` |
| **Selector**   | `app-performance-create`              |
| **Template**   | `pages/performance-create.html`       |
| **Route**      | `/festivals/:id/performances/new`     |
| **Standalone** | `false`                               |

**Purpose:** Reactive form for scheduling a new performance on a festival stage. Validates time ordering and detects double-booking conflicts via `ScheduleService`.

**Injections:**

| Service/Dep       | Usage                                              |
| ----------------- | -------------------------------------------------- |
| `FormBuilder`     | Build the reactive form group                      |
| `ActivatedRoute`  | Read `:id` URL param                               |
| `Router`          | Navigate after save or cancel                      |
| `ScheduleService` | Save the new performance (includes conflict check) |
| `StageService`    | Load available stages for the stage dropdown       |
| `FestivalService` | Look up parent festival for the page header        |

**Key state:**

| Field                   | Type        | Description                                                            |
| ----------------------- | ----------- | ---------------------------------------------------------------------- |
| `performanceForm`       | `FormGroup` | Reactive form (artistName, stageName, genre, date, startTime, endTime) |
| `hasAttemptedSubmit`    | `boolean`   | Enables full error display after first submit attempt                  |
| `serviceErrorMessage`   | `string`    | Service-thrown errors (e.g. double-booking) shown in the banner        |
| `availableStages`       | `Stage[]`   | Stages for this festival, populates the stage dropdown                 |
| `artistNamePlaceholder` | `string`    | Randomly selected example placeholder from a pool                      |

**Validation:**

- `artistName`, `stageName`, `date`, `startTime`, `endTime` — required.
- `artistName` — must not be whitespace-only; max 100 characters.
- Cross-field group validator: `endTime` must be strictly after `startTime`.
- `ScheduleService.createPerformance` throws if the stage is already booked during the requested time window.

---

### 4.10 `AppModule` — Root NgModule

| Property | Value                               |
| -------- | ----------------------------------- |
| **File** | `js/app-module.ts`                  |
| **Type** | NgModule (not a rendered component) |

**Purpose:** The Angular root module that wires the whole application together.

**Declarations:**

| Component                    | Role                  |
| ---------------------------- | --------------------- |
| `App`                        | Root shell            |
| `Home`                       | Landing page          |
| `Festivals`                  | Festival listing      |
| `FestivalCreateComponent`    | Create festival form  |
| `MySchedule`                 | Timetable view        |
| `StageListComponent`         | Stage management list |
| `StageCreateComponent`       | Add stage form        |
| `PerformanceListComponent`   | Performance listing   |
| `PerformanceCreateComponent` | Add performance form  |

**Imports:**

| Module                | Why                                                          |
| --------------------- | ------------------------------------------------------------ |
| `BrowserModule`       | Required for browser rendering                               |
| `AppRoutingModule`    | Registers the router with the route table                    |
| `ReactiveFormsModule` | Required by all form components (`FormBuilder`, `FormGroup`) |

**Providers:**

- `provideBrowserGlobalErrorListeners()` — captures unhandled browser errors.

---

## 5. Angular Services

All three data services use `HttpClient` to communicate with the backend API. They maintain an **in-memory cache** so that synchronous read helpers (`getFestivals()`, `getStagesByFestival()`, etc.) can return data after the initial load without additional network requests. Mutation methods return `Observable<T>` and update the cache on success via `tap()`.

`PersonalScheduleService` is the exception — it remains `localStorage`-backed since personal bookmarks are user-device data, not shared festival data.

### Service pattern summary

```
Component ngOnInit()
  └── calls service.load() / service.loadByFestival()   ← HTTP GET
          └── tap() populates in-memory cache
  └── reads cache synchronously for template bindings

Component onSubmit() / confirmAndDelete()
  └── calls service.create() / .delete()                ← HTTP POST/DELETE
          └── tap() updates in-memory cache
          └── subscribe({ next, error }) in component
```

---

### 5.1 `FestivalService`

| Property      | Value                                                 |
| ------------- | ----------------------------------------------------- |
| **File**      | `js/services/festival.service.ts`                     |
| **Scope**     | `providedIn: 'root'` (app-wide singleton)             |
| **Transport** | `HttpClient` → `GET/POST/PATCH/DELETE /api/festivals` |
| **Cache**     | `private cache: Festival[]` — populated by `load()`   |
| **Test file** | `js/services/festival.service.spec.ts`                |

**Public API:**

| Method                       | Returns                  | Description                                                              |
| ---------------------------- | ------------------------ | ------------------------------------------------------------------------ |
| `load()`                     | `Observable<Festival[]>` | Fetches all festivals from the API; populates cache. Call in `ngOnInit`. |
| `getFestivals()`             | `Festival[]`             | Synchronous read from cache.                                             |
| `getFestivalById(id)`        | `Festival \| undefined`  | Synchronous lookup from cache.                                           |
| `createFestival(data)`       | `Observable<Festival>`   | POST to API; appends result to cache on success.                         |
| `updateFestival(id, fields)` | `Observable<Festival>`   | PATCH to API; updates cache entry on success.                            |
| `deleteFestival(id)`         | `Observable<void>`       | DELETE to API; removes from cache on success.                            |

---

### 5.2 `StageService`

| Property      | Value                                                                |
| ------------- | -------------------------------------------------------------------- |
| **File**      | `js/services/stage.service.ts`                                       |
| **Scope**     | `providedIn: 'root'` (app-wide singleton)                            |
| **Transport** | `HttpClient` → `GET/POST/DELETE /api/stages`                         |
| **Cache**     | `private cache: Stage[]` — stores stages across all loaded festivals |
| **Test file** | `js/services/stage.service.spec.ts`                                  |

**Public API:**

| Method                              | Returns               | Description                                                                  |
| ----------------------------------- | --------------------- | ---------------------------------------------------------------------------- |
| `loadByFestival(festivalId)`        | `Observable<Stage[]>` | Fetches stages for a festival; replaces that festival's cache entries.       |
| `getStagesByFestival(festivalId)`   | `Stage[]`             | Synchronous read from cache.                                                 |
| `getStageById(id)`                  | `Stage \| undefined`  | Synchronous lookup from cache.                                               |
| `createStage(data)`                 | `Observable<Stage>`   | POST to API; appends result to cache on success.                             |
| `deleteStage(id)`                   | `Observable<void>`    | DELETE to API; removes from cache on success.                                |
| `clearStagesByFestival(festivalId)` | `Observable<void>`    | DELETE all stages for a festival; clears from cache. Used in cascade delete. |

---

### 5.3 `ScheduleService`

| Property      | Value                                                                                |
| ------------- | ------------------------------------------------------------------------------------ |
| **File**      | `js/services/schedule.service.ts`                                                    |
| **Scope**     | `providedIn: 'root'` (app-wide singleton)                                            |
| **Transport** | `HttpClient` → `GET/POST/DELETE /api/performances`                                   |
| **State**     | Angular `Signal<Performance[]>` — reactive; components use `effect()` to auto-update |
| **Test file** | `js/services/schedule.service.spec.ts`                                               |

**Reactive state:** The service holds a private `performancesState` Signal. Components that use `effect()` referencing `getPerformancesByFestival()` automatically re-render whenever the signal changes (after a load, create, or delete).

**Public API:**

| Method                                    | Returns                     | Description                                                                                           |
| ----------------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------- |
| `loadByFestival(festivalId)`              | `Observable<Performance[]>` | Fetches performances; merges into signal. Call in `ngOnInit`.                                         |
| `getPerformancesByFestival(festivalId)`   | `Performance[]`             | Synchronous read from signal (signal-tracked).                                                        |
| `isStageOccupied(...)`                    | `boolean`                   | Synchronous interval-overlap check against in-memory signal data. Also validated server-side on POST. |
| `createPerformance(data)`                 | `Observable<Performance>`   | Local validation first (fast UX feedback), then POST; appends to signal on success.                   |
| `deletePerformance(id)`                   | `Observable<void>`          | DELETE to API; removes from signal on success.                                                        |
| `clearPerformancesByFestival(festivalId)` | `Observable<void>`          | DELETE all performances for a festival; clears from signal.                                           |

**Also exports:** `LOCAL_STORAGE` InjectionToken (re-exported for `PersonalScheduleService` backward compatibility).

---

### 5.4 `PersonalScheduleService`

| Property    | Value                                         |
| ----------- | --------------------------------------------- |
| **File**    | `js/services/personal-schedule.service.ts`    |
| **Scope**   | `providedIn: 'root'` (app-wide singleton)     |
| **Storage** | `localStorage` (key: `mfp_personal_schedule`) |

**Purpose:** Manages the attendee's personal bookmark list — performances the user has saved to their own timetable. This is purely device-local data so it intentionally stays in `localStorage` rather than the API.

**Public API:**

| Method                                     | Returns                     | Description                                                       |
| ------------------------------------------ | --------------------------- | ----------------------------------------------------------------- |
| `saved$`                                   | `Observable<Performance[]>` | BehaviorSubject stream; components subscribe for live updates     |
| `isSaved(id)`                              | `boolean`                   | Synchronous check                                                 |
| `add(performance)`                         | `void`                      | Adds to personal list                                             |
| `remove(id)`                               | `void`                      | Removes from personal list                                        |
| `toggle(performance)`                      | `void`                      | Adds if not present; removes if present                           |
| `clearAll()`                               | `void`                      | Clears the entire personal list                                   |
| `removePerformancesByFestival(festivalId)` | `void`                      | Removes all bookmarks for a deleted festival                      |
| `getPersonalConflicts()`                   | `PersonalConflict[]`        | Detects time overlaps across all saved performances (cross-stage) |

---

## 6. Backend API

The backend is a Node.js/Express server that connects to MongoDB via Mongoose and exposes a REST API on port `3000` (configurable via `PORT` env var).

### 6.1 Directory layout

```
backend/
├── server.js                  # App entry point
├── db.js                      # mongoose.connect() helper
├── models/                    # Mongoose schemas (all with _id → id transform)
│   ├── Festival.js
│   ├── Stage.js
│   └── Performance.js
├── controllers/               # All business logic and DB queries
│   ├── festivalController.js
│   ├── stageController.js
│   └── performanceController.js
└── routes/                    # Thin routers: path → controller function
    ├── festivals.js
    ├── stages.js
    └── performances.js
```

### 6.2 Environment configuration

| Variable      | Description                                     |
| ------------- | ----------------------------------------------- |
| `MONGODB_URI` | Full MongoDB connection string (local or Atlas) |
| `PORT`        | Port the server listens on (default: `3000`)    |

Copy `.env.example` → `.env` and fill in values. The `.env` file is git-ignored.

### 6.3 API endpoints

All routes are prefixed with `/api`. IDs in responses are strings (MongoDB ObjectId serialised via the `toJSON` transform).

#### Festivals — `/api/festivals`

| Method   | Path                 | Description                                                    |
| -------- | -------------------- | -------------------------------------------------------------- |
| `GET`    | `/api/festivals`     | Returns all festivals sorted by `startDate`                    |
| `GET`    | `/api/festivals/:id` | Returns festival + embedded `stages[]` + `performances[]`      |
| `POST`   | `/api/festivals`     | Creates a festival; validates `endDate >= startDate`           |
| `PATCH`  | `/api/festivals/:id` | Partial update of festival fields                              |
| `DELETE` | `/api/festivals/:id` | Deletes festival + cascade-deletes its stages and performances |

#### Stages — `/api/stages`

| Method   | Path                               | Description                                                                                          |
| -------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `GET`    | `/api/stages?festivalId=<id>`      | Returns all stages for a festival                                                                    |
| `POST`   | `/api/stages`                      | Creates a stage; validates positive-integer capacity and unique name per festival (case-insensitive) |
| `DELETE` | `/api/stages/festival/:festivalId` | Deletes all stages for a festival (cascade helper)                                                   |
| `DELETE` | `/api/stages/:id`                  | Deletes a single stage                                                                               |

#### Performances — `/api/performances`

| Method   | Path                                     | Description                                                                |
| -------- | ---------------------------------------- | -------------------------------------------------------------------------- |
| `GET`    | `/api/performances?festivalId=<id>`      | Returns performances for a festival sorted by date then startTime          |
| `POST`   | `/api/performances`                      | Creates a performance; validates time format, ordering, and double-booking |
| `DELETE` | `/api/performances/festival/:festivalId` | Deletes all performances for a festival (cascade helper)                   |
| `DELETE` | `/api/performances/:id`                  | Deletes a single performance                                               |

> **Route order note:** In both stages and performances routers, the `/festival/:festivalId` route is declared **before** `/:id` to prevent Express from matching the literal string `"festival"` as an ID parameter.

#### Utility

| Method | Path      | Description                                                 |
| ------ | --------- | ----------------------------------------------------------- |
| `GET`  | `/health` | Returns `{ status: "ok" }` — use to verify the server is up |

### 6.4 Mongoose model conventions

All three schemas share the same `toJSON` transform:

```js
toJSON: {
  transform(_doc, ret) {
    ret.id = ret._id.toString();  // rename _id → id
    delete ret._id;
    delete ret.__v;
  }
}
```

This ensures the JSON shape matches the Angular TypeScript interfaces exactly (`id: string` not `_id: ObjectId`).

---

## 7. Models

### 7.1 `Festival`

**File:** `js/models/festival.model.ts`

```typescript
export interface Festival {
  id: string; // Unique identifier (assigned by FestivalService)
  name: string; // Display name of the festival
  startDate: string; // ISO 8601 start date (e.g. "2026-07-15")
  endDate: string; // ISO 8601 end date (e.g. "2026-07-18"); must be >= startDate
  location: string; // City/venue name
  genre?: string; // Optional primary music genre
  capacity?: number; // Optional maximum attendee count across all stages
}
```

---

### 7.2 `Stage`

**File:** `js/models/stage.model.ts`

```typescript
export type StageStatus = 'active' | 'inactive' | 'under-repair';
export type StageEnvironment = 'indoor' | 'outdoor';

export interface Stage {
  id: string; // Unique identifier (assigned by StageService)
  festivalId: string; // References Festival.id
  name: string; // Display name (unique per festival, case-insensitive)
  capacity: number; // Max attendees; must be a positive integer
  environment: StageEnvironment; // 'indoor' | 'outdoor'
  status: StageStatus; // 'active' | 'inactive' | 'under-repair'
  notes?: string; // Optional free-text notes
}
```

---

### 7.3 `Performance`

**File:** `js/models/performance.model.ts`

```typescript
export interface Performance {
  id: string; // Unique identifier (assigned by ScheduleService)
  festivalId: string; // References Festival.id
  artistName: string; // Performing artist or band name
  stageName: string; // References Stage.name
  date: string; // ISO 8601 date (e.g. "2026-08-01")
  startTime: string; // 24-hour time "H:mm" or "HH:mm" (e.g. "9:00", "18:00")
  endTime: string; // 24-hour time; must be after startTime
  genre?: string; // Optional music genre/category
}
```

---

## 8. Routing

### 8.1 Current Routes

**File:** `js/app-routing-module.ts`

| Path                             | Component                    | Description                                        |
| -------------------------------- | ---------------------------- | -------------------------------------------------- |
| `` (empty string)                | `Home`                       | Default landing page                               |
| `festivals`                      | `Festivals`                  | Festival listing (expandable cards)                |
| `festivals/create`               | `FestivalCreateComponent`    | Create a new festival                              |
| `my-schedule`                    | `MySchedule`                 | Standalone timetable (defaults to festival ID "1") |
| `festivals/:id/schedule`         | `MySchedule`                 | Timetable for a specific festival                  |
| `festivals/:id/stages`           | `StageListComponent`         | Stage management for a festival                    |
| `festivals/:id/stages/new`       | `StageCreateComponent`       | Add a stage to a festival                          |
| `festivals/:id/performances`     | `PerformanceListComponent`   | Performance listing for a festival                 |
| `festivals/:id/performances/new` | `PerformanceCreateComponent` | Schedule a new performance                         |

The router is initialized with `RouterModule.forRoot(routes)` and uses the default **HTML5 `pushState`** strategy (`<base href="/">` in `index.html`).

### 8.2 Navigation Hierarchy

```
/                                   ← Home (default)
├── /festivals                      ← Festival listing
│   └── /festivals/create           ← Create new festival
│   └── /festivals/:id/schedule     ← Timetable for festival
│   └── /festivals/:id/stages       ← Stage list for festival
│       └── /festivals/:id/stages/new           ← Add stage
│   └── /festivals/:id/performances ← Performance list for festival
│       └── /festivals/:id/performances/new     ← Add performance
└── /my-schedule                    ← Standalone timetable (festival "1")
```

### 8.3 Planned Routes

| Path                 | Component                  | Description                       |
| -------------------- | -------------------------- | --------------------------------- |
| `festivals/:id`      | `FestivalDetail` (planned) | Detail view for a single festival |
| `festivals/:id/edit` | `FestivalForm` (planned)   | Edit existing festival            |
| `**`                 | `NotFound` (planned)       | 404 catch-all                     |

---

## 9. Module Architecture

```
index.html
  └── <app-root>
        └── AppModule  (bootstrapped in main.ts via platformBrowser)
              ├── BrowserModule
              ├── AppRoutingModule         ──▶  RouterModule.forRoot(routes)
              ├── ReactiveFormsModule
              └── providers: [
                    provideHttpClient(withFetch()),   ← enables HttpClient app-wide
                    provideBrowserGlobalErrorListeners(),
                    { provide: LocationStrategy, useClass: HashLocationStrategy }
                  ]
              └── declarations: [
                    App, Home, Festivals, FestivalCreateComponent,
                    MySchedule, StageListComponent, StageCreateComponent,
                    PerformanceListComponent, PerformanceCreateComponent
                  ]
```

All nine components are **NgModule-declared** (non-standalone). New components generated with `ng generate component` are placed in `js/components/<name>/` by default; move the generated `.html` to `pages/` and `.css` to `css/`, then update the `@Component` decorator paths accordingly. Add the new class to `AppModule.declarations` manually.

---

## 10. Data Flow

### 10.1 Reading Festivals

```
User navigates to /festivals
        │
        ▼
Festivals component (ngOnInit)
        │  calls FestivalService.load()              → GET /api/festivals
        ▼
HTTP response arrives → cache populated
        │  subscribe callback sets festivalsList
        │  calls StageService.loadByFestival(id)     → GET /api/stages?festivalId=...
        │  (one request per festival, run in parallel via forkJoin)
        ▼
Festivals renders expandable cards via *ngFor
```

### 10.2 Creating a Festival

```
User fills in FestivalCreate form → submits
        │
        ▼
FestivalCreateComponent calls FestivalService.createFestival(formData)
        │                                            → POST /api/festivals
        │  backend validates endDate >= startDate
        ▼
201 response → service cache updated via tap()
        │  subscribe next: Router navigates to /festivals
        │  subscribe error: serviceErrorMessage shown in form banner
```

### 10.3 Creating a Performance (with conflict detection)

```
User fills in PerformanceCreate form → submits
        │
        ▼
PerformanceCreateComponent calls ScheduleService.createPerformance(data)
        │  [frontend] validates time format + ordering (immediate UX feedback)
        │  [frontend] isStageOccupied() checks in-memory signal for conflicts
        │  if either check fails → Observable errors immediately (no HTTP call)
        │                                            → POST /api/performances
        │  [backend] re-validates times + runs DB conflict check
        ▼
201 response → performance appended to signal via tap()
        │  effect() in PerformanceList fires → list re-renders
        │  subscribe next: Router navigates to /festivals/:id/performances
        │  subscribe error: serviceErrorMessage shown in form banner
```

### 10.4 Timetable View (MySchedule)

```
User navigates to /festivals/:id/schedule
        │
        ▼
MySchedule (ngOnInit)
        │  calls FestivalService.load()              → GET /api/festivals
        │  calls ScheduleService.loadByFestival(id)  → GET /api/performances?festivalId=...
        ▼
HTTP responses arrive → signal updated
        │  effect() fires → allPerformances refreshed
        │  syncViewStateFromStore() derives unique dates
        │  auto-selects first day
        ▼
applyFilters():
        │  filters by selectedDay + selectedStage + selectedGenre
        │  builds stages[], times[], performanceGrid{}
        │  runs detectConflicts() — O(n²) pairwise overlap check per stage
        ▼
Template renders timetable grid; conflict cells highlighted
```

### 10.5 Cascade Delete (Festival)

```
User clicks Delete on a festival card → confirms dialog
        │
        ▼
PersonalScheduleService.removePerformancesByFestival(id)   (local only)
        │
        ▼
forkJoin([
  ScheduleService.clearPerformancesByFestival(id),   → DELETE /api/performances/festival/:id
  StageService.clearStagesByFestival(id)             → DELETE /api/stages/festival/:id
]).pipe(
  switchMap(() => FestivalService.deleteFestival(id) → DELETE /api/festivals/:id
))                (backend also cascade-deletes as a safety net)
        │
        ▼
subscribe next → loadData() refreshes UI
```

### 10.6 Full-Stack Architecture Diagram

```
  Browser (Angular SPA — port 4200)
  ┌─────────────────────────────────────────────────────┐
  │  AppModule                                          │
  │  ┌─────────────┐  ┌────────────┐  ┌─────────────┐  │
  │  │FestivalSvc  │  │ StageSvc   │  │ScheduleSvc  │  │
  │  │cache:       │  │cache:      │  │signal:      │  │
  │  │Festival[]   │  │Stage[]     │  │Performance[]│  │
  │  └──────┬──────┘  └─────┬──────┘  └──────┬──────┘  │
  │         │               │                │          │
  │         └───────────────┴────────────────┘          │
  │                         │  HttpClient               │
  └─────────────────────────┼───────────────────────────┘
                            │  HTTP (JSON)
  ┌─────────────────────────┼───────────────────────────┐
  │  Express API (port 3000)│                           │
  │  ┌──────────┐  ┌────────┴──┐  ┌────────────────┐   │
  │  │ routes/  │→ │controllers│→ │ Mongoose models │   │
  │  │festivals │  │festivals  │  │ Festival        │   │
  │  │stages    │  │stages     │  │ Stage           │   │
  │  │perfs     │  │perfs      │  │ Performance     │   │
  │  └──────────┘  └───────────┘  └───────┬────────┘   │
  └──────────────────────────────────────┬┴────────────┘
                                         │  Mongoose
  ┌──────────────────────────────────────┴─────────────┐
  │  MongoDB                                           │
  │  collections: festivals · stages · performances   │
  └────────────────────────────────────────────────────┘
```

---

## 11. Development Conventions

### Branch Naming

Following the project's git conventions (see `codeAndBrew/CODING-STANDARDS.md`):

| Type                  | Pattern                            | Example                          |
| --------------------- | ---------------------------------- | -------------------------------- |
| Feature ticket        | `Dem-XX-short-description`         | `Dem-62-CRUD-operations`         |
| Automated/tool branch | `claude/<description>-<sessionId>` | `claude/architecture-docs-e9Hu6` |

### Commit Messages

Start with the ticket ID: `DEM-62: Add FestivalService with CRUD operations`

### Generating New Components

```bash
ng generate component components/<component-name>
```

Then: move the generated `.html` from `js/components/<name>/` to `pages/`, move the `.css` to `css/`, update the `@Component` `templateUrl` and `styleUrl` to point to the new locations, and add the class to `AppModule.declarations` in `js/app-module.ts`.

### Generating New Services

```bash
ng generate service services/<service-name>
```

Services with `providedIn: 'root'` are automatically available app-wide without adding to `AppModule.providers`.

### Running the App Locally

Both the backend and the Angular dev server must be running simultaneously.

```bash
# Terminal 1 — backend API
cd music-festival-planner/backend
cp .env.example .env    # set MONGODB_URI (local or Atlas)
npm install
npm run dev             # nodemon → http://localhost:3000

# Terminal 2 — Angular frontend
cd music-festival-planner
npm install
npm start               # ng serve → http://localhost:4200
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
- Component logic lives in `js/components/<name>.ts`, templates in `pages/<name>.html`, styles in `css/<name>.css`, tests in `js/components/<name>.spec.ts`
