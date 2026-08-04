---
name: magento-github-hypernode-migrate
description: >-
  Migrates Magento Hypernode projects to GitHub Actions with happy-horizon/actions
  and deploy.settings.yml. Covers legacy Snowdog/Gulp Sass, Hyvä Tailwind, and
  headless GraphQL backends. Use when copying .github workflows, migrating from
  Bitbucket, pinning php_version, probing staging Hypernode shared/ symlinks,
  dumping live themes/scopes into app/etc/config.php, mapping
  .exclude-files-deploy / .include-files-deploy into shared_files/shared_folders,
  configuring staging/production Hypernode deploy, or choosing between
  nrg-europe / hyva-demo / horizon-backend / emga-m2 / directplant-m2 patterns.
  Also use when a build or deploy fails with "No database connection was found
  in any of the env.php config files" or SCD hits SQLSTATE[HY000] [2002]
  Connection refused.
---

# Magento GitHub + Hypernode Deploy Migration

## Pick a reference stack

Workflow files are nearly identical. Differences live in `deploy.settings.yml` (+ CI inputs).

| Stack | Copy shape from | FE build keys |
|-------|-----------------|---------------|
| Legacy Sass / Snowdog Gulp | `nrg-europe` | `snowdog_frontools_dirs`, `snowdog_frontools_node_version` |
| Legacy Sass + Experius Connector | `emga-m2` | same as NRG, but PHP 8.2 / Deploy 4.8 + locale-map split SCD |
| Hyvä Tailwind | `hyva-demo` / Maene | `hyva_tailwind_dirs`, `high_performance_static_deploy` |
| Headless GraphQL backend | `horizon-backend` | none (no snowdog/hyva); thin YAML |

Toolkit docs: `happy-horizon/actions` → `horizon-deploy/README.md`.  
Central defaults: `horizon-deploy/defaults/magento2.yml` (`php_version: "8.4"`).

For side-by-side key tables see [reference.md](reference.md).

## Critical: always set `php_version`

```yaml
defaults:
  php_version: "8.2"   # example — must match Hypernode + Magento
```

- Scalar selects Deployer CLI **and** desired Hypernode platform PHP.
- On every deploy, `hypernode:settings:sync` compares live `hypernode-systemctl` values; on drift it maintenance-wraps and applies `--block`.
- **If omitted**, project inherits central **`8.4`** → log looks like `php_version (unknown) → 8.4` even when the node was already on 8.2.
- `deploy_image` PHP tag alone does **not** pin platform PHP.

Also set CI explicitly — reusable `horizon-backend-magento-ci.yml` defaults to **`8.2`**:

```yaml
# .github/workflows/ci.yml
with:
  php_version: '8.2'   # or 7.4 / 8.4 to match Magento
```

## Migration checklist (all stacks)

1. Copy `.github/workflows/` from the matching reference (`build`, `ci`, `deploy-staging`, `deploy-production`, `preview`).
2. Ensure `.github` is **not** gitignored (horizon-backend has `#.github` commented — do not uncomment).
3. Add `deploy.settings.yml` with `defaults.php_version` + `environments` (domain, username, servers, `deploy_image`).
4. Fill `shared_files` / `shared_folders` from the legacy rsync pair when present (see **Shared paths from `.include-files-deploy`**). **SSH-probe the staging Hypernode** and prefer live `shared/` symlinks over guessing (see **Probe staging Hypernode**).
5. Align `ci.yml` `php_version` (and `composer_version` if needed) with Magento. Set `scan_path` from Bitbucket `Test/static/run.sh` args when present (e.g. `app/code/Vendor … app/design`).
6. Dump live `themes` + `scopes` from staging DB into committed `app/etc/config.php`, plus `system.default.dev` (sign/minify/merge) from live `bin/magento config:get` on staging (cross-check `deploy.sh` `config:set`). Minify is read from the dump at build, not deploy-time `config:set`. The build container has **no database**, so that dump is how Magento resolves themes during SCD. For **Hyvä**, set `dev/css/minify_files` to `0` (see Hyvä section).
7. Snowdog: ensure `tools` → `vendor/snowdog/frontools` symlink is tracked (un-ignore `/tools` in `.gitignore` if needed).
8. Optional: `composer require --dev experius/module-testsuite` (`--ignore-platform-req=php` if local CLI PHP mismatches).
9. Push working branch; merge to `staging` so Actions deploy runs. When merging into an older `staging`, re-check `composer.json` `replace` (page-builder) — auto-merge can drop master's CE `replace` entries and break CI.
10. Confirm deploy log: `php_version` sync stays on the pinned value. After first Hypernode Deploy release, **re-probe** `current/var` symlinks and tighten `shared_*` to match.

