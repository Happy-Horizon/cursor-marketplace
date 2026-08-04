---
name: magento-upgrade
description: Procedure for upgrading Magento Open Source to a new patch or minor version. Use when asked to upgrade Magento, bump the product-community-edition constraint, resolve composer conflicts after a Magento version bump, or fix setup:di:compile / magento:compile failures (e.g. Symfony Command::execute(): int). Also use when planning or running post-upgrade regression testing, or preparing an upgrade go-live — see upgrade-testplan.md.
---

# Magento Upgrade Skill

Upgrade procedure for Happy Horizon Magento 2 projects, written against the Horizon Backend monorepo
(headless GraphQL, Hypernode Deploy). Steps 1–10 are the composer and compile mechanics; step 11 is
the regression phase, which is where most upgrade time actually goes.

Details to confirm per project before following the steps literally: the `magento/product-community-edition`
constraint style, the package pins in step 2, the PHP-version locations in step 4, and the patch
tooling in step 7. Frontend-heavy projects (Hyvä, Page Builder) carry a whole additional regression
surface that step 11 covers.

## Prerequisites

- Use a PHP CLI binary matching the target version (e.g. `php8.4`); run all commands from the repo root so `auth.json` (repo.magento.com + packages.experius.nl) is picked up.
- Set `COMPOSER_MEMORY_LIMIT=-1` for any composer operation touching Magento packages.

## Upgrade Steps

### 1. Edit `composer.json`

Change the `magento/product-community-edition` constraint:

```json
"magento/product-community-edition": ">=<new-version>"
```

Keep `>=` prefix per repo convention. Do NOT bump root `"version": "2.4.6"` — used by `replace: self.version` for local GraphQL modules.

### 2. Check for known conflicting pins

Run `composer why-not magento/product-community-edition <new-version>`. Known risky pins:

| Package | Issue |
|---|---|
| `smile/elasticsuite` | exact-version; bump to match new Magento + Symfony |
| `experius/emailcatcher` | exact-version; may be unpublished |
| `fastly/magento2` | `~1.2.x`; bump if a transitive dep drops |
| `magento/module-contact-graph-ql-pwa` | exact-version; bump if required |
| `symfony/finder` (dev) | `^6.4` conflicts on Symfony major bump |
| `symplify/monorepo-builder` (dev) | conflicts with Symfony 7+ |

Use `php8.4 /usr/local/bin/composer show -a <pkg>` and `composer prohibits <pkg> <ver>` to investigate.

### 3. Run composer update

```bash
COMPOSER_MEMORY_LIMIT=-1 php8.4 /usr/local/bin/composer update --with-all-dependencies --no-interaction \
  > /tmp/composer-update.log 2>&1
```

Takes 5–20 minutes. Poll with `tail -f /tmp/composer-update.log`.

### 4. Align PHP version configuration

Update these four locations when the target PHP version changes:

1. `horizon-deploy/defaults/magento2.yml` — scalar `php_version:` under `defaults:` (Deployer CLI **and** desired Hypernode platform PHP). On deploy, `hypernode:settings:sync` compares live values and only applies with `--block` (maintenance-wrapped) when they drift. Extra knobs such as `mysql_version` go under `hypernode_settings`.
2. `deploy.settings.yml` — `deploy_image` tag. Prefer a **pinned** hypernode-deploy version with PHP 8.4 (e.g. `quay.io/hypernode/deploy:4.8.0-php8.4-node22`). Avoid `latest-php8.4-node22` while Magento pulls `symfony/http-client-contracts` v3+: hypernode-deploy 4.9’s `deploy:hypernode-annotation` fatals (`CurlResponse::getInfo` vs `ResponseInterface::getInfo(): mixed`) after an otherwise successful release.
3. `bitbucket-pipelines.yml` — top-level `image:` (e.g. `experiusnl/magento-2-docker-pipeline-image-apache-php8.4`).
4. `.github/workflows/ci.yml` — `php_version` input on the `static-code-scans` job (and the `di-compile` job’s setup-php version). The reusable workflow `happy-horizon/actions/.github/workflows/horizon-backend-magento-ci.yml` defaults to PHP 8.2, so CI `composer install` fails after an upgrade unless this input matches the new requirement. Its known inputs: `php_version`, `php_extensions`, `scan_path`.

Verify no stale references remain (adapt the pattern to the version being dropped):

```bash
grep -rn "8\.2\|php8\.2" horizon-deploy/ .github/ deploy.settings.yml bitbucket-pipelines.yml
```

### 5. Sync `magento/magento2-base` skeleton files

