# Music Festival Planner — Architecture Guide

> **Audience:** New team members and contributors
> **Last updated:** 2026-03-31
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

Music Festival Planner is an Angular 21 single-page application that lets users browse festivals, manage stages, schedule performances, and view a personal timetable. The app uses a **NgModule-based** (non-standalone) architecture, Bootstrap 5 for layout and components, and Vitest for unit testing.

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
│       │   ├── home/                   # Landing page component
│       │   ├── festivals/              # Festival listing component (expandable cards)
│       │   ├── festival-create/        # Create festival form component
│       │   ├── my-schedule/            # Timetable view component
│       │   ├── stage-list/             # Stage management list component
│       │   ├── stage-create/           # Add stage form component
│       │   ├── performance-list/       # Performance listing component
│       │   └── performance-create/     # Add performance form component
│       ├── models/
│       │   ├── festival.model.ts       # Festival interface
│       │   ├── stage.model.ts          # Stage interface + StageStatus/StageEnvironment types
│       │   ├── performance.model.ts    # Performance interface
│       │   └── index.ts                # Barrel re-export
│       └── services/
│           ├── festival.service.ts       # CRUD service for festivals
│           ├── festival.service.spec.ts  # Festival service unit tests
│           ├── stage.service.ts          # CRUD service for stages
│           ├── stage.service.spec.ts     # Stage service unit tests
│           ├── schedule.service.ts       # localStorage-backed CRUD for performances
│           └── schedule.service.spec.ts  # Schedule service unit tests
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

**Purpose:** Entry point displayed to users when they first open the app. Welcomes users and provides navigation cues to the main features.

**Inputs / Outputs:** None.

---

### 4.3 `Festivals` — Festival Listing

| Property | Value |
|---|---|
| **File** | `src/app/components/festivals/festivals.ts` |
| **Selector** | `app-festivals` |
| **Template** | `components/festivals/festivals.html` |
| **Route** | `/festivals` |
| **Standalone** | `false` |

**Purpose:** Displays all music festivals as expandable cards. Each card can be expanded to show its stages and provides links to manage stages and performances.

**Injections:**

| Service | Usage |
|---|---|
| `FestivalService` | Load festival list; delete festivals |
| `StageService` | Pre-fetch stages for each festival card |

**Key state:**

| Field | Type | Description |
|---|---|---|
| `festivalsList` | `Festival[]` | All festivals loaded on init |
| `stagesByFestivalId` | `Record<string, Stage[]>` | Stages pre-fetched per festival for instant expand |
| `expandedFestivalId` | `string \| null` | Which festival card is currently expanded |
| `isOrganizerUser` | `boolean` | Shows organizer actions (stub — no auth yet) |
| `openKebabMenuFestivalId` | `string \| null` | Which festival's options menu (⋮) is open |

**Responsibilities:**
- Render festival cards with expand/collapse toggling (click or keyboard Enter/Space).
- Show per-festival stage list in the expanded panel using pre-fetched `stagesByFestivalId`.
- Provide kebab menu (⋮) with organizer actions: manage stages, add performance.
- Link to `/festivals/create` to add new festivals.

---

### 4.4 `FestivalCreate` — Create Festival Form

| Property | Value |
|---|---|
| **File** | `src/app/components/festival-create/festival-create.ts` |
| **Selector** | `app-festival-create` |
| **Template** | `components/festival-create/festival-create.html` |
| **Route** | `/festivals/create` |
| **Standalone** | `false` |

**Purpose:** Reactive form for creating a new festival. Validates required fields and enforces that `endDate >= startDate`.

**Injections:**

| Service/Dep | Usage |
|---|---|
| `FormBuilder` | Build the reactive form group |
| `FestivalService` | Save the new festival |
| `Router` | Navigate to `/festivals` on success |

**Key state:**

| Field | Type | Description |
|---|---|---|
| `festivalForm` | `FormGroup` | Reactive form (name, startDate, endDate, location) |
| `hasAttemptedSubmit` | `boolean` | Enables full error display after first submit attempt |
| `serviceErrorMessage` | `string` | Shows service-thrown errors (e.g. date range) in the form banner |

**Validation:**

- `name`, `startDate`, `endDate`, `location` — all required.
- Cross-field group validator: `endDate` must be on or after `startDate`.

