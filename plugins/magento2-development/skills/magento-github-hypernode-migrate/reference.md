# Reference: NRG vs horizon-backend vs Hyvä

Concrete comparison from:

- Legacy Gulp: https://github.com/Happy-Horizon/nrg-europe
- Headless: https://github.com/Happy-Horizon/Horizon-Backend
- Hyvä: https://github.com/Happy-Horizon/hyva-demo (+ https://github.com/Happy-Horizon/maene pattern)
- Legacy Gulp + Experius Connector: https://github.com/Happy-Horizon/emga-m2

## Workflows

| Aspect | NRG (Gulp) | horizon-backend (headless) | Hyvä |
|--------|------------|----------------------------|------|
| Workflow files | build, ci, deploy-staging, deploy-production, preview | same | same |
| Toolkit ref | `happy-horizon/actions@production` | same | same |
| `ci.yml` `php_version` | `'7.4'` | `'8.4'` | `'8.4'` (or project PHP) |
| `ci.yml` `composer_version` | `'2.2'` | — | — |
| `build.yml` `deploy_image` | **pinned** `4.2.0-php7.4-node12` | omitted (uses YAML stage image) | omitted |
| Staging trigger | push `staging` + dispatch | same | same |
| Production deploy | `workflow_dispatch` + concurrency | same | same |
| Preview | skipped (`if: false`) | same | same |

## `deploy.settings.yml`

| Key | NRG | horizon-backend | Hyvä |
|-----|-----|-----------------|------|
| `defaults.php_version` | `"7.4"` | `"8.4"` | **set explicitly** (omit → central 8.4) |
| `magento_themes` | list of Vendor themes + backend | omit → central (`Magento/backend`) | locale map |
| `static_content_locales` | `"en_US nl_NL"` | — | N/A with locale map |
| `composer_self_update` | `"2.2"` | — | — |
| `snowdog_frontools_dirs` | `[tools]` | — | — |
| `snowdog_frontools_node_version` | `"12.22.12"` | — | — |
| `hyva_tailwind_dirs` | — | — | theme `web/tailwind` path(s) |
| `high_performance_static_deploy` | — | — | `true` |
| Project `shared_files` / `shared_folders` | rich Experius-style; derive from `.exclude`/`.include-files-deploy` when present | none (central only) | rich (like NRG); same include/exclude mapping |
| `deploy_image` | `4.2.0-php7.4-node12` | `4.8.0-php8.4-node22` | `4.8.0-php8.x-nodeN` |
| `cron_config` / `nginx_config` | often omitted | both stages | cron if files exist |
| Staging `deploy_path` | `/data/web/deploy-staging` (same HN as prod) | omit (separate HN / central default) | `/data/web/deploy-staging` only if same HN as prod |

## Hyvä CSS/JS minify (`config.php`)

| Setting | Hyvä | Legacy Gulp / Luma |
|---------|------|--------------------|
| `system.default.dev.css.minify_files` | **`0`** | often `1` |
| `system.default.dev.js.minify_files` | **`0`** | often `1` |
| Actual CSS minify | Tailwind `npm run build --minify` → `styles.css` | Magento SCD / frontools |
| If Magento minify left `1` | Requests `*.min.css` / `*.min.js`; often **404** with HPSD | Magento generates `.min.*` |

## HPSD vs `app/code`

| Source | Copied by HPSD (elgentos Go SCD)? |
|--------|-----------------------------------|
| `vendor/*/view/*/web` | yes |
| `app/design/.../{Module}/web` | yes |
| `lib/web` | yes |
| `app/code/*/view/*/web` | **no** |

Projects with custom module static assets under `app/code` must set `high_performance_static_deploy: false`.

## `env.php` during build / SCD

The build container has no database. Magento writes a cache-types-only `app/etc/env.php` during `setup:di:compile` and again on every `setup:static-content:deploy`.

