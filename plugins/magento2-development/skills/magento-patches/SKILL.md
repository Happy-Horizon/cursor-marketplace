---
name: magento-patches
description: Apply, regenerate and verify Magento 2 patches with cweagans/composer-patches. Use when applying an Adobe isolated security patch (APSB / repo.magento.com patch zip), when a remote Experius patch no longer applies after a version bump, when writing a local vendor patch, when patches silently do not apply after editing composer.patches.json, or when verifying patch status with the Commerce Version Tool.
---

# Magento Patches

Patch workflow for Magento 2 projects using `cweagans/composer-patches` ^2.0. Covers three jobs:
applying an Adobe isolated security patch, replacing a remote patch that stopped applying, and
verifying the result.

Patches are a last-resort fix. Before regenerating one, check whether the target version already
contains the fix — if it does, delete the patch instead of porting it.

## Ground rules

- Repos here set `"composer-exit-on-patch-failure": true`. One failing patch aborts the whole install,
  so validate every patch before committing.
- Patch headers use depth-4 vendor paths: `--- a/vendor/<vendor>/<package>/path/to/File.php`, matching
  `default-patch-depth: 4` (the depth is relative to the package root, not the project root).
- Validate from the **project root** with `patch --dry-run -p1`. Neither `-p0` nor `-p4 -d vendor/<pkg>`
  is the right check; those produce misleading failures.
- Every patch file must end with a newline, or `patch` fails.
- Preserve CRLF if the upstream file uses it — mixed endings fail with "different line endings".

## Patches do not apply until the package is reinstalled

Editing `composer.patches.json` and running `composer update` does **nothing**. `patches.lock.json`
still pins the previous patch set, and composer caches downloaded patches. The full sequence:

```bash
COMPOSER_MEMORY_LIMIT=-1 composer patches-relock --no-interaction
rm -rf "$(composer config --global cache-dir)/patches/"*   # stale remote patches win otherwise
COMPOSER_MEMORY_LIMIT=-1 composer reinstall <package> [<package>…] --no-interaction
```

Then **grep the patched file** to confirm the change is on disk. A clean composer exit is not proof.

Two related traps:

- `composer update` does not redeploy the `magento/magento2-base` skeleton, so `bin/magento` and
  `app/bootstrap.php` can go missing mid-upgrade. Fix with `composer reinstall magento/magento2-base`.
- A patch that fails leaves the vendor tree partially rolled back. Restore pristine sources (below)
  before diffing anything.

## Adobe isolated security patch (APSB / `repo.magento.com/patch/*.zip`)

Adobe ships one monolithic CE patch spanning many packages. cweagans registers patches **per
composer package**, so it has to be split.

### 1. Download with your Magento repo credentials

```bash
USER=$(jq -r '."http-basic"."repo.magento.com".username' auth.json)
PASS=$(jq -r '."http-basic"."repo.magento.com".password' auth.json)
curl -fsSL -u "$USER:$PASS" -o /tmp/patch.zip \
  https://repo.magento.com/patch/<release>-<month>-<year>.zip
unzip -o /tmp/patch.zip -d /tmp/adobe-patch
```

Fall back to `COMPOSER_AUTH` when `auth.json` is absent. Confirm the download is a real zip
(`file /tmp/patch.zip`) — a 401 returns an HTML body with HTTP 200-looking output.

### 2. Split by package

Split the `*-CE.patch` on `diff --git` boundaries, group hunks by the `vendor/<vendor>/<package>`
prefix, and write one file per package into `patches/adobe/<apsb-id>/`. Register each under its
composer package key with a descriptive key naming the advisory:

```json
"magento/module-quote": {
    "APSB26-73 / 249-2026-07-001-CE (Jul 2026 isolated security patch)": "patches/adobe/apsb26-73/249-2026-07-001-CE-magento-module-quote.patch"
}
```

Keep the cleaned full CE patch alongside the split files for audit.

### 3. Two hunks cannot go through composer-patches

| Hunk | Why | Handling |
|---|---|---|
| `nginx.conf.sample` | Root sample file, belongs to no package; fails on a fresh install before `magento2-base` deploys it | Copy from `vendor/magento/magento2-base/nginx.conf.sample`, apply that hunk directly, commit the result. Keep the hunk under `patches/adobe/<apsb-id>/extras/` for provenance |
| `vendor/bin/patch-status` | The Commerce Version Tool binary is embedded in the patch, and `vendor/bin` is not a package | Extract it (strip the leading `+` from the hunk body), commit it under `patches/adobe/<apsb-id>/`, and install it on every composer run (below) |

