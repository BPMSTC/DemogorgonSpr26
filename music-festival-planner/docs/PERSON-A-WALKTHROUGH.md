# Person A Walkthrough (Infrastructure + Data Integrity)

This walkthrough covers:
1. `angular.json` syntax/build verification
2. Hash routing in Angular
3. wildcard route fallback
4. `images/404.html` fallback
5. persistence in `FestivalService` and `StageService`
6. stage cleanup API
7. festival cascade deletion
8. delete festival UI action
9. stale stage cache refresh strategy

## Current completion status (as of 2026-03-31)

- ✅ Step 1 complete — `angular.json` syntax fixed and build parses.
- ✅ Step 2 complete — `HashLocationStrategy` added in `app-module.ts`.
- ✅ Step 3 complete — wildcard route added in `app-routing-module.ts`.
- ✅ Step 4 complete — `images/404.html` created.
- ✅ Step 5 complete — persistence is implemented in both `FestivalService` and `StageService`.
- ✅ Step 6 complete — `clearStagesByFestival(...)` is implemented in `StageService`.
- ✅ Step 7 complete — cascade delete orchestration is implemented in `festivals.ts`.
- ✅ Step 8 complete — delete festival UI action is now present in `festivals.html`.
- ✅ Step 9 complete — route refresh logic + cleanup subscription are implemented in `festivals.ts`.

### Important note (current code health)

- ✅ `festivals.ts` currently compiles without errors.

---

## Step 1 — Verify/fix `angular.json` syntax and build parse

**Status:** ✅ Complete

**File:** `music-festival-planner/angular.json`
**Lines:** around `29–33`

Use this in `build.options`:

```json
"options": {
  "outputPath": "dist/music-festival-planner",
  "index": "pages/index.html",
  "browser": "js/main.ts",
  "tsConfig": "tsconfig.app.json",
```

✅ Build parsing is already validated (`npm run build` exit code 0).

**What to say:**
> "First I verified the build-blocking JSON issue in `angular.json`. The options block now parses correctly and the build succeeds."

---

## Step 2 — Implement hash routing in `AppModule`

**Status:** ✅ Complete

**File:** `js/app-module.ts`
**Lines to edit:** import area (`1–3`) and providers (`19`)

### Add import
```ts
import { LocationStrategy, HashLocationStrategy } from '@angular/common';
```

### Update providers
```ts
providers: [
  provideBrowserGlobalErrorListeners(),
  { provide: LocationStrategy, useClass: HashLocationStrategy },
],
```

**What to say:**
> "I’m switching to hash-based routing so GitHub Pages can safely handle refreshes and deep links like `/#/festivals`."

---

## Step 3 — Add wildcard router fallback

**Status:** ✅ Complete

**File:** `js/app-routing-module.ts`
**Add after current last route (around line 41, before `];`)**

```ts
{ path: '**', redirectTo: '' },
```

Resulting tail of routes:

```ts
{ path: 'festivals/:id/performances', component: PerformanceListComponent },
{ path: 'festivals/:id/performances/new', component: PerformanceCreateComponent },
{ path: '**', redirectTo: '' },
];
```

**What to say:**
> "This wildcard prevents dead-end navigation when a typo route is entered."

---

## Step 4 — Add `images/404.html`

**Status:** ✅ Complete

**Create file:** `music-festival-planner/images/404.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Music Festival Planner</title>
    <meta http-equiv="refresh" content="0; url=./index.html" />
  </head>
  <body>
    <p>Redirecting…</p>
  </body>
</html>
```

**What to say:**
> "Even with hash routing, I’m adding a defensive static fallback page for hosting safety."

---

## Step 5 — Add persistence to `FestivalService`

**Status:** ✅ Complete

**File:** `js/services/festival.service.ts`
**Current key lines:** store (`12`), create/update/delete (`40`, `59`, `82`)

### Replace imports
```ts
import { Injectable, Inject } from '@angular/core';
import { Festival } from '../models/festival.model';
import { LOCAL_STORAGE } from './schedule.service';
```

### Add constant below imports
```ts
const STORAGE_KEY = 'mfp_festivals';
```

