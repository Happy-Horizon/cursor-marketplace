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
3. Record per point: `pass` / `fail` / `differs-from-live` / `pre-existing` / `env-artifact` /
   `blocked-needs-human`. Only `fail` and `differs-from-live` become tickets.
4. **Cursor Cloud agents must execute the cloud-runnable portion in the VM** after
   `setup:di:compile` is green — see [Cursor Cloud agent execution](#cursor-cloud-agent-execution).
   That includes [Phase H](#phase-h--browser-end-to-end-mandatory) (browser E2E with offline
   payment + PR artifacts) when a storefront URL exists. Do not stop at composer/compile and
   leave this plan for humans.

## Cursor Cloud agent execution

When the upgrade runs in a Cursor Cloud agent (or equivalent cloud VM), the agent **owns** every
check that the VM can exercise. Human / staging / production-comparison work stays marked
`blocked-needs-human`; everything else is executed and reported before the agent finishes.

### Boot the environment first

Follow the project’s cloud docs (`AGENTS.md` / similar). Typical Magento cloud VM pattern:

1. Start MySQL and the search engine (OpenSearch/Elasticsearch — Elasticsuite needs phonetic/ICU
   plugins when the project uses Smile Elasticsuite).
2. Ensure `app/etc/env.php` exists for runtime (gitignored; create from project secrets / sample if
   needed). Compile may use a minimal stub; smoke tests need a real DB connection.
3. Serve the app (e.g. `php -S 0.0.0.0:8080 -t pub phpserver/router.php` or the project’s documented
   command). Confirm base URL responds.
4. Reindex if the DB was freshly imported: `bin/magento indexer:reindex`.

### What the agent MUST run (cloud-runnable)

| Plan ref | Action in cloud VM |
|---|---|
| B1 | Hit key routes / GraphQL operations with `MAGE_MODE=developer`; tail `var/log/*` and `var/report/*`; every `Deprecated Functionality` is a `fail` |
| B2 | During Phase H browser flows, capture console errors (browser MCP / computer use). If no browser is available, mark B2 `blocked-needs-human` — do not fake pass |
| B3 | HTTP-check generated assets on those routes for 404s (`*.min.css` / `*.min.js`, theme and `app/code` web assets) |
| B6 | Static scans at the **target** PHP version (`phpcs`, `phpmd`, project CI commands) |
| B7 | Grep `app/code` and `app/design` for template helper access without fallback; fix or ticket hits |
| Headless smoke | Project GraphQL smoke (at minimum `storeConfig` and a `products` search on a store code) |
| Storefront smoke | `curl` (or browser MCP if available) home, category, PDP, search, customer login page — expect HTTP 200 and no fatal in logs |
| **H0–H5** | [Phase H](#phase-h--browser-end-to-end-mandatory): SKU hygiene, guest checkout to a **real order** with **offline payment**, account lifecycle, hydration ATC smoke, **PR artifacts**, pre-existing ledger. Required when a storefront URL can be started or supplied |
| GraphQL E2E fallback | If **no** storefront URL: run GraphQL `createEmptyCart` → `addProductsToCart` → set shipping → set payment (`checkmo` / offline) → `placeOrder`; report browser H1/H2 as `blocked-needs-human`. Do **not** mark browser E2E `pass` without a recording |
| Admin smoke | If admin is reachable: login page loads; opening a known order/product URL does not 500; **print order/invoice PDF** on the target PHP (HD-473 Aheadworks/`imagedestroy`); edit a product after module uninstalls (no orphaned Lookbook/Hide-Price EAV crash) |
| File custom options | When catalog has multi-file options: GraphQL/storefront add-to-cart with one of two files uploaded; large PDF above old PHP limit; wrong extension rejected cleanly (HD-473) |
| Unit / suite | Run project PHPUnit / testsuite when the autoloader gotcha is handled (see project `AGENTS.md`) |

Example headless smoke (adapt host/store from the project):

```bash
curl -s -X POST http://localhost:8080/graphql -H "Content-Type: application/json" \
  -d '{"query":"{ storeConfig { store_code store_name } }"}'
curl -s -X POST http://localhost:8080/graphql -H "Content-Type: application/json" -H "Store: nl" \
  -d '{"query":"{ products(search: \"bag\", pageSize: 3){ total_count items{ sku name } } }"}'
```

Example log crawl after hitting routes:

```bash
rg -n "Deprecated Functionality|Fatal error|exception" var/log var/report 2>/dev/null || true
```

### What the agent marks `blocked-needs-human` (do not fake pass)

| Plan ref | Why cloud cannot finish it |
|---|---|
| A1–A8 | Needs a recent production DB/media sync, domain whitelist, paid subscriptions, client credentials |
| B2 | Only when no browser / computer-use is available in the agent |
| B4–B5 | Needs production screenshots / JS-disabled visual comparison |
| C–D visual / device matrix | Mobile/tablet/desktop parity and Hyvä styling need staging + human or Playwright against a seeded storefront |
| D / H paid gateways | Real redirect/paid methods (iDEAL, Afterpay, cards, PayPal, etc.) and order-confirmation **email** image QA — **not** offline `checkmo` / Check Money order, which **is** cloud-runnable in Phase H |
| H1–H4 browser | Only when no storefront URL can be started or supplied (then use GraphQL E2E fallback). Vercel SSO on `*.happyhorizon.dev` without agent credentials → document `blocked-needs-human` and still run GraphQL placeOrder against Magento |
| E deep admin | Grid/UX checks beyond “does not 500” |
| F integrations | FTP, feeds, GA4 measurement plan against live GTM |
| G go-live config | Collect during staging test; agent may *list* Phase G candidates found in code/config diffs |

### Agent exit report (required)

Before ending the cloud session, post a short report (PR comment or agent summary) with:

1. Services started, Magento base URL, and storefront URL used (or “none — GraphQL fallback”).
2. Table of cloud-runnable checks with `pass` / `fail` / `env-artifact` (include H0–H5 or GraphQL fallback).
3. Phase H artifact links (video + order screenshot). Cloud agents: “E2E pass” **without** artifacts is invalid.
4. Pre-existing ledger (H5): issues reproduced on previous Magento / raw GraphQL / production.
5. Fixes committed for any in-scope `fail`, or explicit tickets/todos for the rest.
6. Bullet list of `blocked-needs-human` items left for staging / client UAT.
7. Statement that compile **and** cloud-runnable test-plan execution (including Phase H or GraphQL fallback) completed (or what blocked boot).

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
| A7 | Paid module subscriptions active for the target version | Mirasvit Advanced Reports / Feed / SEO subscriptions expire and block supported bumps; Amasty packs likewise (renew **or** uninstall with stakeholder OK — Holbox HD-473/HD-565/HD-568) | NRC-351, HD-565 |
| A8 | **Baseline the pre-existing defects on production first** | Two "upgrade regressions" also occurred on live; without a baseline this is only discovered after investigation | NRC-338, NRC-372 |
| A9 | PHP / nginx upload limits match real file-option / contact-attachment sizes | Holbox defaulted to 2M/8M; large PDFs failed with CRITICAL content-type until ~128M/132M and GraphQL returned a real error | HD-473 |

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

Highest defect density in NRC-210. Visual / device-matrix checks stay here; the **mandatory agent
executable path** (guest order + account + artifacts) is [Phase H](#phase-h--browser-end-to-end-mandatory).

- Quantity field shows multi-digit values (36 must not render as 3) (NRC-396)
- Discount code field position, placeholder, and button alignment (NRC-395, NRC-443)
- Minicart title weight, border radius, padding (NRC-396, NRC-403)
- Sidecart is not covered by the overlay (NRC-473)
- **Add to cart while a coupon is active** — broke via a float→int deprecation in SalesRule (NRC-454)
- Checkout width on desktop and mobile (NRC-430)
- Address field alignment and label position when empty (NRC-397, NRC-434)
- Delivery-date selection: selectable, and its validation message clears once set. Broke twice —
  once as a `Phrase` passed to `EvaluationResultFactory::createErrorMessage(): ?string`, once as an
  unusable date picker (NRC-373, NRC-399, NRC-437). After removing Swissup Delivery Date, confirm
  the **remaining** delivery-date module (e.g. Experius) still works and project wrappers for the
  removed package are disabled (HD-473 `Holbox_DeliveryDateExtend`).
- Payment method templates render — a Mollie Hyvä Checkout template called `isComponentsEnabled()` on null (NRC-373)
- Selection borders and notification styling per production (NRC-443)
- UI strings match production, including ones only fixable via inline translation or the theme's
  `i18n/nl_NL.csv` (NRC-400, NRC-457)
- Order confirmation email: logo, product images, layout (NRC-451)
- **Multi-file product custom options** (Magento 2.4.9): product with ≥2 file options; upload one
  required file → add to cart must succeed (core `Http::isUploaded()` regression); wrong extension
  rejected; file visible on the order in admin (HD-473)
- **Large file upload** (> previous `upload_max_filesize`): cart/order or contact attachment must
  not fail with a silent CRITICAL content-type (HD-473)

## Phase H — Browser end-to-end (mandatory)

Modeled on [Horizon-Storefront#330](https://github.com/Happy-Horizon/Horizon-Storefront/pull/330):
full browser flows with **video + screenshot artifacts** in the PR / agent summary. This is the
minimum interaction E2E for an upgrade — `curl` HTTP 200 is not enough when a storefront exists.

Use whatever FE the project has:

| Project shape | Browser target | Magento under test |
|---|---|---|
| Headless (Horizon Backend + Horizon Storefront / client Next app) | Storefront base URL pointed at upgraded GraphQL | Upgrade candidate (cloud VM Magento, or staging deploy of the upgrade branch) |
| Magento FE (Hyvä / Luma) | Magento storefront base URL | Same Magento instance |

Agents use browser MCP / computer use when available. If the project already has Playwright (or
similar), use it — do **not** invent a new test framework. Prefer offline payment (`checkmo` /
Check Money order) so a real order can be placed without paid gateways.

### H0 — Preconditions

1. Magento under test is the **upgrade candidate** (not an unrelated shared staging on the old version
   unless that *is* the upgrade branch deploy).
2. Resolve storefront URL: env var / user-provided / start the project FE. For headless, GraphQL URL
   must point at that Magento.
3. Pick a **Simple** product SKU, or a configurable **child** that GraphQL can add. Prove before the
   browser: `products` search finds it, and `addProductsToCart` succeeds. Skip parent configurables
   and VirtualProducts that reject shipping (PR #330: broken demo SKUs caused false checkout fails).
4. Confirm an offline / non-redirect payment method is enabled (`checkmo` or equivalent).
5. Confirm an offline / non-redirect payment method is enabled (`checkmo` or equivalent).
6. If the catalog sells **file custom options**, pick a SKU with ≥2 file options (Holbox: P00003)
   for a dedicated cart case in addition to the simple H1 SKU.
7. If reCAPTCHA blocks registration on the test domain, record A5 and continue H1; mark H2
   `blocked-needs-human` only if account flows cannot proceed.

### H1 — Guest checkout → order placed

Pass **only** when the success page shows a real order number.

1. Category (or search) → PDP → add to cart → cart.
2. Checkout address → shipping (e.g. Flat Rate) → offline payment (Check / Money order).
3. Place order → success URL with order number (e.g. `#000001420`).
4. During the flow, note payment methods offered; do not require paid gateways for pass.
5. Capture: full-flow video + order-confirmation screenshot (see H4).

### H2 — Account lifecycle

1. Register a new customer (ends logged in).
2. Open protected pages (e.g. `/customer/account/orders`, `/customer/account/edit` — adapt locale
   prefix for headless storefronts).
3. Logout → login again with the same credentials.
4. If logged-out access to a protected page fails to reach the login form, compare to the previous
   Magento / baseline and file under H5 as `pre-existing` when it reproduces — do not silent-skip.

### H3 — Hydration / add-to-cart smoke

After any related FE or Magento cart-path change in the same branch (or as a quick re-check after
H1): add to cart produces immediate UI feedback (toast, minicart, and/or cart badge). Catches
hydration regressions that still return HTTP 200.

### H4 — Artifacts (required for cloud / PR)

Cloud agents and any agent that claims H1/H2 `pass` must attach proof:

| Artifact | Suggested filename |
|---|---|
| Guest checkout recording | `guest_checkout_catalog_to_order_placed.mp4` |
| Account lifecycle recording | `account_register_protected_pages_logout_login.mp4` |
| Order confirmation still | screenshot of success page showing the order number |

- Save under the agent artifact dir when available (`/opt/cursor/artifacts/…`).
- Embed in the PR body / agent summary like PR #330: linked video thumbs and
  `![Order confirmation …](https://cursor.com/artifacts/…)` (or the platform’s equivalent artifact
  URLs).
- Exit report must list artifact URLs. **“E2E pass” without artifacts is invalid** for cloud agents.

### H5 — Pre-existing ledger

In the PR / agent summary, keep a separate section for issues found during E2E that reproduce on:

- the previous Magento version, and/or
- raw Magento GraphQL with no storefront, and/or
- production.

Do **not** fix out-of-scope storefront bugs on the Magento upgrade branch unless the user agrees.
Do **not** blame the Magento bump for catalog data defects proven via GraphQL alone.

### GraphQL placeOrder fallback (no storefront)

When no storefront URL exists, still prove Magento checkout in cloud:

```text
createEmptyCart → addProductsToCart → setShippingAddressesOnCart →
setShippingMethodsOnCart → setPaymentMethodOnCart (checkmo) → placeOrder
```

Report the order number. Mark browser H1–H4 `blocked-needs-human` (no recording). This fallback
does **not** satisfy H1 `pass` for projects that have a storefront URL available.

## Phase E — Admin / backoffice

- Order search and filtering, and **opening** an order from results including the archived grid (NRC-449)
- Product create and save, including products with media (NRC-453)
- Adding images to products **and** to attributes (NRC-468)
- Customer grid does not overflow with long names; may need an admin theme override adding
  `overflow-x: auto` to `.admin__data-grid-wrap` (NRC-467)
- Any admin block extending a core block still loads — deprecated dynamic properties fatal here first (NRC-374)
- **Print order / invoice PDF** on the target PHP (8.5 on 2.4.9) — Aheadworks/`imagedestroy()` and
  similar GD calls 503 until patched (HD-473)
- After uninstalling Lookbook / Hide Price / Page Builder: open a product in admin — orphaned EAV
  must be data-patched away (HD-473)

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

- Phases A–H walked, every point recorded, no open `fail`.
- Phase H1 passed with a real order number and artifacts (or GraphQL fallback documented when no FE).
- Automated sweeps (B1–B7) clean on the release candidate, re-run after the last fix.
- Phase G list complete, with each entry either scripted as a data patch or scheduled in the go-live runbook.
- Pre-existing production defects (including H5) explicitly listed as out of scope and agreed with the client.
- Rollback trigger agreed, and post-deploy error-rate monitoring ready.
