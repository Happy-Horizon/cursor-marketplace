# Magento 2 Development Plugin

Cursor plugin for Magento 2 storefront and module development skills.

## Language

**Frontend Component**:
A reusable storefront UI block wired to product (or page) data — presentation separated from data fetching.
_Avoid_: Block, widget, element (without qualifier)

**Frontend Stack**:
The theme technology path for implementing a Frontend Component. Two values: **Classic** (SCSS, theme wrapper, `data-mage-init`) or **Hyvä** (Tailwind, Alpine.js, ViewModels). Detected from active storefront theme: presence of `web/tailwind/package.json` → Hyvä; otherwise Classic. If detection fails → show `hyva-theme-list` output and ask user.
_Avoid_: Magento frontend, Luma (Classic is not Luma-specific; Hyvä is still Magento 2)

**Two-Layer Pattern**:
Presentation template in `{Vendor}_Components` module; data wiring in active theme wrapper. Same split on both Frontend Stacks.
_Avoid_: Single-layer, monolithic template

**Hyvä Styling**:
Tailwind utility classes applied directly in module presentation templates. No separate SCSS file per component. Theme Tailwind config must `@source` module template paths so utilities are not purged.
_Avoid_: BEM + `@apply`, module SCSS

**Theme Wrapper**:
Theme-side `.phtml` that fetches product/content-block data and passes it to the module presentation block via `setData()`. Same flow on both Frontend Stacks; Hyvä path may differ in ViewModelRegistry class or loader block class — copy sibling wrappers in active theme.
_Avoid_: Data logic in module template

**Hyvä Interactivity**:
Simple DOM behavior → inline Alpine.js in presentation template. Complex/reusable logic → invoke `hyva-alpine-component` skill.
_Avoid_: `data-mage-init`, RequireJS (on Hyvä path)

**Stack Build**:
After component files created, compile styles for active stack. Classic → SCSS/frontools (documented in `classic-path.md`). Hyvä → invoke `hyva-compile-tailwind-css` (ask before running).
_Avoid_: Auto-compile without user confirm

**Active Theme**:
The storefront theme currently assigned in Magento config. Resolved to `{Vendor}` + `{Theme}` → `app/design/frontend/{Vendor}/{Theme}/`. Used for all theme-side paths (wrappers, layout XML, Tailwind `@source`).
_Avoid_: Default theme (as a path assumption), hardcoded `default`