### Add constructor + helpers inside class
```ts
constructor(@Inject(LOCAL_STORAGE) private storage: Storage) {
  this.festivalStore = this.loadFromStorage();
  this.nextFestivalId =
    this.festivalStore.reduce((maxId, festival) => Math.max(maxId, Number(festival.id) || 0), 0) + 1;
}

private isValidStoredFestival(entry: unknown): entry is Festival {
  if (entry === null || typeof entry !== 'object') return false;
  const candidate = entry as { [key: string]: unknown };

  if (
    typeof candidate['id'] !== 'string' ||
    typeof candidate['name'] !== 'string' ||
    typeof candidate['startDate'] !== 'string' ||
    typeof candidate['endDate'] !== 'string' ||
    typeof candidate['location'] !== 'string'
  ) {
    return false;
  }

  if (candidate['genre'] !== undefined && typeof candidate['genre'] !== 'string') return false;
  if (candidate['capacity'] !== undefined && typeof candidate['capacity'] !== 'number') return false;

  return true;
}

private loadFromStorage(): Festival[] {
  try {
    const raw = this.storage.getItem(STORAGE_KEY);
    if (raw === null) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry) => this.isValidStoredFestival(entry))
      .map((festival) => ({ ...festival }));
  } catch {
    return [];
  }
}

private saveToStorage(): void {
  try {
    this.storage.setItem(STORAGE_KEY, JSON.stringify(this.festivalStore));
  } catch {
    // ignore storage write failures
  }
}
```

### Add `saveToStorage()` calls
- in `createFestival` after `this.festivalStore.push(savedFestival);`
- in `updateFestival` after assignment to `this.festivalStore[festivalIndex]`
- in `deleteFestival` after `splice(...)`

**What to say:**
> "Now festival create/update/delete operations persist across refreshes using localStorage."

---

## Step 6 — Add persistence + cleanup API to `StageService`

**Status:** ✅ Complete

**File:** `js/services/stage.service.ts`
**Current key lines:** `nextStageId` at `52`, methods at `81`, `111`, `132`

### Replace imports
```ts
import { Injectable, Inject } from '@angular/core';
import { Stage } from '../models/stage.model';
import { LOCAL_STORAGE } from './schedule.service';
```

### Add constant
```ts
const STORAGE_KEY = 'mfp_stages';
```

### Add constructor + helpers
```ts
constructor(@Inject(LOCAL_STORAGE) private storage: Storage) {
  const stored = this.loadFromStorage();
  if (stored.length > 0) {
    this.stageStore = stored;
    this.nextStageId =
      this.stageStore.reduce((maxId, stage) => Math.max(maxId, Number(stage.id) || 0), 0) + 1;
  }
}

private isValidStoredStage(entry: unknown): entry is Stage {
  if (entry === null || typeof entry !== 'object') return false;
  const candidate = entry as { [key: string]: unknown };

  if (
    typeof candidate['id'] !== 'string' ||
    typeof candidate['festivalId'] !== 'string' ||
    typeof candidate['name'] !== 'string' ||
    typeof candidate['capacity'] !== 'number' ||
    typeof candidate['environment'] !== 'string' ||
    typeof candidate['status'] !== 'string'
  ) {
    return false;
  }

  if (candidate['notes'] !== undefined && typeof candidate['notes'] !== 'string') return false;
  return true;
}

private loadFromStorage(): Stage[] {
  try {
    const raw = this.storage.getItem(STORAGE_KEY);
    if (raw === null) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry) => this.isValidStoredStage(entry))
      .map((stage) => ({ ...stage }));
  } catch {
    return [];
  }
}

private saveToStorage(): void {
  try {
    this.storage.setItem(STORAGE_KEY, JSON.stringify(this.stageStore));
  } catch {
    // ignore storage write failures
  }
}
```

### Add `saveToStorage()` calls
- `createStage` after `this.stageStore.push(savedStage);`
- `updateStage` after the update assignment
- `deleteStage` after `this.stageStore.splice(stageIndex, 1);`