Do **not** commit `deploy.php` — CI copies it from the toolkit.

## Probe staging Hypernode (shared + config dump)

Do this early (and again after the first deploy that creates `releases/`). Username is almost always `app`.

### 1. Find Magento root + PHP

```bash
ssh app@STAGING.hypernode.io 'php -v | head -1; ls /data/web/'
# Classic Bitbucket rsync:     /data/web/magento2
# After Hypernode Deploy:      /data/web/deploy/current  (+ deploy/shared)
```

Use classic `magento2` for the first dump; after migration prefer `deploy/current`.

### 2. List live `var/` shared symlinks → `shared_*`

After `setup-shared-symlinks` / first deploy, release `var/*` entries look like:

```text
lrwxrwxrwx … cache -> ../../deploy/shared/var/cache
lrwxrwxrwx … .htaccess -> ../../deploy/shared/var/.htaccess
```

Probe:

```bash
# Hypernode Deploy layout
ssh app@STAGING.hypernode.io 'ls -la /data/web/deploy/current/var' 

# Or classic layout (pre-migrate) — list durable dirs/files under var/
ssh app@STAGING.hypernode.io 'ls -la /data/web/magento2/var'
```

Mapping rules from that listing:

| Symlink target kind | YAML key |
|---------------------|----------|
| Directory (e.g. `cache`, `log`, `export`) | `shared_folders`: `var/<name>` |
| File (e.g. `.htaccess`, `resource_config.json`) | `shared_files`: `var/<name>` |
| Not a symlink (often `view_preprocessed`, `generation`, `di`) | **omit** — release-local |

Also keep non-`var` shared from exclude/include (`app/etc/env.php`, `pub/media`, `auth.json`, …). When the live listing and exclude/include disagree on a `var/*` file, **prefer the live symlink list**.

### 3. Dump themes + scopes from the live DB → `config.php`

Build has no DB. Commit what Magento would load from `theme` / `store_*` tables:

```bash
ssh app@STAGING.hypernode.io 'cd /data/web/magento2 && php -r "
require \"app/bootstrap.php\";
\$om = \Magento\Framework\App\Bootstrap::create(BP, \$_SERVER)->getObjectManager();
\$c = \$om->get(\Magento\Framework\App\ResourceConnection::class)->getConnection();
echo \"---themes---\n\";
foreach (\$c->fetchAll(\"SELECT theme_id, parent_id, theme_path, theme_title, area, code FROM theme ORDER BY theme_id\") as \$r) {
  echo implode(\"|\", \$r), \"\n\";
}
echo \"---websites---\n\";
foreach (\$c->fetchAll(\"SELECT website_id, code, name, sort_order, default_group_id, is_default FROM store_website ORDER BY website_id\") as \$r) {
  echo implode(\"|\", \$r), \"\n\";
}
echo \"---groups---\n\";
foreach (\$c->fetchAll(\"SELECT group_id, website_id, name, root_category_id, default_store_id, code FROM store_group ORDER BY group_id\") as \$r) {
  echo implode(\"|\", \$r), \"\n\";
}
echo \"---stores---\n\";
foreach (\$c->fetchAll(\"SELECT store_id, code, website_id, group_id, name, sort_order, is_active FROM store ORDER BY store_id\") as \$r) {
  echo implode(\"|\", \$r), \"\n\";
}
"'
```

Write into committed `app/etc/config.php` (same shape as emga-m2 / nrg-europe):

- `themes` — every row (blank/luma/backend + vendor themes). SQL `parent_id` is numeric — map it to the parent theme's **code** string in config (e.g. `4` → `Experius/whitelabel`). Root themes use `null`.
- `scopes` — `websites` / `groups` / `stores` from the queries (preserve live `default_store_id` even if odd). Include Experius contentpage/contentblock root ids on groups when the live table has those columns.
- `system.default.dev` — from live `config:get` below (prefer over guessing). Cross-check `deploy.sh` `config:set`. Hyvä: force minify off (see Hyvä section).

