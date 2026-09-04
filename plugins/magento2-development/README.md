# Magento 2 Development

Cursor plugin providing rules and best practices for Magento 2 / Adobe Commerce development.

## Components

### Rules

- **magento-structure** - Project structure and file layout
- **magento-module** - Module development reference
- **magento2-xss** - XSS-safe output in templates
- **standards** - Coding standards and conventions

### Skills

- **m2-create-frontend-component** - Building storefront UI components with the two-layer pattern:
  presentation in a `{Vendor}_Components` module, data wiring in the theme. Auto-detects Classic
  (SCSS, `data-mage-init`) versus Hyvä (Tailwind, Alpine.js) from the active theme.
- **magento-upgrade** - Upgrading Magento Open Source to a new patch or minor version: composer
  constraint and conflict handling, CI / Hypernode Deploy alignment (`deploy.settings.yml`
  `php_version` + `deploy_image`, `.github/workflows/ci.yml`), `magento2-base` skeleton sync,
  Symfony `Command::execute(): int` breakage, patch validation, and `setup:di:compile`
  verification. Includes [upgrade-testplan.md](skills/magento-upgrade/upgrade-testplan.md) with
  Phase H browser end-to-end (guest checkout via offline payment to a real order, account
  lifecycle, PR video/screenshot artifacts — Horizon-Storefront#330 pattern). In Cursor Cloud the
  agent must boot services and run the cloud-runnable portion of that plan, including Phase H
  when a storefront exists (not stop at compile or curl smoke), then produce the Dutch testrapport
  via **magento-upgrade-testrapport**.
- **magento-upgrade-testrapport** - Post-upgrade Dutch Jira-ready testrapport after Phase H /
  staging E2E succeeds (HD-473 / `bc-6751dd3b` pattern): required screenshots and videos under
  `/opt/cursor/artifacts/`, clickable `https://cursor.com/agents/<bc-id>/artifacts?path=…` links,
  `Testrapport-<TICKET>.md`, PR + Jira paste. No module-uninstall inventory.
- **magento-patches** - Working with `cweagans/composer-patches`: splitting an Adobe isolated security
  patch (APSB / `repo.magento.com` patch zip) into per-package files, handling the `nginx.conf.sample`
  and Commerce Version Tool hunks that cannot go through composer, generating a local patch against
  pristine sources when a remote Experius patch stops applying, the relock/cache-clear/reinstall
  sequence patches actually need, and verification with `patch-status`.
- **magento-github-hypernode-migrate** - Migrating Magento Hypernode projects to GitHub Actions with
  `happy-horizon/actions` and `deploy.settings.yml`. Covers Snowdog/Gulp, Hyvä Tailwind, Experius
  Connector and headless stacks: workflow copy, staging Hypernode probing for `shared_*`, live
  themes/scopes dump into `app/etc/config.php`, exclude/include → shared mapping, and the build
  `env.php` contract. Side-by-side key tables in
  [reference.md](skills/magento-github-hypernode-migrate/reference.md).

## Usage

Rules apply automatically when working with Magento 2 project files (PHP in `app/code/`, XML config,
PHTML templates). The upgrade skill activates when you ask to upgrade Magento, hit composer or
`setup:di:compile` failures after a version bump, align `deploy.settings.yml` / `.github/workflows`
after a PHP bump, plan post-upgrade testing and go-live, run browser end-to-end checkout /
account flows with artifacts after an upgrade, or write the Dutch post-upgrade testrapport
(magento-upgrade-testrapport). The patches skill activates when
applying a security patch, porting a patch that no longer applies, or debugging patches that appear
to do nothing. The migrate skill activates when moving a project onto GitHub Actions + Hypernode
Deploy, or when a build/deploy fails with the `env.php` / “No database connection” class of errors.

## Customization

The upgrade, patches and migrate skills are written against Happy Horizon Magento repos (Horizon
Backend as the headless reference; NRG / hyva-demo / emga-m2 for FE stacks). Confirm package pins,
PHP-version locations, patch directory layout, deploy YAML keys and toolkit ref against the project
at hand. Edit `rules/*.mdc` to add team-specific Magento 2 guidelines.
