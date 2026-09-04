---
name: magento-upgrade
description: Procedure for upgrading Magento Open Source to a new patch or minor version. Use when asked to upgrade Magento, bump the product-community-edition constraint, resolve composer conflicts after a Magento version bump, or fix setup:di:compile / magento:compile failures (e.g. Symfony Command::execute(): int). Also use when aligning deploy.settings.yml php_version / deploy_image, .github/workflows/ci.yml PHP inputs, or Hypernode Deploy settings after a Magento or PHP bump (including Magento 2.4.9 → PHP 8.5); when planning or running post-upgrade regression testing; or preparing an upgrade go-live — see upgrade-testplan.md. In Cursor Cloud, after compile succeeds the agent MUST bring up services, run the cloud-runnable portion of upgrade-testplan.md, and execute Phase H browser end-to-end testing (guest checkout with offline payment to a real order, account lifecycle) with video/screenshot artifacts in the PR — do not stop at composer/compile or curl smoke. For full Bitbucket→GitHub+Hypernode migrations use magento-github-hypernode-migrate.
---

# Magento Upgrade Skill

Upgrade procedure for Happy Horizon Magento 2 projects. Written against the Horizon Backend monorepo
(headless GraphQL, Hypernode Deploy) and extended with lessons from Holbox HD-473 (headless GraphQL +
Vercel storefront + Fastly, Bitbucket `experius/holbox`, Magento 2.4.9 / PHP 8.5). Steps 1–10 are the
composer, compile and CI/deploy mechanics; step 11 is the regression phase (including Phase H browser
E2E with PR artifacts), which is where most upgrade time actually goes.

Details to confirm per project before following the steps literally: the `magento/product-community-edition`
constraint style, the package pins in step 2, the deploy/CI surface in step 4 (`deploy.settings.yml`,
`.github/workflows/`, Bitbucket pipelines, stack-specific FE keys), and the patch tooling in step 7.
Frontend-heavy projects (Hyvä, Page Builder) and headless+Vercel stacks carry additional regression
surface that step 11 covers.

## Prerequisites

- Use a PHP CLI binary matching the **target** version (`php8.4` for 2.4.8-class bumps; `php8.5` for
  Magento **2.4.9**). Run all commands from the repo root so `auth.json` (repo.magento.com +
  packages.experius.nl / packages.happyhorizon.dev, plus Amasty/Mirasvit keys when present) is picked up.
- Set `COMPOSER_MEMORY_LIMIT=-1` for any composer operation touching Magento packages.
- Do **not** invent ticket keys, composer constraint pins, or patch filenames — derive them from
  `composer why-not` / `prohibits`, the project’s Jira, and patches.experius.nl / patches.happyhorizon.dev.

## Upgrade Steps

### 1. Edit `composer.json`

Change the `magento/product-community-edition` constraint:

```json
"magento/product-community-edition": ">=<new-version>"
```

Keep `>=` prefix per repo convention. Do NOT bump root `"version": "2.4.6"` — used by `replace: self.version` for local GraphQL modules.

### 2. Check for known conflicting pins

Run `composer why-not magento/product-community-edition <new-version>`. Known risky pins
(Horizon-Backend + Holbox-class stacks):

| Package / vendor | Issue |
|---|---|
| `smile/elasticsuite` | exact-version; bump to match new Magento + Symfony |
| `experius/emailcatcher` / `experius/module-emailcatcher` | exact-version; may be unpublished — bump or ask |
| `fastly/magento2` | `~1.2.x`; bump if a transitive dep drops |
| `magento/module-contact-graph-ql-pwa` | exact-version; bump if required |
| `symfony/finder` (dev) | `^6.4` conflicts on Symfony major bump |
| `symplify/monorepo-builder` (dev) | conflicts with Symfony 7+ |
| Amasty / Swissup / Mirasvit / Magezon (and similar) | may need **pinning**, licence renewal, or a vendor-compatible release for 2.4.9 / PHP 8.5 — resolve via `why-not` / vendor portal; do **not** invent pins |
| Aheadworks / Magetrend PDF | PHP 8.5 `imagedestroy()` deprecations — bump or local composer-patch |
| Elasticsearch client / engine | Magento 2.4.9 stacks move ES7 → ES8 / OpenSearch; align Hypernode search + modules |