### 4. Install the Commerce Version Tool on every composer run

Add a **PHP helper file**, not an inline `php -r` one-liner — the nested escaping in composer JSON
breaks. Have the helper copy the tool into `vendor/bin` and exit 0 on any failure so it can never
break an install:

```json
"scripts": {
    "adobe-install-patch-status": ["php patches/adobe/<apsb-id>/install-patch-status.php"],
    "post-install-cmd": ["@adobe-install-patch-status"],
    "post-update-cmd": ["@adobe-install-patch-status"]
}
```

**Copy the file; do not symlink it.** A symlinked `vendor/bin/patch-status` reports the patch as
`UNKNOWN`; a real copy reports it as applied.

### 5. Verify

```bash
php bin/patch-status --root="$PWD" --format=json
```

`applied_patches` must list the advisory's patch id, and the CVEs must report as protected. Use
`--no-cache` when re-checking after a change, and read `var/log/patch_status.log` when something
reports `UNKNOWN`.

## Replacing a remote patch that stopped applying

Remote Experius patches are version-specific. After a Magento bump, look for the same patch number
built for the new version at [patches.experius.nl](https://patches.experius.nl/patches/experius/) —
often just the version in the filename changes. If none exists, port it locally.

### Generate a local patch against pristine sources

```bash
# 1. Get the pristine package from composer's cache — match the INSTALLED version.
#    The wrong zip produces spurious hunks in unrelated files.
jq -r '.packages[] | select(.name=="<vendor>/<package>") | .dist.reference' composer.lock
unzip -qo "$(composer config --global cache-dir)/files/<vendor>/<package>/<reference>.zip" -d /tmp/orig

# 2. Edit the file(s) under vendor/ to the desired state.

# 3. Diff pristine against modified and rewrite the headers to depth-4 vendor paths.
diff -u /tmp/orig/<rel-path> vendor/<vendor>/<package>/<rel-path> \
  | sed "1s|^--- .*|--- a/vendor/<vendor>/<package>/<rel-path>|;2s|^+++ .*|+++ b/vendor/<vendor>/<package>/<rel-path>|" \
  > patches/<vendor>/<name>.patch

# 4. Restore vendor/ to pristine so composer applies the patch itself.
cp /tmp/orig/<rel-path> vendor/<vendor>/<package>/<rel-path>

# 5. Validate, then relock + reinstall (see above).
patch --dry-run -p1 < patches/<vendor>/<name>.patch
```

Keep the patch minimal: include only the hunks that implement the intended change. If the diff picks
up unrelated files, the pristine source is the wrong version — refetch rather than shipping the noise.

## Symfony `Command::execute(): int` after a Symfony major bump

Magento bumping Symfony (6.4 → 7.x) fatals `setup:di:compile` for any `Command` subclass whose
`execute()` lacks `: int`. Scan the whole tree, not just the package that failed first:

```bash
find vendor app/code -path '*/Console/*' -name '*.php' -print0 \
  | xargs -0 rg -l 'function\s+execute\s*\([^)]*InputInterface' \
  | while read -r f; do rg -q 'function\s+execute\s*\([^)]*\)\s*:\s*int' "$f" || echo "$f"; done
```

Prefer bumping the package to a release that already has `: int`. Otherwise patch it: add the return
type, and where the method had no `return`, add
`return \Symfony\Component\Console\Command\Command::SUCCESS;` — including in early-return branches
that previously did a bare `return;`. Group one patch per package and name it for the cause, e.g.
`patches/experius/symfony7_command_execute_int_<package>.patch`.

## Reviewing the patch inventory

A version upgrade is the cheapest moment to delete patches. For each entry in
`composer.patches.json`, record why it exists, whether it is fixed upstream, and a disposition of
drop / replace with upstream / keep with an owner. Patches written to hide a bug introduced by the
project itself should be fixed properly instead of ported forward.

## Verification checklist

```bash
COMPOSER_MEMORY_LIMIT=-1 composer validate --no-check-publish
COMPOSER_MEMORY_LIMIT=-1 composer patches-relock --no-interaction   # no unexpected diff
MAGE_MODE=production php -d memory_limit=2G bin/magento setup:di:compile
php bin/patch-status --root="$PWD" --format=json                    # if a Commerce patch is installed
```

Confirm each patched file on disk contains its change, and that `patches.lock.json` is committed
alongside `composer.patches.json` and the patch files. Never commit `vendor/`, `auth.json`,
`app/etc/env.php` or `generated/`.
