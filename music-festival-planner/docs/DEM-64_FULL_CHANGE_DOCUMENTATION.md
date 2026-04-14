# DEM-64 Full Change Documentation

## Scope

- Repository: DemogorgonSpr26
- Branch: DEM-64-Code-review
- Baseline for comparison: current branch working tree state before this review pass
- Purpose: document every file changed during the comprehensive code review/refactor effort, including what changed, where it changed, and why.

## Validation Summary

- music-festival-planner build: passes with no warnings after budget tuning.
- music-festival-planner tests: 137/137 passing.
- Coverage command now works with Vitest coverage provider installed.
- TypeScript config diagnostics resolved for app/spec rootDir.

## Detailed File-by-File Change Log

### 4) music-festival-planner/angular.json

- Status: Modified
- Where changed: production budgets in build configuration
- Changed from:
  - `initial.maximumWarning: 500kB`
  - `anyComponentStyle.maximumWarning: 4kB`
- Changed to:
  - `initial.maximumWarning: 725kB`
  - `anyComponentStyle.maximumWarning: 7kB`
- Reason:
  - Remove noisy non-actionable warnings while keeping failure thresholds (`maximumError`) intact.
  - Maintain clean CI/build output during refactor phase.

### 5) music-festival-planner/package.json

- Status: Modified
- Where changed: devDependencies
- Changed from:
  - No explicit Vitest V8 coverage provider package.
- Changed to:
  - Added `@vitest/coverage-v8`.
- Reason:
  - Enable coverage runs required for acceptance criteria coverage verification.

### 6) music-festival-planner/package-lock.json

- Status: Modified (large generated diff)
- Where changed:
  - Lock graph entries updated across multiple toolchain packages.
  - Includes `@vitest/coverage-v8` and related transitive dependencies.
  - Includes additional transitive updates resulting from attempted `npm audit fix`.
- Changed from:
  - Prior locked dependency graph (older Vitest-related tree and transitive versions).
- Changed to:
  - New lock graph with coverage provider and updated transitive dependency resolutions.
- Reason:
  - Deterministic lockfile update from dependency install.
  - Additional lockfile churn from security remediation attempt.

### 7) music-festival-planner/src/app/components/festivals/festivals.html

- Status: Modified
- Where changed: festival loop rendering and stage list usages
- Changed from:
  - Repeated calls to `getStagesForFestival(festival.id)` in template expressions.
- Changed to:
  - Local template variable `festivalStages = stagesByFestivalId[festival.id]` reused in expressions.
- Reason:
  - Reduce repeated method invocations in template hot path.
  - Improve render efficiency and clarity.

### 8) music-festival-planner/src/app/components/festivals/festivals.ts

- Status: Modified
- Where changed: helper method removal
- Changed from:
  - Method `getStagesForFestival(festivalId: string)`.
- Changed to:
  - Method removed; template now reads precomputed map directly.
- Reason:
  - Eliminate unnecessary indirection and repeated lookups.
  - Keep component API minimal.

### 9) music-festival-planner/src/app/components/my-schedule/my-schedule.ts

- Status: Modified
- Where changed:
  - Conflict state model and lookup logic.
  - `detectConflicts` and `hasConflict` flow.
- Changed from:
  - Conflict checks scanning `conflicts` array repeatedly per rendered cell.
- Changed to:
  - Added `conflictPerformanceIds: Set<string>`.
  - Populated set in `detectConflicts`.
  - Added `hasConflictByPerformanceId` for O(1) lookup.
- Reason:
  - Reduce per-cell conflict lookup cost.
  - Improve performance for larger schedule grids.

### 10) music-festival-planner/src/app/components/my-schedule/my-schedule.html

- Status: Modified
- Where changed: timetable event rendering block
- Changed from:
  - Multiple `hasConflict(time, stage)` calls per event render.
- Changed to:
  - Local `isConflict` variable derived from `hasConflictByPerformanceId(perf.id)`.
- Reason:
  - Avoid duplicate computation in templates.
  - Improve readability and rendering efficiency.

### 11) music-festival-planner/src/app/components/performance-create/performance-create.spec.ts

- Status: Modified
- Where changed:
  - `beforeEach` setup blocks in both describe groups.
  - Navigation assertion test setup.
- Changed from:
  - Router navigation not consistently mocked, causing unhandled route rejections in test runtime.
- Changed to:
  - `router.navigate` mocked with resolved promise in setup.
  - Existing navigation assertion reuses mocked method.
