# Magento Upgrade Test Plan

Regression plan for the phase that starts **after** `setup:di:compile` is green. Derived from the
defect ledger of NRC-210 (Magento 2.4.8 upgrade, Hyvä storefront, 71 child issues, Dec 2025 – Aug 2026).

Every test point below exists because it broke at least once on a real upgrade. Ticket references are
kept so each point stays auditable — drop a point only when you can argue the cause cannot recur.

## How to use this

1. Copy this file into the project being upgraded and keep it in git. Findings become tickets, and
   fixes that reveal a new failure mode get a **new test point here**, so the next upgrade starts
   ahead of this one instead of level with it.
2. Walk phases in order. **A and B gate the rest**: handing a storefront to human testers before the
   environment is trustworthy and the automated sweeps are clean produces false findings that cost
   more than the upgrade. In NRC-210 at least six tickets were closed as environment artifacts or
   pre-existing production defects (NRC-338, NRC-372, NRC-412, NRC-449, NRC-450, NRC-451).
3. Record per point: `pass` / `fail` / `differs-from-live` / `pre-existing` / `env-artifact`.
   Only `fail` and `differs-from-live` become tickets.

## Phase A — Environment readiness gate

Do not start functional testing until every line passes. Each one burned a test cycle on NRC-210.

| # | Check | Why | Ref |
|---|---|---|---|
| A1 | DB is a **recent full copy** of production, not an old or partial dump | Missing customer orders produced "This order no longer exists" reported as an upgrade bug | NRC-449 |
| A2 | Group- and role-dependent data exists (e.g. customers in the group suppliers depend on) | Suppliers were absent on the test environment purely because the customer group had no members | NRC-412 |
| A3 | CMS blocks, Page Builder content and menu structure synced from production | Banner blocks and footer categories "missing" were simply not present on the test environment | NRC-372, NRC-402 |
| A4 | Media synced, or the fallback is understood and noted | Order confirmation logo/product images missing was a staging media gap, not a template bug | NRC-451 |
| A5 | Test-environment domain whitelisted for reCAPTCHA (and any other domain-bound key) | Account creation blocked by `Something went wrong with reCAPTCHA` on the upgrade domain | NRC-446 |
| A6 | Credentials handed to the client for every channel they test themselves (admin, FTP, mailcatcher) | FTP-driven product image and configurable-linking flows could not be tested at all | NRC-438 |
| A7 | Paid module subscriptions active for the target version | Mirasvit Advanced Reports subscription had expired; latest version installed but unsupported | NRC-351 |
| A8 | **Baseline the pre-existing defects on production first** | Two "upgrade regressions" also occurred on live; without a baseline this is only discovered after investigation | NRC-338, NRC-372 |

## Phase B — Automated sweeps before any human testing

Cheap, repeatable, and each one replaces a batch of hand-written tickets.

| # | Sweep | Catches | Ref |
|---|---|---|---|
| B1 | Crawl key routes with `MAGE_MODE=developer` while tailing `var/log/*` and `var/report/*`; treat every `Deprecated Functionality` as a defect | `Creation of dynamic property …ValidateButton::$formKey`; `Implicit conversion from float … loses precision` in SalesRule (Magento issue 40537) | NRC-374, NRC-454 |
| B2 | Collect browser console errors per route | `require is not defined` in cart, `elementChild is undefined` on PDP, `isOpen` on add-to-cart, checkout "Bestellen" failure — all found manually, all machine-detectable | NRC-355 |
| B3 | Check for 404s on generated assets, especially `*.min.css` / `*.min.js` and `app/code` web assets | A missing compiled `styles.css` presented as "products render vertically" and "PDP whitespace missing" — two tickets, one root cause | NRC-336, NRC-337 |
| B4 | Screenshot every route in Phase C on production and on the upgrade environment, diff side by side | Most of the 22 `[Testen upgrade]` / `[Testpunt]` tickets are single visual deltas found one at a time over two months | NRC-390…NRC-417 |
| B5 | Render key pages **with JavaScript disabled** | Minicart, menu and "bezig met laden" were visible in their initial state in every browser | NRC-426 |
| B6 | Static code scans at the **target** PHP version | New findings appear purely from the PHP and coding-standard bump | NRC-329 |
| B7 | Grep `app/code` and `app/design` for template helper access without a fallback (e.g. `$block->getData('imageHelper')`) | Product page threw `An error has happened during application run` for specific products | NRC-453 |

## Phase C — Storefront parity

Test each route on **mobile, tablet (incl. iPad Mini/Air) and desktop**. Tablet-only breakage was
missed twice because testing covered desktop and mobile only (NRC-338).

### C1 Home
- Product carousels render horizontally, not stacked (NRC-336)
- USP header: items side by side, correct height — depends on markup inside the CMS block, not only CSS (NRC-338, NRC-392)
- Category carousel present (NRC-405)
- Banner slider images fill at all viewport widths, including wide monitors (NRC-372)
- Spacing between header and first section matches live; check the Page Builder row margin, not the stylesheet (NRC-416)
- Mega menu loads without a visible unstyled interval (NRC-361)
- Menu image overlays/shadows match live (NRC-401)

### C2 Category / PLP
- Default sort order correct on first load, before any sort interaction (NRC-432)
- Filter overlay: closes on outside click, no conflict with mega menu, correct accent colour (NRC-464)
- "Sorteer en filter" button wide enough to keep its label on one line (NRC-417)
- **List** view alignment and left padding — applies to every category using list view, not just the one reported (NRC-460)
- "Vanaf" (from) price label present on cards (NRC-466)
- Product labels: padding and rounded corners (NRC-394)
- Product card hover scales up, does not shrink (NRC-391)
- Heading colour and centring on promotional categories (NRC-390)