---

### 4.5 `MySchedule` — Timetable View

| Property | Value |
|---|---|
| **File** | `src/app/components/my-schedule/my-schedule.ts` |
| **Selector** | `app-my-schedule` |
| **Template** | `components/my-schedule/my-schedule.html` |
| **Routes** | `/my-schedule` (standalone, defaults to festival ID "1") and `/festivals/:id/schedule` |
| **Standalone** | `false` |

**Purpose:** Interactive timetable grid showing all performances for a festival. Supports day tabs, stage filter, genre filter, and highlights scheduling conflicts.

**Injections:**

| Service/Dep | Usage |
|---|---|
| `ActivatedRoute` | Read `:id` URL param |
| `ScheduleService` | Load performances for the festival |

**Key state:**

| Field | Type | Description |
|---|---|---|
| `festivalId` | `string` | ID from URL param (defaults to `'1'` on `/my-schedule`) |
| `allPerformances` | `Performance[]` | Full unfiltered list for this festival |
| `festivalDays` | `string[]` | Sorted unique dates — one tab button per day |
| `selectedDay` | `string` | Currently displayed day |
| `selectedStage` | `string` | Active stage filter (`ALL_STAGES` = show all) |
| `selectedGenre` | `string` | Active genre filter (`ALL_GENRES` = show all) |
| `stages` | `string[]` | Stage column headers for the visible timetable |
| `times` | `string[]` | Time row headers, sorted chronologically |
| `performanceGrid` | `Record<string, Performance>` | O(1) cell lookup keyed by `"startTime-stageName"` |
| `conflicts` | `ConflictInfo[]` | Detected scheduling conflicts on the current day |

**Responsibilities:**

- Render a grid timetable (stages as columns, time slots as rows).
- Provide day-tab navigation — auto-selects the first day on load.
- Filter timetable by stage and genre; reset filters when the day changes.
- Detect and highlight scheduling conflicts (overlapping time windows on the same stage).

---

### 4.6 `StageList` — Stage Management List

| Property | Value |
|---|---|
| **File** | `src/app/components/stage-list/stage-list.ts` |
| **Selector** | `app-stage-list` |
| **Template** | `components/stage-list/stage-list.html` |
| **Route** | `/festivals/:id/stages` |
| **Standalone** | `false` |

**Purpose:** Displays all stages belonging to a specific festival. Allows adding and deleting stages.

**Injections:**

| Service/Dep | Usage |
|---|---|
| `ActivatedRoute` | Read `:id` URL param |
| `Router` | Navigate to add-stage form or back to festivals |
| `StageService` | Load and delete stages |
| `FestivalService` | Look up parent festival name for the page header |

**Key state:**

| Field | Type | Description |
|---|---|---|
| `festivalId` | `string` | ID from URL param |
| `currentFestival` | `Festival \| undefined` | Parent festival record |
| `stageList` | `Stage[]` | All stages for this festival |

**Responsibilities:**
- List stage cards with name, capacity, environment, status badge, and notes.
- Delete a stage via a confirm dialog.
- Navigate to `/festivals/:id/stages/new` to add a stage.

---

### 4.7 `StageCreate` — Add Stage Form

| Property | Value |
|---|---|
| **File** | `src/app/components/stage-create/stage-create.ts` |
| **Selector** | `app-stage-create` |
| **Template** | `components/stage-create/stage-create.html` |
| **Route** | `/festivals/:id/stages/new` |
| **Standalone** | `false` |

**Purpose:** Reactive form for adding a new stage to a festival. Validates capacity as a positive integer and prevents duplicate stage names within the same festival.

**Injections:**

| Service/Dep | Usage |
|---|---|
| `FormBuilder` | Build the reactive form group |
| `ActivatedRoute` | Read `:id` URL param |
| `Router` | Navigate after save or cancel |
| `StageService` | Save the new stage |
| `FestivalService` | Look up parent festival for the page header |

**Key state:**

| Field | Type | Description |
|---|---|---|
| `stageForm` | `FormGroup` | Reactive form (name, capacity, environment, status, notes) |
| `hasAttemptedSubmit` | `boolean` | Enables full error display after first submit attempt |
| `serviceErrorMessage` | `string` | Service-thrown errors shown in the form banner |
| `currentFestival` | `Festival \| undefined` | Parent festival for the page header |
| `existingFestivalStages` | `Stage[]` | Used to detect duplicate names |

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