Use `php8.5 /usr/local/bin/composer show -a <pkg>` (or `php8.4` on older targets) and
`composer prohibits <pkg> <ver>` to investigate. **Do not invent version pins** — only bump to
versions `show -a` / Marketplace / vendor portal actually list for the target Magento + PHP.

### 3. Run composer update

```bash
# Swap php8.5 for Magento 2.4.9; keep php8.4 for 2.4.8-class targets
COMPOSER_MEMORY_LIMIT=-1 php8.5 /usr/local/bin/composer update --with-all-dependencies --no-interaction \
  > /tmp/composer-update.log 2>&1
```

Takes 5–20 minutes. Poll with `tail -f /tmp/composer-update.log`.

### 4. Align CI, deploy and Hypernode settings

A Magento version bump often requires a PHP bump, and a PHP bump always requires the
GitHub Actions / Hypernode Deploy surface to move with it. Treat this as part of the
upgrade, not a follow-up. Full Bitbucket → GitHub + Hypernode Deploy migrations (shared
paths, `config.php` theme dumps, `env.php` build contract) live in the
**magento-github-hypernode-migrate** skill — this step covers only what an upgrade
must touch.

#### 4a. Always set `defaults.php_version` in `deploy.settings.yml`

```yaml
defaults:
  php_version: "8.5"   # Magento 2.4.9 → 8.5; use "8.4" for 2.4.8-class targets
```

- Scalar selects Deployer CLI **and** desired Hypernode platform PHP.
- On every deploy, `hypernode:settings:sync` compares live `hypernode-systemctl` values;
  on drift it maintenance-wraps and applies `--block`.
- **If omitted**, the project inherits the toolkit central default (`8.4` in
  `happy-horizon/actions` → `horizon-deploy/defaults/magento2.yml`). The deploy log
  then looks like `php_version (unknown) → 8.4` even when the node was already correct —
  wrong after a 2.4.9 / PHP 8.5 bump.
- `deploy_image` PHP tag alone does **not** pin platform PHP.
- Extra knobs such as `mysql_version` go under `hypernode_settings`, not as a substitute
  for `php_version`. Magento 2.4.9 may also need MariaDB / OpenSearch bumps on the node —
  confirm Adobe’s system requirements for the target, do not assume 2.4.8 hardware.

#### 4b. Pin `deploy_image` (per environment)

```yaml
environments:
  staging:
    deploy_image: quay.io/hypernode/deploy:4.8.0-php8.5-node22
  production:
    deploy_image: quay.io/hypernode/deploy:4.8.0-php8.5-node22
```

| Need | Image pattern |
|---|---|
| Magento 2.4.9 / PHP 8.5 (headless or Hyvä) | `4.8.0-php8.5-node20` or `…-node22` (confirm tag exists before pinning) |
| Magento 2.4.8 / PHP 8.4 | `4.8.0-php8.4-node20` or `…-node22` |
| Legacy Node 12 / PHP 7.4 (Snowdog) | `4.2.0-php7.4-node12` |

**Pin below 4.9.** hypernode-deploy 4.9+ can fatal on Magento’s Symfony
`http-client-contracts` v3 (`CurlResponse::getInfo` vs `ResponseInterface::getInfo(): mixed`)
via `deploy:hypernode-annotation` after an otherwise successful release. Avoid
`latest-php8.4-node22` / `latest-php8.5-node22` while `latest` tracks 4.9.

Resolution order: workflow `deploy_image` input → `environments.<stage>.deploy_image` →
toolkit fallback. Prefer pinning in YAML so `build.yml` / deploy workflows stay thin.

#### 4c. Update `.github/workflows/`

