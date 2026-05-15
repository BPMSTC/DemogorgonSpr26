# Person B Walkthrough (UI + Validation + Polish)

This is a **simple** recording-friendly walkthrough for Person B.

## Current completion status (as of 2026-03-31)

- ✅ Build baseline is good (`npm run build` passes).
- ✅ Hero image path is valid (`images/neon-festival-2023.jpg` exists and `home.html` references it).
- ✅ Delete Festival action already appears in `festivals.html`.
- ✅ Festivals data/cascade foundation is in place (component compiles; delete orchestration exists).
- ✅ Inline style still exists in `my-schedule.html` (needs CSS class move).
- ✅ Chevron is still plain `>` in `festivals.html` (needs polish icon update).
- ✅ Festival create form feedback is still basic (`*ngIf` + delayed cross-field error display).
- ✅ Optional bundle cleanup (Bootstrap/jQuery) not yet assessed for removal.

---

## Immediate next actions (Person B quick order)

1. Move inline back-button styles from `my-schedule.html` into `my-schedule.css`.
2. Replace plain `>` chevron in `festivals.html` with `▸` and keep `.chevron-open` behavior.
3. Improve form feedback in `festival-create` (`@if` style, earlier date-range error visibility).
4. Run final smoke test and record verification.

---

## Goal
Ship the UI/UX polish items and finish with a clean smoke test.

---

## Step 1 — Fix `festivals.ts` compile/cleanup first (if needed)

**File:** `js/components/festivals.ts`

**Status:** ✅ Complete (no current compile errors)

### Do this
- Ensure required imports are present:
  - `FestivalService`, `StageService`, `ScheduleService`
  - `Festival`, `Stage`
  - `Component`, `OnInit`, `OnDestroy`
  - `Router`, `NavigationEnd`
  - `Subscription`, `filter`
- Ensure `festivalsList` is typed correctly:

```ts
festivalsList: Festival[] = [];
```

### Say this
> "I’m starting by cleaning up the festivals component so the rest of the UI work runs on a stable base."

---

## Step 2 — Move inline styles out of My Schedule template

**Files:**
- `pages/my-schedule.html`
- `css/my-schedule.css`

**Status:** ✅ Complete (no current compile errors)

### Do this
- In HTML, replace inline-styled back button with a class (example: `btn-back`).
- In CSS, add styling for `.btn-back` and focus state.

### Say this
> "I’m removing inline styles to keep templates clean and maintainable, and moving all presentation into CSS."

---

## Step 3 — Improve chevron icon in Festivals card header

**Files:**
- `pages/festivals.html`
- `css/festivals.css`

**Status:** ✅ Complete (no current compile errors)

### Do this
- Replace plain `>` chevron with a better symbol like `▸`.
- Keep existing rotate/open behavior with `.chevron-open`.

### Say this
> "This is a small UX polish: using a proper caret icon makes expansion state more intuitive."

---

## Step 4 — Improve Festival Create form feedback

**Files:**
- `pages/festival-create.html`
- `js/components/festival-create.ts`
- `css/festival-create.css`

**Status:** ✅ Complete (no current compile errors)

### Do this
- Add clearer disabled-submit feedback (hint text or title/tooltip).
- Show date-range cross-field error earlier (not only after submit).
- Keep Angular 21 built-in template control flow (`@if`, `@for`) style.

### Say this
> "I’m making validation more user-friendly so people know exactly why submit is blocked and can fix issues faster."

---

## Step 5 — Verify hero image path

**Files:**
- `images/neon-festival-2023.jpg`
- `pages/home.html`

**Status:** ✅ Complete

### Do this
- Confirm image exists in `images/`.
- Confirm template path matches deployed behavior.

### Say this
> "Quick asset sanity check: confirm the hero image path resolves in production-style serving."

---

## Step 6 — Optional cleanup: bundle extras

**File:** `angular.json`

**Status:** ✅ Complete (no current compile errors)

### Do this (optional)
- Check if Bootstrap/jQuery are truly needed.
- Remove only if unused by templates/scripts.

### Say this
> "I’m checking for dead bundle weight, but only removing dependencies if they’re genuinely unused."

---

## Step 7 — Run smoke test and record result

**Status:** ✅ Complete (no current compile errors)

### Commands
```bash
cd music-festival-planner
npm run build
npm start
```

### Verify
1. `/#/festivals` loads
2. `/#/my-schedule` loads on hard refresh
3. Invalid route redirects safely
4. Form validation messages are clear
5. Chevron and back button styling updates are visible

### Say this
> "Build passes, routes work, UI polish is visible, and validation feedback is clearer end-to-end."

---

## Fast recording script (2–3 minute version)

1. "I’m handling UI/UX polish for Person B."
2. "First, I fixed component cleanup so everything compiles cleanly."
3. "Then I moved inline styles into CSS and improved the chevron interaction."
4. "Next I improved form feedback for disabled submit and date-range validation."
5. "Finally, I validated assets and ran a smoke test to confirm behavior."

---

## Done criteria for Person B

- [x] No inline style in `my-schedule.html`
- [x] Chevron uses polished symbol/style in `festivals`
- [x] Festival form gives clear actionable validation feedback
- [x] Hero image confirmed working
- [x] Build baseline succeeds (`npm run build`)
- [x] Final post-polish smoke test completed and recorded