| Property | Value |
|---|---|
| **File** | `src/app/components/performance-list/performance-list.ts` |
| **Selector** | `app-performance-list` |
| **Template** | `components/performance-list/performance-list.html` |
| **Route** | `/festivals/:id/performances` |
| **Standalone** | `false` |

**Purpose:** Displays all performances for a specific festival, sorted chronologically by date then start time. Allows deleting individual performances or clearing all at once.

**Injections:**

| Service/Dep | Usage |
|---|---|
| `ActivatedRoute` | Read `:id` URL param |
| `Router` | Navigate to add-performance form or back to festivals |
| `ScheduleService` | Load, delete, and clear performances |
| `FestivalService` | Look up parent festival for the page header |

**Key state:**

| Field | Type | Description |
|---|---|---|
| `festivalId` | `string` | ID from URL param |
| `currentFestival` | `Festival \| undefined` | Parent festival record |
| `sortedPerformances` | `Performance[]` | Performances sorted by date then start time |

**Responsibilities:**

- List performance cards sorted chronologically.
- Delete a single performance via a confirm dialog.
- Clear all performances for this festival via a confirm dialog ("Clear All").
- Navigate to `/festivals/:id/performances/new` to add a performance.

---

### 4.9 `PerformanceCreate` — Add Performance Form

| Property | Value |
|---|---|
| **File** | `src/app/components/performance-create/performance-create.ts` |
| **Selector** | `app-performance-create` |
| **Template** | `components/performance-create/performance-create.html` |
| **Route** | `/festivals/:id/performances/new` |
| **Standalone** | `false` |

**Purpose:** Reactive form for scheduling a new performance on a festival stage. Validates time ordering and detects double-booking conflicts via `ScheduleService`.

**Injections:**

| Service/Dep | Usage |
|---|---|
| `FormBuilder` | Build the reactive form group |
| `ActivatedRoute` | Read `:id` URL param |
| `Router` | Navigate after save or cancel |
| `ScheduleService` | Save the new performance (includes conflict check) |
| `StageService` | Load available stages for the stage dropdown |
| `FestivalService` | Look up parent festival for the page header |

**Key state:**

| Field | Type | Description |
|---|---|---|
| `performanceForm` | `FormGroup` | Reactive form (artistName, stageName, genre, date, startTime, endTime) |
| `hasAttemptedSubmit` | `boolean` | Enables full error display after first submit attempt |
| `serviceErrorMessage` | `string` | Service-thrown errors (e.g. double-booking) shown in the banner |
| `availableStages` | `Stage[]` | Stages for this festival, populates the stage dropdown |
| `artistNamePlaceholder` | `string` | Randomly selected example placeholder from a pool |

**Validation:**

- `artistName`, `stageName`, `date`, `startTime`, `endTime` — required.
- `artistName` — must not be whitespace-only; max 100 characters.
- Cross-field group validator: `endTime` must be strictly after `startTime`.
- `ScheduleService.createPerformance` throws if the stage is already booked during the requested time window.

---

### 4.10 `AppModule` — Root NgModule

| Property | Value |
|---|---|
| **File** | `src/app/app-module.ts` |
| **Type** | NgModule (not a rendered component) |

**Purpose:** The Angular root module that wires the whole application together.

**Declarations:**

| Component | Role |
|---|---|
| `App` | Root shell |
| `Home` | Landing page |
| `Festivals` | Festival listing |
| `FestivalCreateComponent` | Create festival form |
| `MySchedule` | Timetable view |
| `StageListComponent` | Stage management list |
| `StageCreateComponent` | Add stage form |
| `PerformanceListComponent` | Performance listing |
| `PerformanceCreateComponent` | Add performance form |

**Imports:**

| Module | Why |
|---|---|
| `BrowserModule` | Required for browser rendering |
| `AppRoutingModule` | Registers the router with the route table |
| `ReactiveFormsModule` | Required by all form components (`FormBuilder`, `FormGroup`) |

**Providers:**
- `provideBrowserGlobalErrorListeners()` — captures unhandled browser errors.

---

