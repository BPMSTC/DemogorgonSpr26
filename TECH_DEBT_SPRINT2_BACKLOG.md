# Technical Debt and Refactoring Backlog (Sprint 2-3)

## Completed in This Review Pass

- Isolated service tests from browser localStorage by injecting a mock storage token.
- Removed cross-service coupling by extracting a shared storage token into a dedicated module.
- Reduced repeated template work in Angular:
  - Cached stage data per festival card in template local variable.
  - Added conflict ID set in schedule component for O(1) conflict checks.
- Fixed flaky/unhandled router behavior in component tests by stubbing navigation in tests.
- Enabled coverage tooling with @vitest/coverage-v8.
- Updated Angular warning budgets to reflect current app footprint so build output stays actionable.

## Sprint 2-3 Backlog (High Priority)

1. Reduce production bundle size (currently ~696 kB initial)
   - Investigate Bootstrap CSS/JS impact and unused style footprint.
   - Consider route-level code splitting and reducing global style imports.

2. Improve component CSS weight
   - festivals.css and my-schedule.css are larger than the original warning thresholds.
   - Extract repeated utility styles and reduce duplicated declarations.

3. Increase low template/component coverage
   - festivals component has very low coverage.
   - stage-list and stage-create coverage remain low.
   - Add tests around empty states, interactions, and conditional template branches.

4. Strengthen Angular CI quality gates
   - Add lint/format/type-check steps for `music-festival-planner` in CI.
   - Add a test/coverage threshold gate to prevent coverage regressions.

5. Add security/dependency maintenance workflow
   - Track and remediate npm audit findings in music-festival-planner.
   - Add a dependency health task in CI.

## Performance Bottlenecks Identified

- Angular initial bundle size is relatively high for app scope.
- Large component styles indicate possible duplicated styling patterns.
- Dynamic timetable rendering can still become expensive with very large schedules; further memoization or virtualized rendering can be considered if data volume grows.

## Coverage Gaps Noted

- Coverage is concentrated in services and selected components; several templates have low branch/function coverage.
- Prioritize tests for complex UI behavior paths and conditional rendering in festivals, stage-list, and stage-create.
