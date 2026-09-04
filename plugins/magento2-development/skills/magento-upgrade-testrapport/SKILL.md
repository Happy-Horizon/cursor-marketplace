---
name: magento-upgrade-testrapport
description: Use when producing the post-upgrade Dutch testrapport for Jira/PR after a Magento upgrade succeeds (staging deploy + regression/E2E). Also use when asked for HD-473-style testrapport, upgrade test report with screenshot/video proof, or client UAT handoff after magento-upgrade Phase H.
---

# Magento Upgrade Testrapport

Dutch, Jira-ready **testrapport** after a Magento upgrade has been proven on the target environment
(usually staging). Pattern from Holbox [HD-473](https://ct-happyhorizon.atlassian.net/browse/HD-473)
regression agent `bc-6751dd3b-b831-48a9-a271-b6beeeffad3d` (Happy-Horizon/holbox PR #19 /
`feature/HD-473-php-cutover`): staging Magento + storefront E2E with screenshots and videos under
`/opt/cursor/artifacts/`, posted to Jira and the PR with **clickable** media links.

This is **normal output after a successful Magento upgrade**, not an optional nicety. It is invoked
from the **magento-upgrade** skill after Phase H (or GraphQL placeOrder fallback) succeeds.

## When to run

**MUST** run after **all** of the following are green on the upgrade candidate:

1. `setup:di:compile` / Hypernode `magento:compile` (magento-upgrade steps 1–10).
2. Cloud-runnable portion of [upgrade-testplan.md](../magento-upgrade/upgrade-testplan.md).
3. Phase H browser E2E **or** documented GraphQL placeOrder fallback when no storefront URL exists.
4. Staging (or equivalent) deploy of the upgrade branch is reachable for the URLs in the report.

Do **not** produce a “success” testrapport when compile-only work is done, or when E2E failed and
was not fixed. Partial / blocked cases go in the table as `NOK` / `blocked-needs-human`, not as a
fake pass.

## Prerequisites

- Ticket key from the upgrade branch / Jira (e.g. `HD-473`) — never invent one.
- Magento version + PHP version under test (e.g. `2.4.9` / `8.5`).
- Staging Magento URL and, for headless, storefront URL.
- Deploy / merge refs (pipeline #, GitHub Actions run, commit SHA, branch name).
- Current Cursor cloud agent id (`bc-…`) when running in Cursor Cloud — needed for artifact URLs.
- Media files already captured during Phase H (or capture them now before writing the report).

Composer / Packagist rules from **magento-upgrade** still apply if the report surfaces a fix that
needs a Happy Horizon / Experius bump: check Packagist **before** local patches. Do **not** add
module uninstall / remove / deinstall inventories to this report.

## Required artifacts

Save under `/opt/cursor/artifacts/`. Prefer a parallel copy under
`/opt/cursor/artifacts/jira-attachments/` with **stable, descriptive filenames** (ASCII, no spaces)
so Jira attach + cursor.com links stay stable.

### Screenshots (PNG)

| Suggested filename | Content |
|---|---|
| `screenshot_homepage_<locale>.png` | Homepage |
| `screenshot_plp_<slug>.png` | ≥1 category / PLP |
| `screenshot_search_<query>.png` | Search results (if search exists) |
| `screenshot_pdp_<sku-or-slug>.png` | PDP |
| `screenshot_checkout_address_form.png` | Checkout address |
| `screenshot_checkout_shipping.png` | Shipping (and delivery date if present) |
| `screenshot_cart_*.png` | Cart with project-critical customizations (file options, etc.) |
| `screenshot_order_confirmation.png` | Success page with **order number** when possible |

### Videos (MP4)

| Suggested filename | Content |
|---|---|
| `01_storefront_homepage_plp_pdp_zoeken.mp4` | Homepage → PLP → PDP → search |
| `02_storefront_gast_checkout.mp4` | Guest checkout → real order (offline payment) |
| `03_storefront_<critical_flow>.mp4` | Project-critical flow (file upload, configurable, etc.) |
| `04_backend_<verification>.mp4` | Admin / backend verification when relevant (order file, PDF print, product edit) |

Adapt filenames to the project; keep the **numbered prefix** so the report order is obvious.

## Link format (hard rule)

Every screenshot and video in the testrapport **MUST** be a **clickable public URL**. Never list
bare filenames alone, and never only `/opt/cursor/...` paths without a `https://` link.

### Preferred — Cursor agent artifact URLs

```text
https://cursor.com/agents/<bc-id>/artifacts?path=<url-encoded-absolute-path>
```

Example (encode `/` as `%2F`):

```markdown
* [screenshot_homepage_nl.png](https://cursor.com/agents/bc-6751dd3b-b831-48a9-a271-b6beeeffad3d/artifacts?path=%2Fopt%2Fcursor%2Fartifacts%2Fjira-attachments%2Fscreenshot_homepage_nl.png)
```

Build the query value with `python3 -c "import urllib.parse; print(urllib.parse.quote('/opt/cursor/artifacts/jira-attachments/file.png', safe=''))"`
or equivalent. Use the **current** agent `bc-…` id from the run (or the agent that produced the
files). Do not invent a `bc-` id.

### Also acceptable

- PR body embeds of the form `https://cursor.com/artifacts/c/art-…` when the platform provides them
  after attach.
- Jira: attach the same files to the issue **and** use wiki markup such as `!file.png|thumbnail!`
  for inline thumbs. **Still** list the `https://cursor.com/agents/.../artifacts?path=...` URLs in
  the PR / agent summary so reviewers can open media without Jira.

### Invalid

- `screenshot_homepage_nl.png` with no URL
- `/opt/cursor/artifacts/screenshot_homepage_nl.png` alone
- Claiming E2E / upgrade success without this testrapport **and** working media links

## Procedure

1. Confirm Phase H (or GraphQL fallback) results and collect order numbers / fail notes.
2. Ensure all required screenshots/videos exist under `/opt/cursor/artifacts/` (and
   `jira-attachments/` copies).
3. Resolve `BC_ID` (Cursor cloud agent id) and staging URLs / deploy refs.
4. Write `/opt/cursor/artifacts/Testrapport-<TICKET>.md` using the template below (fill every
   section; omit empty optional rows rather than inventing content).
5. Paste the **same** body into:
   - the PR summary / agent final comment, and
   - a Jira comment on the upgrade ticket when Atlassian tools are available (attach media files
     to the issue as well).
6. Spot-check 2–3 markdown links in a browser or via `curl -sI` — `200`/`302` is fine; `404` means
   fix the path encoding or file location before handoff.

## Output template (Dutch)

Replace placeholders. Keep the title pattern. **Do not** add a “Verwijderde modules” /
uninstall inventory section.

```markdown
**<TICKET> — Testrapport Magento <MAGENTO_VERSION> / PHP <PHP_VERSION>**

<DATE>. Staging Magento: [<MAGENTO_STAGING_HOST>](<MAGENTO_STAGING_URL>). Storefront: [<FE_HOST>](<FE_URL>).
Gemerged / gedeployed: `<BRANCH>` (deploy/ref `<DEPLOY_REF>`).

**Wat er kapot was**

* <Kort: probleem → fix / module of patch. Alleen echte regressies die je hebt gefixt.>

**Uitgevoerde tests**

| # | Case | Resultaat |
| --- | --- | --- |
| 1 | Homepage <locale> | OK / NOK |
| 2 | PLP <naam> | OK / NOK |
| 3 | Zoek “…” | OK / NOK |
| 4 | PDP … | OK / NOK |
| 5 | Gast-checkout (adres, verzending[, leverdatum]) | OK / NOK |
| 6 | GraphQL placeOrder / order | OK `<ORDER_NUMBER>` / NOK |
| 7 | <Projectkritieke flow> | OK / NOK |
| … | … | … |

**Screenshots**

* [screenshot_….png](https://cursor.com/agents/<BC_ID>/artifacts?path=<ENCODED_PATH>)
* …

**Video’s**

* [01_….mp4](https://cursor.com/agents/<BC_ID>/artifacts?path=<ENCODED_PATH>) — homepage, PLP, PDP, zoeken
* [02_….mp4](https://cursor.com/agents/<BC_ID>/artifacts?path=<ENCODED_PATH>) — gast-checkout
* [03_….mp4](https://cursor.com/agents/<BC_ID>/artifacts?path=<ENCODED_PATH>) — <kritieke flow>
* [04_….mp4](https://cursor.com/agents/<BC_ID>/artifacts?path=<ENCODED_PATH>) — backend verificatie

---

**Testplan voor <PROJECT> (staging)**

Magento: [<MAGENTO_STAGING_HOST>](<MAGENTO_STAGING_URL>)
Storefront: [<FE_HOST>](<FE_URL>)

**Catalogus**
Homepage. Categorie. Zoeken. Simpel product → winkelwagen.

**<Kritieke flow>**
<SKU / stappen / verwachte fouten>.

**Checkout**
Gast, adres, verzending[, leverdatum], betaalmethode. Order controleren in admin.

**Overig**
Contactformulier / admin product bewerken / order-PDF — wat relevant is.

**Let op**
<Cosmetische of bekende issues die géén NOK zijn.>

Terugkoppeling: OK/NOK per kop. Bij NOK: SKU, stappen, exacte fouttekst.
```

## Hard rules

- **MUST** produce this testrapport after a successful magento-upgrade Phase H / GraphQL fallback on
  the target env; “E2E pass” / “upgrade done” **without** the report + clickable media links is
  **invalid**.
- **MUST** use `https://cursor.com/agents/<bc-id>/artifacts?path=…` (or platform `art-` URLs) for
  every screenshot and video listed.
- **MUST NOT** include a verwijderde-modules / uninstall / deinstall inventory.
- **MUST NOT** invent ticket keys, order numbers, or `bc-` ids.
- Prefer Dutch body for Jira client handoff; PR may keep the same Dutch text (HD-473 pattern) or
  add a one-line English pointer above it — do not drop the Dutch report.