Cross-check `magento_themes` / `magento_themes_backend` in YAML against **`deploy.sh` SCD lines** (not only the `FRONTEND_THEMES` comments — the `DEPLOY_STATIC+=` commands are authoritative).

### 4. Dump static / JS / CSS merge+minify (+ related) via `config:get`

Prefer the **live** values on staging over outdated `deploy.sh` comments. From the Magento root:

```bash
ssh app@STAGING.hypernode.io 'cd /data/web/magento2 && for p in \
  dev/static/sign \
  dev/css/merge_css_files \
  dev/css/minify_files \
  dev/js/merge_files \
  dev/js/minify_files \
  dev/js/enable_js_bundling \
  dev/js/move_script_to_bottom \
  dev/translate_inline/active \
  dev/translate_inline/active_admin \
; do printf "%s=" "$p"; php bin/magento config:get "$p" 2>/dev/null || echo "(unset)"; done'
```

After Hypernode Deploy, use `/data/web/deploy/current` instead of `magento2`.

Map into committed `app/etc/config.php`:

```php
'system' => [
    'default' => [
        'dev' => [
            'static' => [
                'sign' => '<dev/static/sign>',
            ],
            'css' => [
                'merge_css_files' => '<dev/css/merge_css_files>',
                'minify_files' => '<dev/css/minify_files>',
            ],
            'js' => [
                'merge_files' => '<dev/js/merge_files>',
                'minify_files' => '<dev/js/minify_files>',
                'enable_js_bundling' => '<dev/js/enable_js_bundling>',
                // optional if set:
                // 'move_script_to_bottom' => '<dev/js/move_script_to_bottom>',
            ],
            'translate_inline' => [
                'active' => '<dev/translate_inline/active>',
                'active_admin' => '<dev/translate_inline/active_admin>',
            ],
        ],
        // …
    ],
],
```

Notes:

- Values are usually `'0'` / `'1'` strings — keep that shape in the dump.
- If `config:get` prints empty / `(unset)`, fall back to `deploy.sh` `config:set` for that path.
- **Hyvä:** still set css/js `minify_files` → `'0'` even if production currently has Magento minify on (see Hyvä section); Tailwind handles CSS minify.
- Legacy Gulp/Luma: keep live minify/merge when the theme relies on Magento SCD minification.

## Build has no database: the `env.php` contract

The build container never gets DB credentials, yet Magento writes a cache-types-only `app/etc/env.php` during `setup:di:compile` **and** during every `setup:static-content:deploy` run. Two failure modes follow, both fixed centrally in `happy-horizon/actions` (`horizon-deploy/src/Bootstrap.php`, on `production` since 2026-07-31):

| Symptom | Cause | Toolkit behavior now |
|---------|-------|----------------------|
| `No database connection was found in any of the env.php config files` during SCD | `experius/connector-interface-magento`'s `registration.php` (composer `files` autoloader) aborts when `env.php` exists without a `db` section | `rm -f app/etc/env.php` is prepended to **every** SCD command, including each split-SCD per-theme command |
| Same error at the very start of the **deploy** stage | The toolkit used to `require` the project `vendor/autoload.php`, re-running that `registration.php` | `Bootstrap::ensureAutoload()` skips it — `hypernode-deploy` already ships `symfony/yaml` |

What this means for a migration:

- Keep `app/etc/config.php` committed with `themes` **and** `scopes`. With no `env.php`, that dump is the only theme source; a missing `themes` node means SCD silently deploys nothing for those themes.
- Keep the real `env.php` in `shared_files` (central default already does). On the server it is a symlink into `shared/`, so removal is guarded to the `build` host only.
- Nothing to add to `build_tasks` — the guard is automatic, also for projects that define their own `build_tasks`.
- Pin the toolkit ref at `@production` so projects pick this up; older refs still fail on connector projects.

**Never “fix” this by stubbing a dummy `db` block into `env.php`.** A present `db` section makes Magento treat the database as available, so theme resolution actually dials it and SCD dies on `PDOException SQLSTATE[HY000] [2002] Connection refused` instead. Absent `env.php` is the working state, not a stubbed one. (An earlier `magento:build:stub-env` experiment in the toolkit did exactly this and was reverted.)

## Shared paths from `.include-files-deploy`