## 5. Services

### 5.1 `FestivalService`

| Property | Value |
|---|---|
| **File** | `src/app/services/festival.service.ts` |
| **Scope** | `providedIn: 'root'` (app-wide singleton) |
| **Storage** | In-memory only (resets on page refresh) |
| **Test file** | `src/app/services/festival.service.spec.ts` |

**Purpose:** Provides in-memory CRUD operations for `Festival` objects. Acts as the single source of truth for festival data within the running app.

**Internal state:**

| Field | Type | Description |
|---|---|---|
| `festivalStore` | `Festival[]` | Private in-memory list of all festivals (starts empty) |
| `nextFestivalId` | `number` | Auto-incrementing ID counter, starts at `1` |

**Public API:**

| Method | Signature | Returns | Description |
|---|---|---|---|
| `getFestivals` | `(): Festival[]` | `Festival[]` | Returns an array of shallow copies |
| `getFestivalById` | `(id: string): Festival \| undefined` | `Festival \| undefined` | Returns a copy of the matching festival, or `undefined` |
| `createFestival` | `(data: Omit<Festival, 'id'>): Festival` | `Festival` | Validates date range, assigns next ID, returns a copy. Throws if `endDate < startDate`. |
| `updateFestival` | `(id: string, updates: Partial<Omit<Festival, 'id'>>): Festival \| null` | `Festival \| null` | Merges updates into the matching festival; returns `null` if not found |
| `deleteFestival` | `(id: string): boolean` | `boolean` | Removes a festival by ID; returns `true` on success, `false` if not found |

> **Note:** All methods return copies so external code cannot mutate the internal store.

---

### 5.2 `StageService`

| Property | Value |
|---|---|
| **File** | `src/app/services/stage.service.ts` |
| **Scope** | `providedIn: 'root'` (app-wide singleton) |
| **Storage** | In-memory only (resets on page refresh) |
| **Test file** | `src/app/services/stage.service.spec.ts` |

**Purpose:** Provides in-memory CRUD operations for `Stage` objects, scoped per festival. Pre-loaded with four demo stages for festival ID `"1"`.

**Internal state:**

| Field | Type | Description |
|---|---|---|
| `stageStore` | `Stage[]` | Private in-memory list (pre-seeded with 4 demo stages for festival `"1"`) |
| `nextStageId` | `number` | Auto-incrementing ID counter, starts at `5` (above demo data) |

**Public API:**

| Method | Signature | Returns | Description |
|---|---|---|---|
| `getStagesByFestival` | `(festivalId: string): Stage[]` | `Stage[]` | Returns shallow copies of all stages for the given festival |
| `getStageById` | `(id: string): Stage \| undefined` | `Stage \| undefined` | Returns a copy of the matching stage, or `undefined` |
| `createStage` | `(data: Omit<Stage, 'id'>): Stage` | `Stage` | Validates capacity and uniqueness, assigns next ID, returns a copy. Throws on invalid capacity or duplicate name within the festival. |
| `updateStage` | `(id: string, updates: Partial<Omit<Stage, 'id'>>): Stage \| null` | `Stage \| null` | Merges updates; returns `null` if not found |
| `deleteStage` | `(id: string): boolean` | `boolean` | Removes stage by ID; returns `true` on success |
| `isStageAvailable` | `(festivalId, stageName, date, startTime, endTime, excludeId?): boolean` | `boolean` | Stub — real conflict checking is handled by `ScheduleService` |

---

### 5.3 `ScheduleService`

| Property | Value |
|---|---|
| **File** | `src/app/services/schedule.service.ts` |
| **Scope** | `providedIn: 'root'` (app-wide singleton) |
| **Storage** | `localStorage` (key: `mfp_performances`) — data persists across page refreshes |
| **Test file** | `src/app/services/schedule.service.spec.ts` |

**Purpose:** Manages `Performance` records with localStorage persistence. Provides conflict detection to prevent double-booking a stage during overlapping time windows.

**Storage design:**

- Uses an `InjectionToken<Storage>` (`LOCAL_STORAGE`) instead of calling `localStorage` directly. This lets unit tests inject a hermetic `MockStorage` substitute.
- On first run (or if storage is empty/corrupted), seeds 4 demo performances for festival `"1"`.

