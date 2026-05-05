# Software & Intellectual Property Rights

**Team:** Demogorgon  
**Sprint:** Spring 2026  
**Project scope:** `music-festival-planner/`

---

## Selected Feature / Asset: Lollapalooza Festival Image

The file `music-festival-planner/src/assets/Lollapalooza-2022.jpg` is a photograph of a
real music festival. It is used as the hero/card image for one of the two seeded festivals
in the app.

---

## IP Analysis

### Relevant IP Types: Copyright + Trademark

**Copyright** — The photograph itself is a creative work. The moment it was taken, copyright
vested automatically in the photographer (or their employer, e.g., Live Nation / C3 Presents).
No registration is required for copyright to apply. Reproducing, displaying, or distributing
the photo without a license is infringement.

**Trademark** — "Lollapalooza" is a registered trademark of C3 Presents LLC (USPTO Reg.
#3,011,448). Using the name or associated imagery in a way that implies affiliation,
sponsorship, or endorsement by the festival could constitute trademark infringement.

---

## Risks & Responsibilities

| Risk | Detail |
|------|--------|
| **Copyright infringement** | Displaying a professional festival photograph without a license or explicit permission from the rights holder is infringement, regardless of whether the project is commercial. |
| **Trademark infringement** | Pairing the Lollapalooza name and imagery in a web application could imply an affiliation with C3 Presents that does not exist. |
| **Educational-use defense is narrow** | "Fair use" / educational purpose may limit risk in a classroom context, but it is not a blanket exception and does not apply if the image is published publicly (e.g., on GitHub Pages or a deployed site). |

---

## Additional IP Observations

### Open-Source Dependencies (Copyright)

Several dependencies carry license obligations that survive into any distributed build:

| Library | License | Key obligation |
|---------|---------|----------------|
| Angular 21 | MIT | Include copyright notice in distributed builds |
| Bootstrap 5.3 | MIT | Include copyright notice |
| RxJS 7.8 | Apache 2.0 | Include NOTICE file and copyright headers |
| googleapis 171 | Apache 2.0 | Include NOTICE file and copyright headers |
| Express 4.18 | MIT | Include copyright notice |
| Mongoose 8/9 | MIT | Include copyright notice |

Apache 2.0 is slightly stricter than MIT: it requires reproducing the `NOTICE` file and all
copyright/attribution statements in any distribution. A standard `npm run build` bundles
these libraries — for a publicly hosted build, a `THIRD-PARTY-LICENSES.txt` file (auto-generated
by tools such as `license-checker`) should be included.

### Google Calendar API (Terms of Service)

The app integrates Google Calendar via OAuth 2.0 (`googleapis` package,
`calendar.events` scope). Google's API Terms of Service impose obligations beyond the
open-source license of the SDK:

- OAuth credentials must not be embedded in public source code — use environment variables
  (already done via `.env` files; ensure `.env` files remain git-ignored).
- The OAuth consent screen shown to users must accurately describe how calendar data is used.
- If the app is ever submitted for Google's OAuth verification review, a privacy policy URL
  is required.

### Custom Scheduling Algorithm (Copyright / Potential Trade Secret)

The interval-overlap conflict-detection logic in `schedule.service.ts` and
`personal-schedule.service.ts` is original code authored by the team. As such, it is
automatically protected by **copyright** (owned by Team Demogorgon / covered by the repo's
MIT License). Because the repo is public under MIT, this code is freely shareable — that is
intentional and appropriate for an educational project.

---

## Recommended Actions

- [ ] **Replace `Lollapalooza-2022.jpg`** with a royalty-free or Creative Commons-licensed
  festival image (e.g., from Unsplash or Wikimedia Commons) before publishing the site
  anywhere beyond a private classroom submission. Update the corresponding seed data record.
- [ ] **Replace or remove `neon-festival-2023.jpg`** for the same reason if its source and
  license cannot be confirmed.
- [ ] **Add `THIRD-PARTY-LICENSES.txt`** — run `npx license-checker --csv > THIRD-PARTY-LICENSES.txt`
  from `music-festival-planner/` to document all dependency licenses for any public deployment.
- [ ] **Keep `.env` files out of git** — confirm `.env`, `.env.local`, and `.env.atlas` are
  listed in `.gitignore` (they currently are) and never commit real OAuth credentials.
- [ ] **Draft a brief privacy policy** if the Google Calendar OAuth flow is ever opened to
  real users beyond the development team.

---

## Summary

The most urgent IP issue in the Music Festival Planner is the use of `Lollapalooza-2022.jpg`,
which carries both **copyright** risk (unauthorized use of a professional photograph) and
**trademark** risk (association with a registered festival brand). The fix is straightforward:
swap it for a licensed image before any public deployment. Secondary obligations include
Apache 2.0 attribution for RxJS and googleapis in any distributed build, and protecting
OAuth credentials from being committed to the repository.