`magento/magento2-base` deploys updated skeleton files into tracked paths (`app/`, `bin/`, `dev/`, `lib/`, `pub/`, `setup/`, `.php-cs-fixer.dist.php`) during `composer update`. This can touch thousands of files — it is expected.

After the update, run `git status` to review all changes. Delete stray junk files (e.g. `patches.lock.json.bak`) before committing. Commit the base sync as a **separate commit** from the composer constraint changes.

### 6. Handle PHP/Symfony `Command::execute(): int` incompatibilities

When Magento bumps Symfony (e.g. 6.4 → 7.4), any vendor (or `app/code`) class extending `Symfony\Component\Console\Command\Command` whose `execute()` lacks a `: int` return type fatals during `setup:di:compile` (Hypernode `magento:compile`) with:

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

For each hit, prefer **bumping the package** to a release that already has `: int` (e.g. `elgentos/regenerate-catalog-urls` `~0.3.7` → `~0.4.9`). If no release exists, add a local patch under `patches/` and register it in `composer.patches.json`, then:

```bash
COMPOSER_MEMORY_LIMIT=-1 php8.4 /usr/local/bin/composer patches-relock --no-interaction
COMPOSER_MEMORY_LIMIT=-1 php8.4 /usr/local/bin/composer patches-repatch --no-interaction
```

Local patch rules:
- Depth-4 headers: `--- a/vendor/<vendor>/<package>/path/to/File.php`
- Add `: int` on `execute()`; if the method did not already `return`, add `return \Symfony\Component\Console\Command\Command::SUCCESS;`
- Preserve CRLF if the upstream file uses CRLF (otherwise `patch` fails with "different line endings")

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
MAGE_MODE=production php8.4 -d memory_limit=2G bin/magento setup:di:compile
# Must print: Generated code and dependency injection configuration successfully.
```

CI enforces this via the `di-compile` job in `.github/workflows/ci.yml` (PHP 8.4, `composer install`, minimal `env.php`, then `setup:di:compile`). Keep that job in sync when changing PHP version.

### 9. Verification checklist

All must pass:

```bash
php8.4 /usr/local/bin/composer validate --no-check-publish
grep -A1 '"name": "magento/product-community-edition"' composer.lock | grep version
php8.4 bin/magento --version
php8.4 /usr/local/bin/composer dump-autoload -o
MAGE_MODE=production php8.4 -d memory_limit=2G bin/magento setup:di:compile
```

### 10. Commit

Use separate commits:

- **Commit A** — `composer.json`, `composer.lock`, `patches.lock.json` (if changed), `composer.patches.json` (if changed), `patches/` (new local patch files).
- **Commit B** — All base skeleton files from `magento/magento2-base` (`app/`, `bin/`, `dev/`, `lib/`, `pub/`, `setup/`, `.php-cs-fixer.dist.php`).
- **Commit C** (if needed) — CI / skill / deploy PHP-version knobs.

Commit message format: `[TYPE][TICKET] Summary in imperative mood` (TYPE: FEATURE / BUGFIX / HOTFIX / REFACTOR). Ask the user for the ticket if not known — never invent one.

Do NOT commit: `vendor/`, `auth.json`, `app/etc/env.php`, `generated/`.

### 11. Post-upgrade regression testing

A green `setup:di:compile` means the build works, not that the shop works. On NRC-210 the composer and
compile work above was budgeted at 2 days; the regression phase that follows ran for months and
produced 60+ tickets. Do not treat the upgrade as done, or hand it to testers, before walking
[upgrade-testplan.md](upgrade-testplan.md).

That plan gates on two things this skill does not cover: an environment readiness check (a stale DB,
unsynced CMS content or a non-whitelisted reCAPTCHA domain generates defects that are not defects),
and automated sweeps for runtime deprecations, console errors, missing assets and visual deltas
against production — each of which replaces a batch of hand-filed tickets. It also collects the
settings that live in the database rather than git, so go-live is a runbook instead of a click list
reconstructed under time pressure.

## Known Upgrade History

| From | To | PR / Branch | Key constraint changes |
|---|---|---|---|
| 2.4.8-p3 | 2.4.9 | feature/magento-2-4-9-upgrade-daaa | emailcatcher 4.4.0→4.5.2; elasticsuite 2.11.16→2.11.19; elgentos/regenerate-catalog-urls ~0.3.7→~0.4.9; local Symfony 7 `execute(): int` patches for experius contentblock/contentpage/missingtranslations/taxrulesreset/euvatvalidation/dblogger/ordergridextends |