| State of `app/etc/env.php` in build | Result |
|-------------------------------------|--------|
| Absent | **Working state** — themes resolve from committed `app/etc/config.php` |
| Present, no `db` section (Magento's own write) | `experius/connector-interface-magento` aborts: *No database connection was found in any of the env.php config files* |
| Present, stubbed `db` → `127.0.0.1` | `ThemeProvider` tries to connect: `PDOException SQLSTATE[HY000] [2002] Connection refused` |

Toolkit handling (`horizon-deploy/src/Bootstrap.php`, `@production` since 2026-07-31):

| Layer | Mechanism |
|-------|-----------|
| Split SCD (`magento_themes` as locale map) | `magento:deploy:assets:{adminhtml,frontend}` reimplemented; each per-theme command is prefixed with `rm -f …/app/etc/env.php &&` (one command per theme, so a `before` hook is not enough — `invoke()` skips hooks) |
| Non-split SCD + `high_performance_static_deploy` | `magento:deploy:assets` is cloned and wrapped to `invoke('magento:build:remove-env')` first |
| `magento:build:remove-env` | Guarded to the `build` host — on servers `env.php` is a `shared_files` symlink |
| Deploy-stage bootstrap | `ensureAutoload()` returns early when `Symfony\Component\Yaml\Yaml` already exists (the `hypernode-deploy` phar ships it), so the project autoloader — and the connector's `registration.php` — is never loaded |

Why `nrg-europe` never showed this: no `experius/connector-*` requirement, and its 4.2 image/older toolkit ref predates the change.

## Headless reality check

| Expectation | Reality (horizon-backend) |
|-------------|---------------------------|
| Skip SCD | **No** — still runs `magento:deploy:assets` unless you override `build_tasks` / themes |
| No FE build | **Yes** — no snowdog/hyva keys |
| Thin YAML | **Yes** — php_version + environments (+ cron/nginx) |
| Storefront in repo | **No** — GraphQL backend; storefront separate |

## Shared paths (exclude / include)

Legacy Bitbucket rsync:

| File | Role |
|------|------|
| `.exclude-files-deploy` | Server-persisted paths → `shared_*` candidates |
| `.include-files-deploy` | Release-local exceptions under an excluded parent (e.g. `var/generation`, `var/di`, `var/view_preprocessed`) — **omit** from shared |

Do **not** share whole `var/` when the include file lists build dirs. Prefer live Hypernode `shared/` symlink listing when already migrated. Ungitted persist files listed in include (e.g. `var/xp-varnish.vcl`) still go to `shared_files`.

Toolkit helper: `happy-horizon/actions` → `bin/setup-shared-symlinks` (exclude + include).

### Probe staging (agent workflow)

See SKILL.md **Probe staging Hypernode**. Short version:

```bash
# Layout
ssh app@STAGING.hypernode.io 'ls /data/web/'   # magento2 vs deploy/

# Shared var symlinks (after Hypernode Deploy)
ssh app@STAGING.hypernode.io 'ls -la /data/web/deploy/current/var'
# dirs → shared_folders; files → shared_files; non-symlinks stay release-local

# Themes + scopes: full php -r dump is in SKILL.md (theme / store_website / store_group / store)
```

Also dump `system.default.dev` via live `bin/magento config:get` (sign / css+js merge+minify / bundling / translate_inline) — full path list in SKILL.md §4. Fall back to `deploy.sh` `config:set` only when unset. Re-probe `shared_*` after the first deploy.

### `config.php` dump shape

Match emga-m2 / nrg-europe / directplant-m2: top-level `themes` + `scopes` (+ `system.default.dev`). Theme `parent_id` in the PHP dump is the parent **code** (e.g. `Experius/whitelabel`), not the numeric DB `theme_id`. Dev minify/merge/sign come from staging `config:get`, not invented defaults.
## Central toolkit defaults (know these)

From `horizon-deploy/defaults/magento2.yml`:

- `php_version: "8.4"`
- `magento_themes`: list starting with `Magento/backend` (override per project)
- `build_tasks` includes `hyva:tailwind:build` (no-op without dirs) then `magento:deploy:assets`, followed by `snowdog:frontools:styles` (no-op without dirs)
- Minimal central `shared_files`: `app/etc/env.php`, `pub/.user.ini`
- The build `env.php` removal is **not** a `build_tasks` entry — `Bootstrap` wires it into the SCD tasks themselves, so it also applies to projects with a custom `build_tasks` list

## Exact keys agents set

```text
defaults.php_version
defaults.variables.build.magento_themes
defaults.variables.build.static_content_locales
defaults.variables.build.composer_self_update
defaults.variables.build.snowdog_frontools_dirs
defaults.variables.build.snowdog_frontools_node_version
defaults.variables.build.hyva_tailwind_dirs
defaults.variables.build.high_performance_static_deploy
defaults.shared_files / defaults.shared_folders
environments.<stage>.domain
environments.<stage>.username
environments.<stage>.servers[].hostname
environments.<stage>.deploy_image
environments.<stage>.cron_config
environments.<stage>.nginx_config
environments.<stage>.variables.deploy.deploy_path
```

Workflow:

```text
ci.yml → with.php_version (+ composer_version, scan_path from Bitbucket static paths)
build.yml → with.deploy_image (legacy only, when needed)
deploy-*.yml → deploy_stage, environment_name, environment_url, artifact_name
```

## Doc pointers

| Path | Why |
|------|-----|
| [Happy-Horizon/actions](https://github.com/Happy-Horizon/actions) → `horizon-deploy/README.md` | Layering, php sync, deploy_image order, stage replace rules |
| [Happy-Horizon/Horizon-Backend](https://github.com/Happy-Horizon/Horizon-Backend) → `.cursor/skills/magento-upgrade/SKILL.md` | PHP alignment places + 4.9 warning |
| [Happy-Horizon/nrg-europe](https://github.com/Happy-Horizon/nrg-europe) → `deploy.settings.yml` header | Snowdog + 4.2/Node12 |
| [Happy-Horizon/emga-m2](https://github.com/Happy-Horizon/emga-m2) → `deploy.settings.yml` + `deploy.sh` | Snowdog on 4.8/PHP 8.2, split SCD themes + locales, Experius Connector |
| [Happy-Horizon/hyva-demo](https://github.com/Happy-Horizon/hyva-demo) → `deploy.settings.yml` header | Tailwind order + HPSD |
| Project `.exclude-files-deploy` / `.include-files-deploy` | Map to `shared_*` (never share include-listed build dirs) |
| Live staging `ls -la deploy/current/var` | Authoritative `shared_*` after first Hypernode Deploy |
| Staging DB `theme` / `store_*` | Authoritative `config.php` `themes` + `scopes` dump |
| [Happy-Horizon/actions](https://github.com/Happy-Horizon/actions) → `bin/setup-shared-symlinks` | Migrate magento2 → deploy/shared using exclude/include |
| [Happy-Horizon/directplant-m2](https://github.com/Happy-Horizon/directplant-m2) → `deploy.settings.yml` + `config.php` | Snowdog/PHP 8.2 + probed shared + live scopes/themes |
| [Happy-Horizon/Horizon-Backend](https://github.com/Happy-Horizon/Horizon-Backend) → `AGENTS.md` | Headless role |
| Any `preview.yml` | Brancher skip rationale |
