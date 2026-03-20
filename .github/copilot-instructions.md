# Copilot Instructions for DemogorgonSpr26

This repository contains two independent sub-projects:

1. **codeAndBrew** — A static multi-page website built with HTML, CSS, and jQuery.
2. **music-festival-planner** — An Angular 21 single-page application (SPA).

---

## codeAndBrew

**Tech stack:** HTML5, CSS3, jQuery 3.7.1 (CDN), vanilla JavaScript (ES5 IIFE pattern).

### Coding standards (see `codeAndBrew/CODING-STANDARDS.md` for full details)

- Use semantic HTML elements (`<section>`, `<nav>`, `<article>`, `<header>`, `<footer>`, `<main>`).
- All colors must use CSS custom properties defined in `:root` inside `css/styles.css` — never hard-code hex values in feature stylesheets.
- CSS class names use **kebab-case** (`.blog-card`, `.blog-filter-btn`).
- Mobile breakpoint at `768px`; minimum touch target `44×44 px` on mobile (WCAG 2.5.5).
- Every JavaScript feature file must use an **IIFE wrapper** with `"use strict";` at the top.
- Every function must have a **JSDoc block** (description, `@param`, `@returns`).
- Use **camelCase** for variables/functions, **UPPER_SNAKE_CASE** for constants.
- One JS file and one CSS file per feature (e.g., `js/blog.js`, `css/blog.css`).
- Target **WCAG 2.1 AA** accessibility compliance: visible focus states, `aria-*` attributes, `alt` text on images, labeled form inputs.

### Branch and commit conventions
- Branch names: `Dem-XX-short-description` (e.g., `Dem-27-contact-form`).
- Commit messages start with the ticket ID: `DEM-27: Add contact form`.

---

## music-festival-planner

**Tech stack:** Angular 21, TypeScript (strict mode), Bootstrap 5, Vitest (unit tests).

### Architecture

- **NgModule-based** (non-standalone). `AppModule` in `src/app/app-module.ts` declares all components.
- New components go in `src/app/components/<name>/` with four files: `.ts`, `.html`, `.css`, `.spec.ts`.
- New components must be added manually to `AppModule.declarations`.
- Use Angular's **built-in template control flow** syntax (`@if`, `@for`, `@switch`) — not `*ngIf`/`*ngFor` directives.
- Component selectors use the `app-` prefix (e.g., `app-festivals`).
- Services use `providedIn: 'root'` and return **cloned objects** from read/create methods to prevent external mutation of internal state.

### Services (in-memory stores)

| Service | File | Responsibility |
|---|---|---|
| `FestivalService` | `src/app/services/festival.service.ts` | CRUD for `Festival` objects |
| `StageService` | `src/app/services/stage.service.ts` | In-memory stages (seeded with `festivalId: "1"`) |
| `ScheduleService` | `src/app/services/schedule.service.ts` | In-memory performances; validates times via `HH:MM` regex |

### Testing

- Test runner: **Vitest** (configured in `angular.json` and `tsconfig.spec.json`).
- Use **Vitest globals** (`vi.fn`, `vi.spyOn`) — not Jasmine (`spyOn`).
- `TestBed` imports use `RouterModule.forRoot([])` — not `RouterTestingModule`.
- Run tests: `cd music-festival-planner && npm test`

### CLI commands

```bash
cd music-festival-planner
npm start          # ng serve → http://localhost:4200
npm test           # Vitest unit tests
npm run build      # Production build → dist/music-festival-planner/
```

### Generating new code

```bash
ng generate component components/<name>   # then add to AppModule.declarations
ng generate service services/<name>
```

### Branch and commit conventions (same as codeAndBrew)
- Branch names: `Dem-XX-short-description`
- Commit messages start with the ticket ID: `DEM-62: Add FestivalService`

### Code style
- TypeScript strict mode — no implicit `any`.
- Prettier config in `.prettierrc`; run `npx prettier --write .` before committing.