**Internal state:**

| Field | Type | Description |
|---|---|---|
| `performances` | `Performance[]` | Working in-memory list, hydrated from storage on init |
| `nextId` | `number` | Set to one above the highest stored ID to avoid collisions across sessions |

**Public API:**

| Method | Signature | Returns | Description |
|---|---|---|---|
| `getPerformancesByFestival` | `(festivalId: string): Performance[]` | `Performance[]` | Returns shallow copies of all performances for the festival |
| `isStageOccupied` | `(festivalId, stageName, date, startTime, endTime, excludeId?): boolean` | `boolean` | Returns `true` if any existing performance overlaps the given time window on the same stage and day. Uses standard interval-overlap formula. |
| `createPerformance` | `(data: Omit<Performance, 'id'>): Performance` | `Performance` | Validates times, checks for conflicts, assigns ID, persists to storage. Throws on invalid times, zero-duration window, or conflict. |
| `deletePerformance` | `(id: string): boolean` | `boolean` | Removes a performance by ID; persists to storage. Returns `false` if not found. |
| `clearPerformancesByFestival` | `(festivalId: string): void` | `void` | Removes ALL performances for a festival in one operation; persists to storage. |

---

## 6. Models

### 6.1 `Festival`

**File:** `src/app/models/festival.model.ts`

```typescript
export interface Festival {
  id: string;         // Unique identifier (assigned by FestivalService)
  name: string;       // Display name of the festival
  startDate: string;  // ISO 8601 start date (e.g. "2026-07-15")
  endDate: string;    // ISO 8601 end date (e.g. "2026-07-18"); must be >= startDate
  location: string;   // City/venue name
  genre?: string;     // Optional primary music genre
  capacity?: number;  // Optional maximum attendee count across all stages
}
```

---

### 6.2 `Stage`

**File:** `src/app/models/stage.model.ts`

```typescript
export type StageStatus      = 'active' | 'inactive' | 'under-repair';
export type StageEnvironment = 'indoor' | 'outdoor';

export interface Stage {
  id: string;                      // Unique identifier (assigned by StageService)
  festivalId: string;              // References Festival.id
  name: string;                    // Display name (unique per festival, case-insensitive)
  capacity: number;                // Max attendees; must be a positive integer
  environment: StageEnvironment;   // 'indoor' | 'outdoor'
  status: StageStatus;             // 'active' | 'inactive' | 'under-repair'
  notes?: string;                  // Optional free-text notes
}
```

---

### 6.3 `Performance`

**File:** `src/app/models/performance.model.ts`

```typescript
export interface Performance {
  id: string;          // Unique identifier (assigned by ScheduleService)
  festivalId: string;  // References Festival.id
  artistName: string;  // Performing artist or band name
  stageName: string;   // References Stage.name
  date: string;        // ISO 8601 date (e.g. "2026-08-01")
  startTime: string;   // 24-hour time "H:mm" or "HH:mm" (e.g. "9:00", "18:00")
  endTime: string;     // 24-hour time; must be after startTime
  genre?: string;      // Optional music genre/category
}
```

---

## 7. Routing

### 7.1 Current Routes

**File:** `src/app/app-routing-module.ts`

| Path | Component | Description |
|---|---|---|
| `` (empty string) | `Home` | Default landing page |
| `festivals` | `Festivals` | Festival listing (expandable cards) |
| `festivals/create` | `FestivalCreateComponent` | Create a new festival |
| `my-schedule` | `MySchedule` | Standalone timetable (defaults to festival ID "1") |
| `festivals/:id/schedule` | `MySchedule` | Timetable for a specific festival |
| `festivals/:id/stages` | `StageListComponent` | Stage management for a festival |
| `festivals/:id/stages/new` | `StageCreateComponent` | Add a stage to a festival |
| `festivals/:id/performances` | `PerformanceListComponent` | Performance listing for a festival |
| `festivals/:id/performances/new` | `PerformanceCreateComponent` | Schedule a new performance |

The router is initialized with `RouterModule.forRoot(routes)` and uses the default **HTML5 `pushState`** strategy (`<base href="/">` in `index.html`).

### 7.2 Navigation Hierarchy

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

### 7.3 Planned Routes

