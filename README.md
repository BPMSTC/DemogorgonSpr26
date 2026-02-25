# DemogorgonSpr26
# Code & Brew - Where Coffee Meets Code

A multi-page website for **Code & Brew**, a fictional coffee shop where developers, designers, and dreamers come together over exceptional coffee. Built as a team project for Sprint 26.

## Live Pages & Sections

- **Home (`index.html`)** - Hero landing, featured items carousel, about, menu, contact, and footer
- **Blog (`pages/blog.html`)** - Standalone blog page with filterable article grid, category tags, expand/collapse reading, and load-more pagination
- **Sign Up (`pages/signUp.html`)** - Account registration with password strength indicator
- **Welcome (`pages/welcome.html`)** - Logged-in user dashboard with favorite drinks management
- **Footer (all pages)** - Store hours (with live open/closed status), location with embedded Google Map, and social links

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
  index.html              # Homepage (hero, carousel, about, menu, contact)
  css/
    styles.css            # Core/shared styles, theme variables, hero, about, products
    carousel.css          # Featured items carousel component styles
    blog.css              # Blog section styles
    account.css           # Sign-up page styles
    welcome.css           # Welcome dashboard styles
  js/
    script.js             # Core site logic (nav, store hours) — runs on every page
    contactForm.js        # Contact form validation & submission
    carousel.js           # Homepage featured items carousel
    blog.js               # Blog filtering, rendering, pagination
    account.js            # Sign-up form validation
    welcome.js            # Welcome dashboard favorites management
  pages/
    blog.html             # Standalone blog page
    signUp.html           # Account registration page
    welcome.html          # Logged-in user dashboard
  CODING-STANDARDS.md     # Team coding conventions
  README.md               # This file
```

## Homepage Carousel

The homepage features an auto-playing carousel (`#featuredCarousel`) showcasing six featured menu items — espresso drinks, cold brew, pastries, and specialty drinks.

### How it works

- Slides advance automatically every **4 seconds**.
- Users can navigate manually with the **‹ / › arrow buttons** or by clicking **dot indicators**.
- Keyboard users can press **Left / Right arrow keys** while the carousel has focus.
- Auto-play **pauses on hover or focus** so content can be read without interruption.
- Each slide includes a visual emoji circle, item name, short description, price, and a "View on Menu" link.

### How to add or edit featured items

Open `js/carousel.js` and update the `CAROUSEL_ITEMS` array near the top of the file. Each entry requires:

```javascript
{
  id: 7,                              // unique integer
  name: "Chai Latte",                 // display name
  description: "Short description.",  // 1-2 sentences
  price: "$4.50",                     // formatted price string
  emoji: "☕",                        // single emoji character
  category: "Specialty Drinks",       // matches menu category label
  visualClass: "carousel-slide-visual--specialty"  // CSS modifier class
}
```

Available `visualClass` values:
- `carousel-slide-visual--espresso` — dark red/brown gradient
- `carousel-slide-visual--cold-brew` — deep blue gradient
- `carousel-slide-visual--pastry` — warm gold/brown gradient
- `carousel-slide-visual--specialty` — deep green gradient

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