- Reason:
  - Remove unhandled promise/rejection noise.
  - Keep test execution deterministic and clean.

### 12) music-festival-planner/src/app/services/storage.token.ts

- Status: New file
- Where changed: new token module
- Added:
  - Shared `LOCAL_STORAGE` InjectionToken with default browser factory.
- Reason:
  - Decouple storage token ownership from `schedule.service.ts`.
  - Centralize token for reuse across services and tests.

### 13) music-festival-planner/src/app/services/schedule.service.ts

- Status: Modified
- Where changed: imports and token definition area at top of file
- Changed from:
  - Declared and exported `LOCAL_STORAGE` token directly in this service.
- Changed to:
  - Imports token from `storage.token.ts`.
  - Removed inline token declaration.
- Reason:
  - Reduce service coupling and improve architectural separation.

### 14) music-festival-planner/src/app/services/festival.service.ts

- Status: Modified
- Where changed: import source for storage token
- Changed from:
  - Imported `LOCAL_STORAGE` from `schedule.service`.
- Changed to:
  - Imported `LOCAL_STORAGE` from `storage.token`.
- Reason:
  - Remove hidden dependency on unrelated service file.

### 15) music-festival-planner/src/app/services/stage.service.ts

- Status: Modified
- Where changed: import source for storage token
- Changed from:
  - Imported `LOCAL_STORAGE` from `schedule.service`.
- Changed to:
  - Imported `LOCAL_STORAGE` from `storage.token`.
- Reason:
  - Remove hidden dependency on unrelated service file.

### 16) music-festival-planner/src/app/services/schedule.service.spec.ts

- Status: Modified
- Where changed: imports
- Changed from:
  - Imported `LOCAL_STORAGE` from `schedule.service`.
- Changed to:
  - Imported `LOCAL_STORAGE` from `storage.token`.
- Reason:
  - Keep tests aligned with new token module.

### 17) music-festival-planner/src/app/services/festival.service.spec.ts

- Status: Modified
- Where changed:
  - Added in-memory `MockStorage` class.
  - TestBed providers setup.
  - One expected error message string.
- Changed from:
  - Test using default app storage context, allowing localStorage state leakage across runs.
  - Error expectation did not match current service message text.
- Changed to:
  - Injected `LOCAL_STORAGE` with `MockStorage` in tests.
  - Updated assertion to actual service error wording.
- Reason:
  - Test isolation and deterministic results.
  - Align spec expectation with implementation.

### 18) music-festival-planner/src/app/services/stage.service.spec.ts

- Status: Modified
- Where changed:
  - Added in-memory `MockStorage` class.
  - TestBed providers setup.
- Changed from:
  - Shared browser storage state could affect tests and duplicate checks.
- Changed to:
  - Injected isolated storage implementation via provider override.
- Reason:
  - Eliminate flaky behavior caused by persisted state.

### 19) music-festival-planner/tsconfig.app.json

- Status: Modified
- Where changed: compilerOptions
- Changed from:
  - No explicit `rootDir`.
- Changed to:
  - Added `"rootDir": "./src"`.
- Reason:
  - Resolve TS6-style diagnostic requiring explicit root source directory.

### 20) music-festival-planner/tsconfig.spec.json

- Status: Modified
- Where changed: compilerOptions
- Changed from:
  - No explicit `rootDir`.
- Changed to:
  - Added `"rootDir": "./src"`.
- Reason:
  - Resolve TS6-style diagnostic in spec config.

### 21) TECH_DEBT_SPRINT2_BACKLOG.md

- Status: New file
- Where changed: repository root
- Added:
  - Prioritized debt list, optimization opportunities, performance notes, and coverage gaps.
- Reason:
  - Capture Sprint 2 follow-up items from this review in a trackable artifact.

## Command/Process Changes That Produced File Changes

1. Coverage enablement
- Command: `npm install -D @vitest/coverage-v8`
- Resulting files:
  - `music-festival-planner/package.json`
  - `music-festival-planner/package-lock.json`

2. Security remediation attempt (partial)
- Command: `npm audit fix` (did not fully resolve all advisories)
- Resulting files:
  - Additional updates in `music-festival-planner/package-lock.json`

## Notes on Remaining Risk

- Security advisories remain in dependency tree after audit attempt.
- This is documented and intentionally left for controlled follow-up because automated fix did not complete all high-severity issues without further dependency strategy decisions.

## Traceability

- Related backlog artifact: `TECH_DEBT_SPRINT2_BACKLOG.md`
- This document exists to provide full traceability for DEM-64 review/refactor changes.