### C3 PDP
- Horizontal whitespace present; full-width pages still full width. The container rule must exclude
  full-width variants: `main:not(.product-main-full-width):not(.page-main-full-width) .columns` (NRC-337)
- Configurable options render as text swatches, not a dropdown — driven by the Amasty Shop by
  attribute display mode, not the theme (NRC-393)
- Selected colour swatch border thickness, checkbox colour (NRC-462)
- Products with unusual media render without exception (NRC-453)

### C4 Search
- Related searches / recommendation blocks match production configuration (NRC-461)

### C5 Account
- `/customer/account/create`: asterisk size, input border colour after entry, password strength colour, reCAPTCHA notice styling, newsletter checkbox colour (NRC-445)
- Account creation actually completes (NRC-446)
- Login screen layout (NRC-383)

## Phase D — Cart and checkout

Highest defect density in NRC-210. Test with a **real order placed end to end**.

- Quantity field shows multi-digit values (36 must not render as 3) (NRC-396)
- Discount code field position, placeholder, and button alignment (NRC-395, NRC-443)
- Minicart title weight, border radius, padding (NRC-396, NRC-403)
- Sidecart is not covered by the overlay (NRC-473)
- **Add to cart while a coupon is active** — broke via a float→int deprecation in SalesRule (NRC-454)
- Checkout width on desktop and mobile (NRC-430)
- Address field alignment and label position when empty (NRC-397, NRC-434)
- Delivery-date selection: selectable, and its validation message clears once set. Broke twice —
  once as a `Phrase` passed to `EvaluationResultFactory::createErrorMessage(): ?string`, once as an
  unusable date picker (NRC-373, NRC-399, NRC-437)
- Payment method templates render — a Mollie Hyvä Checkout template called `isComponentsEnabled()` on null (NRC-373)
- Selection borders and notification styling per production (NRC-443)
- UI strings match production, including ones only fixable via inline translation or the theme's
  `i18n/nl_NL.csv` (NRC-400, NRC-457)
- Order confirmation email: logo, product images, layout (NRC-451)

## Phase E — Admin / backoffice

- Order search and filtering, and **opening** an order from results including the archived grid (NRC-449)
- Product create and save, including products with media (NRC-453)
- Adding images to products **and** to attributes (NRC-468)
- Customer grid does not overflow with long names; may need an admin theme override adding
  `overflow-x: auto` to `.admin__data-grid-wrap` (NRC-467)
- Any admin block extending a core block still loads — deprecated dynamic properties fatal here first (NRC-374)

## Phase F — Integrations, exports and analytics

- Product feed generation, both manual and scheduled (NRC-441)
- FTP-driven flows: product image upload, linking simple products to configurables (NRC-438)
- GA4 / dataLayer events. Establish the measurement plan **before** the upgrade; NRC-210 discovered
  mid-test that no plan existed and had to reconstruct it from the GTM module (NRC-452)
- Every remaining third-party module with its own scheduled job or export

## Phase G — Config and content that lives in the database

Code deploys; these do not. Collect them **during** testing and re-apply at go-live, or convert them
to data patches so they ship with the release. NRC-415 is a hand-written click list precisely because
this was not tracked as it went.

| Setting | Path | Ref |
|---|---|---|
| USP slide markup needs `<strong>` wrapping | Content → Blocks → Header \| USP Default | NRC-392, NRC-415 |
| Attribute display mode → Text-swatches | Stores → Attributes → *attribute* → Improved layered navigation → Display mode | NRC-393, NRC-415 |
| Homepage first row margin-top | Content → Pages → Homepage → Page Builder → row → Settings → Margin → Top | NRC-416 |
| Search recommendations off | Stores → Configuration → Catalog → Catalog Search → Search Recommendations → No | NRC-461 |
| Search suggestions off | Stores → Configuration → Catalog → Catalog Search → Search Suggestions → No | NRC-461 |
| Database translations | Not overwritten by deploy — verify they survive, and add missing ones to the theme's `i18n/nl_NL.csv` | NRC-448, NRC-457 |

## Triage rules

Applying these at intake, rather than after investigation, is where most of the saved time is.

1. **Compare against production before filing.** Include both URLs and both screenshots. Roughly a
   quarter of NRC-210's visual tickets were closed as "no difference found" or "also on live".
2. **Check the environment before the code.** If data, media or content is missing, it is Phase A,
   not a defect.
3. **Ask whether the fix is config, not code.** Swatch display mode, search suggestions, Page Builder
   margins and CMS block markup all presented as styling bugs. If it is config, it also belongs in Phase G.
4. **Generalise the report.** "Hotelarrangementen images misaligned" was really "every list-view
   category" (NRC-460); one root cause covered four separate label/heading tickets (NRC-390, NRC-394).
5. **Separate framework-major fallout from Magento fallout.** On NRC-210 the Hyvä bump brought
   Tailwind v3 → v4 and replaced Glider with SnapSlider in the same branch, so no styling regression
   could be bisected. Land those on mainline before the version bump (NRC-357, NRC-375).
6. **A closed ticket needs a stated cause.** Several were closed as "no longer reproducible" without
   one, which means nobody knows whether the fix holds or the symptom moved.

## Exit criteria before go-live

- Phases A–G walked, every point recorded, no open `fail`.
- Automated sweeps (B1–B7) clean on the release candidate, re-run after the last fix.
- Phase G list complete, with each entry either scripted as a data patch or scheduled in the go-live runbook.
- Pre-existing production defects explicitly listed as out of scope and agreed with the client.
- Rollback trigger agreed, and post-deploy error-rate monitoring ready.