### Add cleanup API (before class closing brace)
```ts
clearStagesByFestival(festivalId: string): number {
  const before = this.stageStore.length;
  this.stageStore = this.stageStore.filter((stage) => stage.festivalId !== festivalId);
  const deletedCount = before - this.stageStore.length;
  if (deletedCount > 0) this.saveToStorage();
  return deletedCount;
}
```

**What to say:**
> "I mirrored persistence in StageService and added a bulk cleanup method for cascade deletion."

---

## Step 7 — Cascade delete orchestration in `festivals.ts`

**Status:** ✅ Complete

**File:** `js/components/festivals.ts`

### Add imports
```ts
import { ScheduleService } from '../../services/schedule.service';
```

### Update constructor
```ts
constructor(
  private festivalService: FestivalService,
  private stageService: StageService,
  private scheduleService: ScheduleService
) {}
```

### Add helper + delete method inside class
```ts
private refreshFestivalStageCache(): void {
  this.stagesByFestivalId = {};
  this.festivalsList.forEach((festival) => {
    this.stagesByFestivalId[festival.id] = this.stageService.getStagesByFestival(festival.id);
  });
}

deleteFestivalWithCascade(festivalId: string, clickEvent?: MouseEvent): void {
  clickEvent?.stopPropagation();

  const festivalName =
    this.festivalsList.find((festival) => festival.id === festivalId)?.name ?? 'this festival';

  const confirmed = confirm(
    `Delete "${festivalName}" and all related stages/performances?\n\nThis cannot be undone.`
  );

  if (!confirmed) return;

  this.scheduleService.clearPerformancesByFestival(festivalId);
  this.stageService.clearStagesByFestival(festivalId);
  this.festivalService.deleteFestival(festivalId);

  this.festivalsList = this.festivalService.getFestivals();
  this.refreshFestivalStageCache();

  if (this.expandedFestivalId === festivalId) this.expandedFestivalId = null;
  if (this.openKebabMenuFestivalId === festivalId) this.openKebabMenuFestivalId = null;
}
```

### Update `ngOnInit` to use refresh helper
Replace current `forEach` block with:
```ts
this.refreshFestivalStageCache();
```

**What to say:**
> "Delete now cascades in order: performances, stages, then festival. After that, I refresh local state so the UI is immediately consistent."

---

## Step 8 — Add delete festival action to UI

**Status:** ✅ Complete

**File:** `pages/festivals.html`
**Location:** inside kebab dropdown (near lines `69–95`)

Add:

```html
<button
  type="button"
  class="kebab-item kebab-item-danger"
  (click)="deleteFestivalWithCascade(festival.id, $event)">
  Delete Festival
</button>
```

**What to say:**
> "The service had delete capability, but no user entry point. This button wires that workflow with confirmation."

---

## Step 9 — Refresh stage cache on relevant route changes

**Status:** ✅ Complete

**File:** `js/components/festivals.ts`

### Update imports
```ts
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
```

### Update class signature
```ts
export class Festivals implements OnInit, OnDestroy {
```

### Add class field
```ts
private routerEventsSubscription?: Subscription;
```

### Inject `Router` in constructor
```ts
constructor(
  private festivalService: FestivalService,
  private stageService: StageService,
  private scheduleService: ScheduleService,
  private router: Router
) {}
```

### Add router refresh subscription in `ngOnInit`
```ts
this.routerEventsSubscription = this.router.events
  .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
  .subscribe((event) => {
    if (event.urlAfterRedirects.startsWith('/festivals')) {
      this.festivalsList = this.festivalService.getFestivals();
      this.refreshFestivalStageCache();
    }
  });
```

### Add cleanup hook
```ts
ngOnDestroy(): void {
  this.routerEventsSubscription?.unsubscribe();
}
```

**What to say:**
> "This keeps festival stage counts fresh when users return from stage/performance pages without doing a full reload."

---

## Run + verify

```bash
cd music-festival-planner
npm run build
npm start
```

Smoke checks:
1. `/#/festivals` and `/#/my-schedule` work on hard refresh
2. typo route redirects safely (wildcard)
3. create festival/stage/performance, refresh, data persists
4. delete festival removes related stages + performances

**What to say:**
> "Build passes, routes survive refresh, data persistence works, and cascade deletion removes orphaned records."
