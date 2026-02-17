# Code & Brew - Coding Standards

This document defines the coding standards for the Code & Brew project. All contributors
should follow these conventions to maintain a consistent, accessible, and maintainable codebase.

---

## Table of Contents

1. [General Principles](#general-principles)
2. [HTML](#html)
3. [CSS](#css)
4. [JavaScript](#javascript)
5. [Accessibility (WCAG)](#accessibility-wcag)
6. [Responsive / Mobile-First](#responsive--mobile-first)
7. [File & Folder Structure](#file--folder-structure)
8. [Version Control (Git)](#version-control-git)

---

## General Principles

- **Keep it simple.** Only add complexity when it is clearly needed.
- **One feature per file.** Each new feature gets its own JS file (e.g., `contactForm.js`, `blog.js`).
- **Use existing patterns.** Before inventing a new approach, look at how the project already solves similar problems.
- **No dead code.** Remove unused code rather than commenting it out.

---

## HTML

| Rule | Example |
|---|---|
| Use semantic elements | `<section>`, `<nav>`, `<article>`, `<header>`, `<footer>`, `<main>` |
| Language attribute on `<html>` | `<html lang="en">` |
| Tab indentation (1 tab per level) | Match existing file formatting |
| Double quotes for attributes | `class="hero-title"` |
| Every `<img>` needs `alt` text | `<img src="photo.jpg" alt="Latte art on a cappuccino">` |
| Every `<iframe>` needs a `title` | `<iframe title="Store location map">` |
| IDs use camelCase | `id="blogFilter"` |
| CSS classes use kebab-case | `class="blog-card"` |
| Interactive elements need accessible names | `aria-label`, `aria-labelledby`, or visible `<label>` |

### Section Pattern

```html
<!-- Feature Name -->
<section id="sectionId" class="section-name" aria-labelledby="sectionId-heading">
    <div class="container">
        <h2 class="section-title" id="sectionId-heading">
            Section <span class="gradient-text">Title</span>
        </h2>
        <!-- content -->
    </div>
</section>
```

---

## CSS

### Theme Variables

All colors, spacing, and shared values live in `:root` custom properties inside `css/styles.css`.

| Token | Value | Usage |
|---|---|---|
| `--maroon-dark` | `#800000` | Primary brand color, navbar, footer, headings |
| `--maroon-medium` | `#a52a2a` | Hover states on primary elements |
| `--maroon-light` | `#cd5c5c` | Light accents |
| `--gold` | `#ffd700` | Primary accent, logo, badges |
| `--gold-dark` | `#daa520` | Text on light backgrounds (meets WCAG AA) |
| `--gold-light` | `#ffed4e` | Hover accents on dark backgrounds |

### Rules

- **Use CSS custom properties** (`var(--maroon-dark)`) instead of hard-coded hex values.
- **Separate stylesheets per feature** (e.g., `css/blog.css`). Core/shared styles live in `css/styles.css`.
- **kebab-case** for all class names: `.blog-card`, `.blog-filter-btn`.
- **No `!important`** unless overriding a third-party library.
- **Mobile breakpoint** at `768px` using `@media (max-width: 768px)`.
- **Transitions** use `0.3s ease` for consistency.
- **Border-left accent** pattern: `border-left: 4px solid var(--gold)` for cards.
- **Focus states** must be visible: use `outline: 2px solid var(--gold-light); outline-offset: 2px;`.

---

## JavaScript

### General

- **jQuery** is the team standard for DOM interaction. Load via CDN (`jquery-3.7.1.min.js`).
- **IIFE wrapper** on every feature file to avoid global scope pollution.
- **`"use strict";`** at the top of every IIFE.
- **camelCase** for variables and functions.
- **UPPER_SNAKE_CASE** for constants (e.g., `STORAGE_KEY`, `MIN_NAME_LENGTH`).
- **Action-verb function names**: `validateField()`, `renderArticles()`, `filterByCategory()`.

### JSDoc

Every function gets a JSDoc block describing what it does, its parameters, and return value.

```javascript
/**
 * Render blog article cards into the grid container
 * @param {Array<Object>} articles - Array of article data objects
 * @param {jQuery} $container - The grid container to render into
 */
function renderArticles(articles, $container) {
    // ...
}
```

### File Template

```javascript
/**
 * Code & Brew - TICKET-ID: Feature Name
 * Brief description of what this file handles
 *
 * @format
 */

(function ($) {
    "use strict";

    // Constants
    var SOME_KEY = "value";

    /**
     * Description of function
     * @param {string} param - Description
     * @returns {boolean}
     */
    function doSomething(param) {
        // ...
    }

    /**
     * Initialize this feature
     */
    function init() {
        // ...
    }

    // Wait for DOM ready
    $(document).ready(function () {
        init();
    });
})(jQuery);
```

### Data Storage

- Use `localStorage` for client-side persistence (form submissions, user preferences).
- Wrap `localStorage` calls in `try/catch` to handle disabled or full storage.

---

## Accessibility (WCAG)

The project targets **WCAG 2.1 AA** compliance.

| Requirement | How We Meet It |
|---|---|
| Color contrast >= 4.5:1 for normal text | Use theme variables; maroon on white and gold-dark on white both pass |
| Color contrast >= 3:1 for large text | Verified via theme tokens |
| All images have `alt` text | Required in HTML standards above |
| All form inputs have `<label>` | Visible labels, not just `placeholder` |
| Focus indicators on all interactive elements | `outline: 2px solid var(--gold-light)` |
| `aria-expanded` on toggle buttons | Hamburger menu pattern |
| `aria-live` for dynamic content | Status badges, form feedback |
| Keyboard navigable | Tab order, Escape to close overlays |
| Skip-to-content link | `.skip-link` class in CSS |
| Minimum touch target 44x44px on mobile | `min-height: 44px; min-width: 44px;` |
| Semantic heading hierarchy | h1 > h2 > h3, no skipped levels within a section |
| `role` and `aria-label` on landmarks | Footer, nav, sections |

---

## Responsive / Mobile-First

- **Breakpoint**: `768px` (tablet/mobile boundary).
- **Touch targets**: minimum `44px x 44px` on mobile (WCAG 2.5.5).
- **No horizontal scroll**: all media elements get `max-width: 100%; height: auto;`.
- **Grid layouts** collapse to single column on mobile.
- **Font sizes** stay at least `1rem` (16px) on mobile for readability.
- **Test** on Chrome DevTools mobile emulation before pushing.

---

## File & Folder Structure

```
DemogorgonSpr26/
  index.html              # Single-page app, all sections
  css/
    styles.css            # Core/shared styles (theme, nav, footer, etc.)
    blog.css              # Blog section styles
  js/
    script.js             # Core site logic (store hours, nav)
    contactForm.js        # DEM-27: Contact form
    blog.js               # Blog section
  CODING-STANDARDS.md     # This file
  README.md
```

- New features add a **JS file** in `js/` and a **CSS file** in `css/` (e.g., `css/featureName.css`).
- Keep `index.html` as the single page; add sections in logical order.

---

## Version Control (Git)

- **Branch naming**: `Dem-XX` for feature tickets (e.g., `Dem-27`, `Dem-28`).
- **Commit messages**: Start with the ticket ID when applicable (e.g., `DEM-28: Add blog section`).
- **One feature per branch**. Do not bundle unrelated changes.
- **Pull requests** into the most recent `Dem-XX` base branch or `master`.
- **No force pushes** to shared branches.
- **Coordinate** with other contributors when features overlap (e.g., blog + login/profile).

---

## Integration Notes

- A separate branch is being developed for **user login/profile** functionality.
  Blog features like article authors and comments should use generic data structures
  (e.g., `authorName` string) that can later be linked to user profile objects once
  that feature merges. Avoid hard dependencies on the login system, but design data
  shapes that will be easy to extend.
