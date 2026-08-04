# Magento 2 Development

Cursor plugin providing rules and best practices for Magento 2 / Adobe Commerce development.

## Components

### Rules

- **magento-structure** - Project structure and file layout
- **magento-module** - Module development reference
- **magento2-xss** - XSS-safe output in templates
- **standards** - Coding standards and conventions

### Skills

- **magento-upgrade** - Upgrading Magento Open Source to a new patch or minor version: composer
  constraint and conflict handling, PHP-version alignment, `magento2-base` skeleton sync, Symfony
  `Command::execute(): int` breakage, patch validation, and `setup:di:compile` verification. Includes
  [upgrade-testplan.md](skills/magento-upgrade/upgrade-testplan.md), a post-upgrade regression plan
  built from a real 2.4.8 upgrade: environment readiness gate, automated sweeps for deprecations and
  visual deltas, storefront/checkout/admin parity, and the database-only settings to re-apply at go-live.
- **magento-patches** - Working with `cweagans/composer-patches`: splitting an Adobe isolated security
  patch (APSB / `repo.magento.com` patch zip) into per-package files, handling the `nginx.conf.sample`
  and Commerce Version Tool hunks that cannot go through composer, generating a local patch against
  pristine sources when a remote Experius patch stops applying, the relock/cache-clear/reinstall
  sequence patches actually need, and verification with `patch-status`.

## Usage

Rules apply automatically when working with Magento 2 project files (PHP in `app/code/`, XML config,
PHTML templates). The upgrade skill activates when you ask to upgrade Magento, hit composer or
`setup:di:compile` failures after a version bump, or plan post-upgrade testing and go-live. The
patches skill activates when applying a security patch, porting a patch that no longer applies, or
debugging patches that appear to do nothing.

## Customization

Both skills are written against the Horizon Backend monorepo; confirm package pins, PHP-version
locations, patch directory layout and patch tooling against the project at hand. Edit `rules/*.mdc`
to add team-specific Magento 2 guidelines.