| Path | Component | Description |
|---|---|---|
| `festivals/:id` | `FestivalDetail` (planned) | Detail view for a single festival |
| `festivals/:id/edit` | `FestivalForm` (planned) | Edit existing festival |
| `**` | `NotFound` (planned) | 404 catch-all |

---

## 8. Module Architecture

```
index.html
  └── <app-root>
        └── AppModule  (bootstrapped in main.ts via platformBrowser)
              ├── BrowserModule
              ├── AppRoutingModule       ──▶  RouterModule.forRoot(routes)
              ├── ReactiveFormsModule
              └── declarations: [
                    App, Home, Festivals, FestivalCreateComponent,
                    MySchedule, StageListComponent, StageCreateComponent,
                    PerformanceListComponent, PerformanceCreateComponent
                  ]
```

All nine components are **NgModule-declared** (non-standalone). New components generated with `ng generate component` are automatically placed in `src/app/components/<name>/` and must be manually added to `AppModule.declarations`.

---

## 9. Data Flow

### 9.1 Reading Festivals

```
User navigates to /festivals
        │
        ▼
Festivals component (ngOnInit)
        │  calls FestivalService.getFestivals()
        │  calls StageService.getStagesByFestival(id) for each festival
        ▼
Services return copies of their in-memory arrays
        │
        ▼
Festivals renders expandable cards via *ngFor
```

### 9.2 Creating a Festival

```
User fills in FestivalCreate form → submits
        │
        ▼
FestivalCreateComponent calls FestivalService.createFestival(formData)
        │  (throws if endDate < startDate)
        ▼
FestivalService assigns ID, pushes to store, returns copy
        │
        ▼
Router navigates to /festivals
```

### 9.3 Creating a Performance (with conflict detection)

```
User fills in PerformanceCreate form → submits
        │
        ▼
PerformanceCreateComponent calls ScheduleService.createPerformance(data)
        │  validates time format and ordering
        │  calls isStageOccupied() — checks for overlapping bookings
        │  (throws human-readable error on any violation)
        ▼
ScheduleService assigns ID, pushes to in-memory list, saves to localStorage
        │
        ▼
Router navigates to /festivals/:id/performances
```

### 9.4 Timetable View (MySchedule)

```
User navigates to /festivals/:id/schedule
        │
        ▼
MySchedule (ngOnInit)
        │  reads :id from URL (defaults to "1" on /my-schedule)
        │  calls ScheduleService.getPerformancesByFestival(id)
        ▼
Derives unique dates → renders day-tab buttons
        │  auto-selects first day
        ▼
applyFilters():
        │  filters by selectedDay + selectedStage + selectedGenre
        │  builds stages[], times[], performanceGrid{}
        │  runs detectConflicts() — O(n²) pairwise overlap check per stage
        ▼
Template renders timetable grid; conflict cells highlighted
```

### 9.5 Component Interaction Diagram

```
┌────────────────────────────────────────────────────────┐
│                       AppModule                        │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │                   App (Shell)                    │  │
│  │  ┌─────────────────────────────────────────────┐ │  │
│  │  │              Bootstrap Navbar               │ │  │
│  │  │  [Home] [Festivals] [My Schedule]           │ │  │
│  │  └─────────────────────────────────────────────┘ │  │
│  │  ┌─────────────────────────────────────────────┐ │  │
│  │  │              <router-outlet>                │ │  │
│  │  │  ┌───────────────────────────────────────┐  │ │  │
│  │  │  │  Home / Festivals / FestivalCreate /  │  │ │  │
│  │  │  │  MySchedule / StageList / StageCreate │  │ │  │
│  │  │  │  PerformanceList / PerformanceCreate  │  │ │  │
│  │  │  │  (one rendered at a time)             │  │ │  │
│  │  │  └───────────────────────────────────────┘  │ │  │
│  │  └─────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │  FestivalService  (root, in-memory)             │   │
│  │  festivalStore: Festival[]                      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │  StageService  (root, in-memory + demo data)    │   │
│  │  stageStore: Stage[]                            │   │
│  └─────────────────────────────────────────────────┘   │
│                                                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │  ScheduleService  (root, localStorage-backed)   │   │
│  │  performances: Performance[]                    │   │
│  │  conflict detection via isStageOccupied()       │   │
│  └─────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────┘
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