Legacy Experius Bitbucket deploys use an rsync exclude/include pair. **Always read both when available** and map them into `deploy.settings.yml` — do **not** share whole `var/` blindly.

| File | Meaning in rsync | Hypernode Deploy mapping |
|------|------------------|--------------------------|
| `.exclude-files-deploy` | Paths **not** overwritten by deploy (stay on server) | Candidates for `shared_files` / `shared_folders` |
| `.include-files-deploy` | Exceptions to exclude — **shipped with each release** | Must stay **release-local** (omit from shared) |

Typical Emga / Experius include list:

```text
var/generation/
var/di/
var/view_preprocessed/
var/xp-varnish.vcl
```

Rules when `.exclude-files-deploy` contains `var/` (or similar parent) **and** `.include-files-deploy` exists:

1. **Do not** put `var` (whole tree) in `shared_folders`.
2. Put durable `var/*` children in `shared_folders` / `shared_files` (central defaults + anything the project needs: `log`, `session`, `report`, `export`, …).
3. **Omit** include-listed dirs from shared (`generation`, `di`, `view_preprocessed`) — they are build/SCD output per release.
4. Files in the include list that are **not in git** (often `var/xp-varnish.vcl` under `/var/*` gitignore) still need to **persist** → put them in `shared_files` even though the include file listed them as “deployed”.
5. When the Hypernode already has `releases/*/var/*` (or `current/var/*`) symlinks into `shared/`, **prefer that live listing** over guessing — add every shared symlink (folders → `shared_folders`, files → `shared_files`); leave non-symlink dirs (e.g. `view_preprocessed`) release-local. See **Probe staging Hypernode**.
6. `setup-shared-symlinks` in `happy-horizon/actions` (`bin/setup-shared-symlinks`) understands the same exclude/include pair. Keep YAML `shared_*` and those files consistent.
7. After the first successful Hypernode Deploy, re-run the `ls -la …/current/var` probe and update YAML if new shared files appeared (e.g. `var/section_example_for_import.csv`).

If neither exclude/include file exists, fall back to reference-project `shared_*` (NRG/Maene style) or central toolkit defaults only.

## Stack-specific settings

### Legacy Gulp / Snowdog (`nrg-europe`)

```yaml
defaults:
  php_version: "7.4"
  variables:
    build:
      composer_self_update: "2.2"
      static_content_locales: "en_US nl_NL"
      magento_themes:          # list form — locale map needs Deploy 4.8+
        - Magento/backend
        - Vendor/theme
      snowdog_frontools_dirs:
        - tools                 # → vendor/snowdog/frontools
      snowdog_frontools_node_version: "12.22.12"
environments:
  staging:
    deploy_image: quay.io/hypernode/deploy:4.2.0-php7.4-node12
```

- CI: `php_version: '7.4'` + `composer_version: '2.2'` (Magento 2.4.3 / laminas).
- Optionally pin the same image on `build.yml` `with.deploy_image` (NRG does this).
- Node 12 images stop at hypernode-deploy **4.2.x**.
- Gulp runs after SCD via actions hook `snowdog:frontools:styles` (keys consumed by actions, not Bootstrap.php).

### Legacy Sass + Experius Connector (`emga-m2`)

Same Snowdog keys as NRG, but on a modern image with split SCD:

```yaml
defaults:
  php_version: "8.2"
  variables:
    build:
      magento_themes:          # locale map → split SCD, one command per theme
        Emga/default: "en_US nl_NL de_DE fr_FR"
      magento_themes_backend:
        Magento/backend: "en_US nl_NL de_DE fr_FR"
      snowdog_frontools_dirs:
        - tools
environments:
  staging:
    deploy_image: quay.io/hypernode/deploy:4.8.0-php8.2-node20
```

- Any project requiring `experius/connector-*` depends on the `env.php` contract above — verify the deploy log shows adminhtml **and** frontend SCD completing, not a `No database connection` abort.
- Legacy `deploy.sh` / `bitbucket-pipelines.yml` are the source of truth for themes and locales; the Bitbucket pipeline attached a real MariaDB service, which is why the connector never surfaced there. Read `deploy.sh`'s `setup:static-content:deploy` lines, and keep both files until staging is green (both sit in central `deploy_excludes`).
- Emga's own YAML still lists `Magento/backend` inside `magento_themes`; prefer the split above so admin locales reach `--area=adminhtml`.

