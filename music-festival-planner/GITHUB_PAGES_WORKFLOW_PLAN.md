# GitHub Pages Deployment Workflow Plan (Pre-YAML)

This document defines the plan for deploying the Angular app in `music-festival-planner/` to GitHub Pages whenever `main` is updated.

## Goal

- Trigger an automated deployment on pushes to `main`.
- Build the Angular app from the `music-festival-planner` folder (not repo root).
- Publish the production build to GitHub Pages.

## Deployment Model

We will use the **official GitHub Pages Actions flow** (artifact-based deployment):

1. `actions/checkout`
2. `actions/setup-node`
3. Install dependencies in `music-festival-planner` (`npm ci`)
4. Build Angular app in production mode
5. Upload built files as a Pages artifact
6. Deploy artifact with `actions/deploy-pages`

This avoids manually pushing to `gh-pages` and is GitHub’s recommended approach.

## Trigger & Scope

- Trigger: `push` to `main`
- Optional manual trigger: `workflow_dispatch`
- Path scope:
  - Include only changes that affect the Angular app and workflow files to avoid unnecessary deployments.
  - Expected filter: `music-festival-planner/**` and `.github/workflows/**`

## Build Folder & Working Directory

Because the Angular project lives in a subfolder, all Node/Angular commands must execute from:

- `music-festival-planner`

Planned workflow default:

- `defaults.run.working-directory: music-festival-planner`

## Base HREF / Routing Requirement

For project pages (`https://<user>.github.io/<repo>/`), Angular needs a matching base path at build time.

Planned default build command:

- `npm run build -- --configuration production --base-href "/${{ github.event.repository.name }}/"`

If this repository is later converted to a **user/org site** (`https://<user>.github.io/`), base href should be changed to `/`.

## Required GitHub Settings

Before/with workflow rollout:

1. Repository **Settings → Pages**
2. Source = **GitHub Actions**
3. Ensure workflow has permissions:
   - `pages: write`
   - `id-token: write`
   - `contents: read`

## Runner & Node Version

- Runner: `ubuntu-latest`
- Node: align with project tooling (`packageManager: npm@11.8.0`), use an LTS runtime supported by Angular 21 (e.g., Node 22).
- Enable npm cache in setup-node for faster builds.

## Artifact Path

With current Angular builder, production output is expected at:

- `music-festival-planner/dist/music-festival-planner/browser`

The workflow should upload this exact folder as the Pages artifact.

## Validation Checklist (Before Writing YAML)

- [ ] Confirm Pages source is set to GitHub Actions.
- [ ] Confirm branch name is `main`.
- [ ] Confirm site type (project page vs user/org page) to lock correct `--base-href`.
- [ ] Confirm output folder exists after local build.

## Acceptance Criteria for the Future YAML

- On push to `main`, workflow runs automatically.
- Workflow installs/builds from `music-festival-planner`.
- Deployment job publishes artifact to GitHub Pages successfully.
- Deployed app loads without broken assets/routes at the expected Pages URL.