Reusable workflows from `happy-horizon/actions@production`:

| File | What to align on upgrade |
|---|---|
| `ci.yml` | `with.php_version` (and `composer_version` if Magento still needs Composer 2.2). The reusable `horizon-backend-magento-ci.yml` **defaults to PHP 8.2**, so omitting the input breaks `composer install` after an 8.3/8.4 Magento bump. Also keep any dedicated `di-compile` / `setup-php` job on the same PHP. Known inputs: `php_version`, `php_extensions`, `scan_path`, `composer_version`. |
| `build.yml` | Optional `with.deploy_image` pin (NRG-style). Usually omit and inherit the YAML stage image. |
| `deploy-staging.yml` / `deploy-production.yml` | Confirm `environment_url` and that they still `uses: happy-horizon/actions/…@production`. No PHP input here — PHP comes from `deploy.settings.yml`. |
| `preview.yml` | Keep skipped (`if: false`); nested reusable `uses:` fails permissions validation even when disabled. |

Ensure `.github` is **not** gitignored (horizon-backend has `#.github` commented — do not
uncomment). If the project is still on Bitbucket only, migrating workflows is a
**magento-github-hypernode-migrate** job, not an upgrade side-quest.

#### 4d. Bitbucket pipelines (if still present)

Update the top-level `image:` (e.g. `experiusnl/magento-2-docker-pipeline-image-apache-php8.5`
for 2.4.9 — Holbox HD-473 updated `bitbucket-pipelines.yml` as a dedicated commit). Keep the file
until staging is green on GitHub Actions — both Bitbucket and Hypernode Deploy paths sit in
central `deploy_excludes`. Holbox Magento still lived on **Bitbucket** (`experius/holbox`) during
the 2.4.9 bump; do not assume every Magento repo is already on GitHub.

#### 4e. Stack-specific `deploy.settings.yml` keys to re-check

Workflow files are nearly identical across stacks; differences live in YAML (+ CI inputs).
After a Magento / PHP bump, confirm the keys that match the project’s stack still make sense:

| Stack | Keys to verify |
|---|---|
| Headless GraphQL (`horizon-backend`, Holbox-class) | Thin YAML: `php_version` + environments (+ `cron_config` / `nginx_config` when `.hypernode/` trees exist). No snowdog/hyvä keys. Omitting `magento_themes` inherits central themes (`Magento/backend`) and **still runs SCD** — that is expected. Raise nginx `client_max_body_size` / PHP upload limits when products use file custom options (Holbox: ~128M/132M). |
| Hyvä Tailwind | `hyva_tailwind_dirs` (theme `web/tailwind` path(s)); `high_performance_static_deploy: true` needs Deploy **4.8+**. Set `high_performance_static_deploy: false` if custom modules ship frontend assets under `app/code/*/view/*/web` (Go SCD does not copy `app/code`). Keep `dev/css/minify_files` and `dev/js/minify_files` at `'0'` in committed `app/etc/config.php` — Magento minify requests `*.min.*` and 404s under HPSD; Tailwind `--minify` owns CSS. |
| Legacy Snowdog / Gulp | `snowdog_frontools_dirs`, `snowdog_frontools_node_version`; Node 12 images stop at hypernode-deploy **4.2.x**. Locale-map `magento_themes` needs Deploy 4.8+ — on 4.2 keep list form + `static_content_locales`. |
| Experius Connector projects | Same as Snowdog/Hyvä for FE keys; the build has **no DB**, so committed `app/etc/config.php` must carry `themes` + `scopes`. Do not stub a `db` block into build `env.php` — see migrate skill pitfalls (`No database connection…` / `Connection refused`). |

Admin themes belong under `magento_themes_backend`, not `magento_themes` — split SCD deploys
the latter as `--area=frontend` (only `Magento/backend` is auto-routed to adminhtml).

Staging `deploy_path: /data/web/deploy-staging` is required **only** when staging and
production share one Hypernode hostname; otherwise omit and keep the central
`/data/web/deploy` default on each node.