### Hyvä (`hyva-demo` / Maene)

```yaml
defaults:
  php_version: "8.2"   # or 8.4 — set explicitly; do not omit
  variables:
    build:
      magento_themes:        # locale map → split SCD (4.8+)
        Vendor/theme: "en_US nl_NL"
        Magento/backend: "en_US nl_NL"
      hyva_tailwind_dirs:
        - app/design/frontend/Vendor/theme/web/tailwind
      high_performance_static_deploy: true
environments:
  staging:
    deploy_image: quay.io/hypernode/deploy:4.8.0-php8.2-node20
    # deploy_path: only when staging + production share one Hypernode — see below
```

- Tailwind must build **before** SCD (`hyva:tailwind:build` is a no-op unless dirs set).
- `high_performance_static_deploy` needs Deploy **4.8+**.
- **HPSD skips `app/code`:** elgentos Go SCD copies vendor + theme + `lib/web` only — **not** `app/code/*/view/*/web`. If the project has custom modules with frontend JS/CSS under `app/code` (e.g. `Duo_CheckoutCustomForm`), set `high_performance_static_deploy: false` and use native Magento SCD.
- Match themes/locales to existing `deploy.sh` SCD if present.

**Hyvä only — disable Magento CSS/JS minify** (`config.php`):

```php
'system' => [
    'default' => [
        'dev' => [
            'js' => [
                'merge_files' => '0',
                'enable_js_bundling' => '0',
                'minify_files' => '0', // Magento would request *.min.js
                'move_script_to_bottom' => '0',
            ],
            'css' => [
                'merge_css_files' => '0',
                // Tailwind `npm run build --minify` writes minified styles.css.
                'minify_files' => '0',
            ],
            'static' => ['sign' => '1'],
        ],
    ],
],
```

Do **not** apply Magento minify-off to legacy Luma/Gulp stacks if those themes rely on Magento SCD minification.

## Staging `deploy_path` (same Hypernode only)

Central default is `/data/web/deploy`.

| Staging vs production Hypernode | Staging `variables.deploy.deploy_path` |
|---------------------------------|----------------------------------------|
| **Same** hostname (e.g. hyva-demo, nrg-europe) | Set `/data/web/deploy-staging` so releases do not clash with production |
| **Different** hostnames (e.g. Maene `maenedev` vs `maene`) | Omit — keep default `/data/web/deploy` on each node |

```yaml
# Only when environments.staging.servers and environments.production.servers
# use the same hostname:
environments:
  staging:
    variables:
      deploy:
        deploy_path: /data/web/deploy-staging
```

### Headless (`horizon-backend`)

```yaml
defaults:
  php_version: "8.4"
environments:
  staging:
    domain: …
    username: app
    deploy_image: quay.io/hypernode/deploy:4.8.0-php8.4-node22
    servers:
      - hostname: ….hypernode.io
    cron_config: .hypernode/staging/cron
    nginx_config: .hypernode/staging/nginx
```

- Thin project YAML: no snowdog/hyva keys; often no project `shared_*` (central defaults apply).
- **Headless ≠ skip SCD.** Omitting `magento_themes` inherits central themes (currently `Magento/backend`) and still runs `magento:deploy:assets`. Override themes/`build_tasks` only if you intentionally want less SCD.
- Wire `cron_config` / `nginx_config` only when `.hypernode/` trees exist on disk.
- Storefront lives elsewhere (GraphQL backend role) — see project `AGENTS.md`.

## Deploy image rules

Resolution order: workflow `deploy_image` → `environments.<stage>.deploy_image` → toolkit fallback.

| Need | Image pattern |
|------|----------------|
| Legacy Node 12 / PHP 7.4 | `4.2.0-php7.4-node12` |
| Modern Magento / Hyvä | `4.8.0-php8.x-node20` or `…-node22` |

**Pin &lt; 4.9:** hypernode-deploy 4.9+ can fatal on Magento’s Symfony http-client-contracts v3 (`CurlResponse::getInfo`). Avoid `latest-php8.4-node22` while it tracks 4.9.

## Workflow skeleton

