# Software & Intellectual Property Rights

**Team:** Demogorgon  
**Sprint:** Spring 2026

---

## Selected Feature / Asset: jQuery CDN Integration

The **Code & Brew** frontend loads jQuery 3.7.1 directly from the official jQuery CDN
(`code.jquery.com`) and uses it throughout the site for DOM manipulation, event handling,
and the featured-items carousel (`codeAndBrew/js/carousel.js`).

---

## IP Analysis

### Relevant IP Type: Copyright (Open-Source License)

jQuery is released under the **MIT License**, which is one of the most permissive
open-source licenses available. It grants anyone the right to use, copy, modify, merge,
publish, distribute, sublicense, and sell copies of the software — *provided that the
original copyright notice and license text are preserved*.

---

## Risks & Responsibilities

| Area | Detail |
|------|--------|
| **Attribution requirement** | The MIT License requires the jQuery copyright notice and license text to be included in any copy or substantial portion of the software. Loading jQuery from the CDN satisfies this in practice, but the team should be aware of the obligation if they ever bundle or vendor the library locally. |
| **Subresource Integrity (SRI)** | The `<script>` tag already includes `integrity` and `crossorigin` attributes — this is correct practice and protects against CDN tampering. No action needed here. |
| **License compatibility** | Our repo's own MIT License is fully compatible with jQuery's MIT License. There is no conflict. |
| **No patent/trademark risk** | jQuery does not carry patent grants or trademark restrictions that would affect our use. |

---

## Additional IP Observations

### Google Maps Embed (Copyright + Terms of Service)
The footer (`codeAndBrew/index.html`) embeds a Google Maps `<iframe>`. Google Maps is
**not** open-source. Use is governed by the
[Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms).
Key responsibilities:

- The embed shown uses a static `src` URL without an API key. In production, an API key
  is required for reliable access and to stay within Google's usage policies.
- Proper attribution ("Map data © Google") must remain visible; do not hide or obscure it.
- If the site ever becomes commercial, review whether a paid Maps tier is needed.

### "Code & Brew" Brand Name (Trademark)
The name *Code & Brew* and the tagline *"Where Coffee Meets Code"* are used throughout
the site. These could qualify as **trademarks** if the team were to commercialize the brand.

- Before launching commercially, search the USPTO trademark database to confirm no
  conflicting registration exists for "Code & Brew" in the food/beverage or software
  services categories.
- If commercializing, consider filing a trademark application to protect the brand.
- For this educational project, no immediate action is required.

---

## Recommended Actions

- [ ] **jQuery attribution** — If jQuery is ever downloaded and served locally, include the
  MIT license header comment block in the vendored file.
- [ ] **Google Maps API key** — Add a proper API key before deploying to a production
  environment; ensure attribution text remains visible.
- [ ] **Trademark check** — Run a USPTO search on "Code & Brew" before any commercial launch.
- [ ] **Ongoing license review** — When adding new third-party libraries (e.g., Bootstrap,
  Angular, Mongoose, googleapis), confirm each library's license and add it to this document.

---

## Summary

The most immediate IP consideration for our project is **copyright compliance with
open-source licenses**. jQuery (MIT) and Bootstrap (MIT) are both permissive and
compatible with our own MIT-licensed repository, but attribution obligations still apply
if we ever vendor those libraries. The Google Maps embed carries Terms-of-Service
obligations that require an API key in production. The "Code & Brew" brand name could
become a trademark asset worth protecting if the project moves toward commercialization.
