# DemogorgonSpr26
# Code & Brew - Where Coffee Meets Code

A single-page website for **Code & Brew**, a fictional coffee shop where developers, designers, and dreamers come together over exceptional coffee. Built as a team project for Sprint 26.

## Live Sections

- **Home** - Hero landing with call-to-action buttons
- **About** - Company story, stats, and team member cards
- **Menu** - Espresso drinks, cold brew, pastries, and specialty drinks with pricing
- **Contact** - Contact form with client-side validation and localStorage persistence
- **Blog** - Filterable article grid with category tags, expand/collapse reading, and load-more pagination
- **Footer** - Store hours (with live open/closed status), location with embedded Google Map, and social links

## Tech Stack

| Layer | Technology |
|---|---|
| Markup | Semantic HTML5 |
| Styling | Vanilla CSS with custom properties (no frameworks) |
| Scripting | jQuery 3.7.1 (CDN) + vanilla JS |
| Storage | localStorage for form submissions |
| Backend | None (static site) |

## Project Structure
```
DemogorgonSpr26/
  index.html              # Single-page app, all sections
  css/
    styles.css            # Core/shared styles, theme variables
    blog.css              # Blog section styles
  js/
    script.js             # Core site logic (nav, store hours)
    contactForm.js        # Contact form validation & submission
    blog.js               # Blog filtering, rendering, pagination
  CODING-STANDARDS.md     # Team coding conventions
  README.md               # This file
```

## Getting Started

No build tools or dependencies to install. Just open `index.html` in a browser.

```bash
# Clone the repo
git clone https://github.com/BPMSTC/DemogorgonSpr26.git

# Open in browser
open index.html
```

## Coding Standards

See [CODING-STANDARDS.md](CODING-STANDARDS.md) for the full guide. Key highlights:

- **jQuery IIFE pattern** for all feature JS files
- **CSS custom properties** for theming (no hard-coded hex values)
- **WCAG 2.1 AA** accessibility compliance
- **Mobile-first** responsive design (breakpoint at 768px)
- **JSDoc** on all functions
- **One feature per file** and one feature per branch

## Team

| Name | Role |
|---|---|
| Blue (MavScriptBlu) | Owner & Head Barista |
| Seng | Coffee Roaster |
| Quinton | Pastry Chef |
| Tyler | Barista |

## Branch Strategy

- `main` / `master` - Stable, merged code
- `Dem-XX` - Feature branches (e.g., `Dem-27` for contact form, `Dem-28` for blog)
- PRs merge into the latest `Dem-XX` base branch or `main`