| File | Typical behavior |
|------|------------------|
| `ci.yml` | feature/bugfix/develop/staging/production (+ PRs); set `php_version` (+ `scan_path` from Bitbucket static paths) |
| `deploy-staging.yml` | push `staging` + `workflow_dispatch`; set `environment_url` |
| `deploy-production.yml` | `workflow_dispatch`; `concurrency: production`; artifact name |
| `build.yml` | push `production` → artifact; skip with `if: false` until prod ready |
| `preview.yml` | keep skipped (`if: false`); nested reusable `uses:` fails permissions validation even when disabled |

Reusable workflows (ref `@production`):

- `horizon-backend-magento-ci.yml`
- `horizon-backend-hypernode-deploy.yml`
- `horizon-backend-hypernode-build.yml`

## Pitfalls

| Symptom | Fix |
|---------|-----|
| Sync sets PHP 8.4 | Set `defaults.php_version` |
| CI on wrong PHP | Set `ci.yml` `with.php_version` (default 8.2) |
| Workflows missing from git | Remove/comment `.github` in `.gitignore` |
| Hyvä CSS missing before SCD | Set `hyva_tailwind_dirs` |
| Locale-map themes on 4.2 image | Use list themes + `static_content_locales` |
| `cron_config` path missing | Omit key or add `.hypernode/…` files |
| Stage override empties shared lists | Stage maps **replace** (not merge) central `shared_*` / `variables` — see toolkit README |
| Wrong staging `deploy_path` | Use `/data/web/deploy-staging` **only** when staging and production share one Hypernode; otherwise omit |
| Hyvä `styles.min.css` / `*.min.js` 404 | Set `dev/css/minify_files` and `dev/js/minify_files` → `0` (Hyvä only); Tailwind `--minify` for CSS |
| `app/code` module JS/CSS 404 with HPSD | Set `high_performance_static_deploy: false` — Go SCD does not copy `app/code` web assets |
| Custom admin theme CSS/JS 404 (`adminhtml/Vendor/...`) | Put admin themes in `magento_themes_backend`, not `magento_themes`. Split SCD deploys `magento_themes` as `--area=frontend` (only `Magento/backend` is auto-routed to adminhtml). Example: `Duo/CustomAdmin` must be under `magento_themes_backend` |
| `No database connection was found in any of the env.php config files` | Experius Connector + build-written `env.php`. Bump the toolkit ref to current `@production`; confirm `app/etc/config.php` has `themes` + `scopes`. Do not stub a `db` block |
| SCD dies with `SQLSTATE[HY000] [2002] Connection refused` | An `env.php` with a `db` section exists in the DB-less build container (stub or committed leftover) — remove it, don't point it at `127.0.0.1` |
| SCD runs, but a theme gets no files | `themes` node missing from the committed `app/etc/config.php` dump; the build has no DB to fall back on |
| Admin locales missing / extra frontend SCD pass for `Magento/backend` | `magento_themes` is deployed `--area=frontend`, so a backend theme there costs a wasted pass and its locales never reach adminhtml. Mirror the legacy `deploy.sh --area adminhtml` locale list under `magento_themes_backend` |
| Stale `view_preprocessed` / DI across releases | Do **not** share whole `var/`; keep `.include-files-deploy` paths (`generation`, `di`, `view_preprocessed`) release-local |
| Shared list ignores live Hypernode | Prefer existing `shared/` symlinks on the node when filling `shared_*` — SSH `ls -la` on `deploy/current/var` |
| CI: `magento/page-builder … could not be found` | CE projects `replace` Page Builder packages in `composer.json`. Merging feature→staging can drop those lines while keeping master's lock — restore `magento/page-builder` + `magento/module-page-builder` (and siblings) under `replace` |
| CI: empty `COMPOSER_AUTH` but install works elsewhere | Private Magento packages need either `replace` (CE) or repo secret `DEPLOY_COMPOSER_AUTH`; missing `replace` looks like “package not found” |
| Static scan too wide / wrong paths | Set `ci.yml` `with.scan_path` to the Bitbucket `Test/static/run.sh` path list |
| `config.php` missing themes/scopes | Probe staging DB (see above) and commit the dump — do not invent store codes |

## Git / commit notes

- Ticket format follows the target repo (e.g. `[TYPE][TICKET] …` or `TICKET - …`).
- After setup: push feature, merge into `staging`, push staging for deploy.
- When staging is behind master, expect large merges; re-validate `composer.json` `replace` + `composer validate` after resolving `composer.lock`.
- Do not invent Jira keys.
