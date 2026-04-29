# DemogorgonSpr26

This repository contains two independent web projects used in Sprint 26 coursework.

## Projects

### 1) `codeAndBrew`

A static multi-page coffee shop website built with semantic HTML, CSS, jQuery, and vanilla JavaScript.

- Entry page: `codeAndBrew/index.html`
- Project docs: `codeAndBrew/README.md`
- Coding standards: `codeAndBrew/CODING-STANDARDS.md`

### 2) `music-festival-planner`

An Angular 21 single-page app for managing festivals, stages, performances, and schedules.

- App docs: `music-festival-planner/README.md`
- Full documentation hub: `music-festival-planner/docs/`
  - `ARCHITECTURE.md`
  - `GITHUB_PAGES_WORKFLOW_PLAN.md`
  - `PERSON-A-WALKTHROUGH.md`
  - `PERSON-B-WALKTHROUGH.md`
  - `DEM-64_FULL_CHANGE_DOCUMENTATION.md`
  - `TECH_DEBT_SPRINT2_BACKLOG.md`

## Quick Start

### `codeAndBrew`

No build step is required.

1. Open `codeAndBrew/index.html` in a browser.
2. Navigate to pages in `codeAndBrew/pages/`.

### `music-festival-planner`

1. Open a terminal in `music-festival-planner/`
2. Install dependencies: `npm install`
3. Start dev server: `npm start`
4. Run tests: `npm test`
5. Create production build: `npm run build`

## Repository Notes

- The two projects are intentionally separate and use different tech stacks.
- Keep project-specific changes within their respective folders.
- Branch naming convention: `Dem-XX-short-description`
- Commit format convention: `DEM-XX: Short message`


## Reason for MIT License

- Being the simplest and most flexible, We thought it right in this case to 
  go with the MIT license due to the nature of this project being a platform for learning
  in and out of class, having the most straight forward option with the least restricions
  was the primary goal.

## AI tools and generated code
- AI tools we used this semester: 
  - Copilot
  - Claude

- We do indeed plan to ship any and all AI-generated code in the final project

- For AI attribution we begin assigning an AI provenance in the headar of every
  new file that contains AI assisted or generated code.

  such as the following example:

 ---- AI Provenance ----------------------------------------------------------
  AI-Assisted: true
  AI-Tool: GitHub Copilot (Enterprise)
  AI-Scope: function scaffolding, type annotations, initial docstring
  Human-Review: brent.f (2026-04-18) — significant refactor, error handling,
  test coverage additions. Reviewed for verbatim matches.
 -----------------------------------------------------------------------------