#### 4f. Sweep for stale PHP / image references

Adapt the pattern to the version being dropped:

```bash
grep -rn "8\.2\|8\.3\|php8\.2\|php8\.3\|php7\.4\|4\.2\.0-php\|latest-php" \
  deploy.settings.yml .github/ bitbucket-pipelines.yml horizon-deploy/ 2>/dev/null
```

Confirm the deploy log after the first post-upgrade release: `php_version` sync must stay
on the pinned value (not `(unknown) → 8.4` after an 8.5 bump).

### 5. Sync `magento/magento2-base` skeleton files

`magento/magento2-base` deploys updated skeleton files into tracked paths (`app/`, `bin/`, `dev/`, `lib/`, `pub/`, `setup/`, `.php-cs-fixer.dist.php`) during `composer update`. This can touch thousands of files — it is expected.

After the update, run `git status` to review all changes. Delete stray junk files (e.g. `patches.lock.json.bak`) before committing. Commit the base sync as a **separate commit** from the composer constraint changes.

### 6. Handle PHP/Symfony `Command::execute(): int` incompatibilities

When Magento bumps Symfony (e.g. 6.4 → 7.4 with 2.4.9), any vendor (or `app/code`) class extending
`Symfony\Component\Console\Command\Command` whose `execute()` lacks a `: int` return type fatals
during `setup:di:compile` (Hypernode `magento:compile`) with:

```text
Declaration of …::execute(…) must be compatible with Command::execute(…): int
```

**Scan the whole tree** (not only the package that failed first — the next compile step will hit the next bad command):

```bash
# List Console Command classes whose execute() is missing ": int"
find vendor app/code -path '*/Console/*Command*.php' -print0 \
  | xargs -0 rg -l 'function\s+execute\s*\([^)]*InputInterface' \
  | while read -r f; do rg -q 'function\s+execute\s*\([^)]*\)\s*:\s*int' "$f" || echo "$f"; done
```

For each hit, prefer **bumping the package** to a release that already has `: int`. Holbox HD-473
fixed several Experius modules **upstream** (then consumed via composer), not only as local patches:

| Package | Upstream HD-473 work |
|---|---|
| `experius/module-pagenotfound` | `Console/Command/Clean.php`, `Import.php` — [PR #54](https://github.com/experius/Magento-2-Module-PageNotFound/pull/54) |
| `experius/module-dblogger` | `CleanLogsCommand`, `CreateLogsCommand` — [PR #8](https://github.com/experius/Magento-2-Module-Experius-Dblogger/pull/8) |
| `experius/module-missingtranslations` | Collect / ToDatabase commands — [PR #42](https://github.com/experius/Magento-2-Module-Experius-MissingTranslations/pull/42) |

Horizon-Backend 2.4.9 also needed `elgentos/regenerate-catalog-urls` `~0.3.7` → `~0.4.9` plus local
patches for experius contentblock / contentpage / missingtranslations / taxrulesreset /
euvatvalidation / dblogger / ordergridextends when no release existed yet.

If no release exists, add a local patch under `patches/` and register it in `composer.patches.json`, then:

```bash
COMPOSER_MEMORY_LIMIT=-1 php8.5 /usr/local/bin/composer patches-relock --no-interaction
COMPOSER_MEMORY_LIMIT=-1 php8.5 /usr/local/bin/composer patches-repatch --no-interaction
```

Local patch rules:
- Depth-4 headers: `--- a/vendor/<vendor>/<package>/path/to/File.php`
- Add `: int` on `execute()`; if the method did not already `return`, add `return \Symfony\Component\Console\Command\Command::SUCCESS;`
- Preserve CRLF if the upstream file uses CRLF (otherwise `patch` fails with "different line endings")

### 6a. PHP 8.5 deprecations beyond Console Commands

Magento **2.4.9** is validated on **PHP 8.5**. Compile can be green while runtime fatals remain:

- `imagedestroy()` (and similar GD) calls in PDF / image vendors (Aheadworks FileService on Holbox)
  throw under PHP 8.5. Prefer a vendor bump; else a composer-patch that removes the deprecated calls.
- Grep after the bump: `rg -n 'imagedestroy\s*\(' vendor app/code` and exercise admin **order/invoice
  PDF print** on the target PHP — Wendy’s Holbox staging found 503s on invoice print until patched.
- Run static scans at the **target** PHP (`phpcs` PHPCompatibility / project CI), not only at 8.4.

### 6b. Magento 2.4.9 multi-file custom-option regression

On 2.4.9, `Magento\Framework\File\Http::isUploaded()` returns false when **any** file slot in the
request is empty — so a product with **two** file custom options fails add-to-cart after uploading
only one file (`De vereiste optie(s) van het product zijn niet ingevoerd.`). Holbox fixed this in
`Holbox_ProductCustomOptionImages`. On any shop with multi-file options: reproduce via GraphQL
multipart / storefront before calling the upgrade done; ship a project plugin/module, do not assume
core is fine. Also raise PHP `upload_max_filesize` / `post_max_size` and nginx body size — Holbox
defaulted to 2M/8M and large PDFs failed with CRITICAL content-type noise until limits were ~128M
and GraphQL returned a real error.

### 7. Verify patches apply

Patches are applied via `cweagans/composer-patches ^2.0`. The repo sets `"composer-exit-on-patch-failure": true` — a single failing patch aborts the entire install. If a patch fails, find an updated variant at [patches.experius.nl](https://patches.experius.nl/patches/experius/) (e.g. replace `_2.4.8_` with `_2.4.9_` in the filename), or add a local patch under `patches/`. If no fix exists, report BLOCKED.

Note that editing `composer.patches.json` alone applies nothing — `patches.lock.json` still pins the
old set and composer caches downloaded patches, so a relock, cache clear and package reinstall are all
required, and the patched file must be checked on disk. See the **magento-patches** skill for that
sequence, for generating a local patch against pristine sources, and for applying Adobe isolated
security patches.

### 8. Run `setup:di:compile` (mandatory)

`bin/magento --version` alone does **not** load every Console Command. Hypernode build runs `magento:compile` (= `setup:di:compile`), which does. Reproduce locally with a throwaway `app/etc/env.php` (gitignored — do not commit):

```bash
# Minimal env.php is enough; compile does not need a live DB (bootstrap may warn).
# Use php8.5 for Magento 2.4.9 targets.
MAGE_MODE=production php8.5 -d memory_limit=2G bin/magento setup:di:compile
# Must print: Generated code and dependency injection configuration successfully.
```

CI enforces this via the `di-compile` job in `.github/workflows/ci.yml` (or Bitbucket pipelines).
Keep that job on the **same** PHP as `deploy.settings.yml`. Compile green ≠ shop works — continue to
step 11 (Holbox still found cart, PDF, admin product-edit, and upload bugs after backend compile/deploy).

### 9. Verification checklist

All must pass (swap `php8.5` ↔ `php8.4` to match the target):

```bash
php8.5 /usr/local/bin/composer validate --no-check-publish
grep -A1 '"name": "magento/product-community-edition"' composer.lock | grep version
php8.5 bin/magento --version
php8.5 /usr/local/bin/composer dump-autoload -o
MAGE_MODE=production php8.5 -d memory_limit=2G bin/magento setup:di:compile
```

### 10. Commit

Use separate commits:

- **Commit A** — `composer.json`, `composer.lock`, `patches.lock.json` (if changed), `composer.patches.json` (if changed), `patches/` (new local patch files).
- **Commit B** — All base skeleton files from `magento/magento2-base` (`app/`, `bin/`, `dev/`, `lib/`, `pub/`, `setup/`, `.php-cs-fixer.dist.php`).
- **Commit C** (if needed) — `deploy.settings.yml` (`php_version`, `deploy_image`, stack FE keys, nginx upload limits),
  `.github/workflows/ci.yml` (and related workflow PHP / image pins), `bitbucket-pipelines.yml`.
- **Commit D** (if needed) — project fixes found in regression (file-option plugins, PDF patches).

Commit message format follows the **target** repo (e.g. Holbox/Bitbucket `HD-473 - …` or
`[FEATURE][HD-473] …`; marketplace uses `ILDT-*`). Ask the user for the ticket if not known —
**never invent one**. Prefer the Jira key already on the upgrade branch (`feature/HD-473`).

Do NOT commit: `vendor/`, `auth.json`, `app/etc/env.php`, `generated/`.
Do NOT bump Magento module `setup_version` / `db_schema` versions casually, lock
`composer.json` `"version"` used by `replace: self.version`, or stop after compile without step 11.

### 11. Post-upgrade regression testing

A green `setup:di:compile` means the build works, not that the shop works. On NRC-210 the composer and
compile work above was budgeted at 2 days; the regression phase that follows ran for months and
produced 60+ tickets. Do not treat the upgrade as done, or hand it to testers, before walking
[upgrade-testplan.md](upgrade-testplan.md).

That plan gates on environment readiness (stale DB / missing CMS / reCAPTCHA domain → false
defects), automated sweeps (deprecations, console errors, missing assets, visual deltas),
**Phase H browser end-to-end** (guest order + account + artifacts), and the database-only settings
that must be re-applied at go-live.

#### Phase H — browser E2E with artifacts (mandatory when a storefront exists)

Compile + GraphQL/`curl` smoke are necessary but not sufficient. After those are green, run
**Phase H** in [upgrade-testplan.md](upgrade-testplan.md) (pattern from
[Horizon-Storefront#330](https://github.com/Happy-Horizon/Horizon-Storefront/pull/330)):

1. **H0** — Point the project FE at the upgraded Magento (headless: storefront GraphQL URL =
   upgrade candidate; Hyvä/Luma: Magento storefront URL). Validate a Simple/child SKU via GraphQL
   `addProductsToCart` before opening a browser.
2. **H1** — Guest checkout: category → PDP → cart → address → shipping → **offline payment**
   (`checkmo` / Check Money order) → success page with a **real order number**. Paid gateways
   stay `blocked-needs-human`; offline order placement is required.
3. **H2** — Account: register → protected pages while logged in → logout → login.
4. **H3** — Add-to-cart shows immediate UI feedback (toast / minicart / badge).
5. **H4** — Attach video + order-confirmation screenshot to the PR / agent summary
   (`guest_checkout_catalog_to_order_placed.mp4`,
   `account_register_protected_pages_logout_login.mp4`, success still). Cloud: “E2E pass”
   without artifacts is invalid.
6. **H5** — List pre-existing issues separately (reproduced on previous Magento / raw GraphQL /
   production); do not fix out-of-scope FE bugs on the Magento upgrade branch unless agreed.

If **no** storefront URL can be started or supplied: run the GraphQL `placeOrder` fallback in the
test plan, mark browser H1–H4 `blocked-needs-human`, and say so explicitly. Do **not** declare
upgrade complete on compile + `curl` alone when a storefront URL exists.

#### Cursor Cloud agents — execute the test plan in the VM

When this skill runs in a **Cursor Cloud** agent (or any isolated cloud VM with the Magento
services available), **stopping after step 8–10 is incorrect**. After compile is green:

1. Read the project’s cloud instructions (`AGENTS.md`, `.cursor/CLOUD.md`, or equivalent) and
   **start required services** (MySQL, OpenSearch/Elasticsearch — Holbox moved ES7 → ES8 — PHP-FPM /
   built-in server). They are often not auto-started on a fresh VM.
2. Open [upgrade-testplan.md](upgrade-testplan.md) and run every check marked **cloud-runnable**
   there (Phase B sweeps, GraphQL/HTTP smoke, static scans, log crawls, asset 404 checks, **and
   Phase H** when a storefront URL exists — or the GraphQL placeOrder fallback when it does not).
   Prefer the project’s documented smoke tests (e.g. headless GraphQL `storeConfig` + `products`
   search) before browser E2E.
3. **Holbox-proven extras the agent MUST attempt** when the catalog uses them (mark
   `blocked-needs-human` only if the VM truly cannot):
   - GraphQL `placeOrder` with offline payment (Holbox: `STAGING…` order numbers in the report).
   - Product with **≥2 file custom options**: upload one file → cart must succeed; wrong extension
     must error cleanly; large PDF (> previous PHP limit) must not CRITICAL.
   - Admin: open/edit a known product (no EAV/attribute crash); print order/invoice PDF on the
     target PHP.
   - Contact form with attachment when the form exists.
   - Delivery-date still selectable when the project uses a delivery-date module.
4. Record results in the PR / agent summary as `pass` / `fail` / `env-artifact` / `blocked-needs-human`
   per the test plan’s triage rules. Embed Phase H artifact URLs. Fix `fail` items that are in
   scope for the upgrade branch before declaring the upgrade complete.
5. Explicitly list what could **not** be run in cloud (production visual diffs, tablet viewports,
   **paid** gateways, confirmation-email images, FTP, reCAPTCHA domain whitelist, **Vercel SSO**
   on `*.happyhorizon.dev` storefronts when the agent lacks auth) as `blocked-needs-human` — do
   not silently skip them or mark them pass. Offline-payment checkout is **not** in that blocked
   list when Magento/GraphQL is reachable.
6. Do **not** claim “upgrade done” or hand off to human testers until the cloud-runnable portion
   (including Phase H or GraphQL fallback) has been executed and reported.

Local / laptop agents should still walk the same plan; cloud simply has no excuse to skip the
parts the VM can exercise.

## Hard rules (agents)

- Do **not** lock or rewrite root `composer.json` `"version"` used by `replace: self.version`.
- Do **not** bump Magento module `setup_version` / invent `db_schema` revisions to “force” upgrade.
- Do **not** stop at `setup:di:compile` or `bin/magento --version` and call the upgrade complete.
- Do **not** pin `deploy_image: …/latest-php…` while hypernode-deploy 4.9+ is unsafe.
- Do **not** invent Jira tickets, third-party version pins, or patch filenames.
- Do **not** confuse Holbox Magento (`experius/holbox`, HD-*) with `holbox-m2-frontend` / NEXT-*
  Horizon Storefront work — different repos and skills.

## Known Upgrade History

| From | To | PR / Branch | Key constraint changes |
|---|---|---|---|
| 2.4.8-p3 | 2.4.9 | feature/magento-2-4-9-upgrade-daaa (Horizon-Backend) | emailcatcher 4.4.0→4.5.2; elasticsuite 2.11.16→2.11.19; elgentos/regenerate-catalog-urls ~0.3.7→~0.4.9; local Symfony 7 `execute(): int` patches for experius contentblock/contentpage/missingtranslations/taxrulesreset/euvatvalidation/dblogger/ordergridextends |
| ~2.4.6-p14 | 2.4.9 / PHP 8.5 | Holbox [HD-473](https://ct-happyhorizon.atlassian.net/browse/HD-473); Bitbucket `experius/holbox` `feature/HD-473` (pipelines #786/#795/#796); regression agent `bc-6751dd3b-b831-48a9-a271-b6beeeffad3d`; staging `shopdirect.holbox.nl.happyhorizon.dev` + FE `www.holbox.nl.happyhorizon.dev` | Headless GraphQL + Vercel/Fastly (not Hyvä). ES7→8; upstream Experius `execute(): int` / PHP 8.5 PRs (pagenotfound, dblogger, missingtranslations); `Holbox_ProductCustomOptionImages` for 2.4.9 multi-file `Http::isUploaded()`; Aheadworks PDF `imagedestroy()` patch; upload limits ~128M/132M; `bitbucket-pipelines.yml` PHP bump |
