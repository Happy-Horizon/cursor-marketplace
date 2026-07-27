---
name: hs-node-yarn-update
description: Update Node.js via nvm and migrate Yarn versions in the Horizon Storefront monorepo. Use when updating Node.js, upgrading Yarn (especially Yarn 1 to 4 migration), or when the user mentions nvm, node update, yarn update, or yarn berry.
---

# Node.js & Yarn Update

Update Node.js and Yarn in the Horizon Storefront monorepo.

## Update Checklist

```
Update Progress:
- [ ] Update Node.js via nvm
- [ ] Update Yarn version
- [ ] Migrate .yarnrc → .yarnrc.yml (handle dual files + auth tokens)
- [ ] Update config files (.nvmrc, package.json)
- [ ] Update vercel.json files
- [ ] Add engine constraints to apps/*/package.json
- [ ] Update @types/node in all package.json files
- [ ] Clean up package-lock.json
- [ ] Migrate turbo.json (pipeline → tasks) if applicable
- [ ] Fix ESLint compatibility (circular refs, plugin redefinition)
- [ ] Fix lint-staged compatibility (--no-warn-ignored, remove "git add")
- [ ] Configure Vercel project settings (ENABLE_COREPACK=1)
- [ ] Clean install and verify
```

## Current Versions (as of v4)

- **Node.js**: v24 (`.nvmrc`)
- **Yarn**: 4.12.0 (Berry, via `corepack`)
- **@types/node**: `^24.0.0`

## Node.js Update

### Step 1: Install New Node Version

```bash
nvm install 24
nvm alias default 24
node --version
```

### Step 2: Update `.nvmrc`

Set the major version in `.nvmrc`:

```
v24
```

### Step 3: Update Engine Constraints

In root `package.json`, update the `engines` field:

```json
"engines": {
    "node": "24.x",
    "yarn": ">=4.0.0"
}
```

### Step 4: Update `@types/node`

Search all `package.json` files for `@types/node` and update to match:

```bash
grep -r '"@types/node"' --include="package.json" .
```

Update both `resolutions` (root) and `devDependencies` (apps/packages) to `^24.0.0`.

**Known locations:**

- Root `package.json` → `resolutions`
- `apps/magento/package.json` → `devDependencies`
- `apps/medusa/package.json` → `devDependencies`
- `apps/bigcommerce/package.json` → `devDependencies`
- `packages/commerce/types/package.json` → `devDependencies`

## Yarn Migration (1 → 4)

### Step 1: Enable Corepack and Set Version

```bash
corepack enable
yarn set version 4.12.0
```

This adds the `packageManager` field to root `package.json`:

```json
"packageManager": "yarn@4.12.0+sha512...."
```

### Step 2: Replace `.yarnrc` with `.yarnrc.yml`

Yarn 4 uses `.yarnrc.yml` (YAML), not `.yarnrc` (INI-style).

**Important**: Some projects may already have BOTH `.yarnrc` and `.yarnrc.yml` (e.g. if `.yarnrc.yml` was partially set up). Always check for both files and merge their configuration.

#### If both `.yarnrc` and `.yarnrc.yml` exist:

1. Read `.yarnrc` to find any auth tokens and registry config
2. Merge the registry config into `.yarnrc.yml`
3. Delete `.yarnrc`

#### Auth Token Migration

Yarn 1 `.yarnrc` / `.npmrc` stores auth tokens in INI format:

```ini
//npm.happyhorizon.dev/:_authToken=<token>
@happyhorizon:registry = "https://npm.happyhorizon.dev/"
```

Yarn 4 uses `.yarnrc.yml` for registry config but auth tokens should stay in `.npmrc` (which Yarn 4 still reads):

```yaml
# .yarnrc.yml — registry config (committed to git)
nodeLinker: node-modules

npmScopes:
    happyhorizon:
        npmRegistryServer: 'https://npm.happyhorizon.dev/'
```

```ini
# .npmrc — auth tokens (NOT committed to git, in .gitignore)
//npm.happyhorizon.dev/:_authToken=<token>
```

**Key points:**
- `.yarnrc.yml` contains registry server URLs (safe to commit)
- `.npmrc` contains auth tokens (must NOT be committed — ensure it's in `.gitignore`)
- Delete the old `.yarnrc` file after migrating its config
- Yarn 4 reads `.npmrc` for auth tokens, so the token stays in `.npmrc`

#### Final `.yarnrc.yml`:

```yaml
nodeLinker: node-modules

npmScopes:
    happyhorizon:
        npmRegistryServer: 'https://npm.happyhorizon.dev/'
```

**Important**: `nodeLinker: node-modules` keeps traditional `node_modules/` layout (required for compatibility). Without it, Yarn 4 defaults to PnP which breaks Next.js.

#### Multi-scope `.yarnrc.yml` (projects with custom plugin packages):

Some client projects have custom `@experius/*` plugin packages (e.g. `@experius/ui-euvatvalidation`, `@experius/ui-postcodenl`) that remain on the old `@experius` scope. These need a separate scope entry:

```yaml
nodeLinker: node-modules

npmScopes:
    happyhorizon:
        npmRegistryServer: 'https://npm.happyhorizon.dev/'
    experius:
        npmRegistryServer: 'https://npm.happyhorizon.dev/'
```

And the corresponding `.npmrc` needs auth tokens for both registries (they may use the same server):

```ini
//npm.happyhorizon.dev/:_authToken=<token>
```

**Common error**: `SyntaxError: Unexpected token 'e', "error, try again" is not valid JSON` during `yarn install` means the auth token is missing or invalid for one of the scoped registries.

### Step 3: Update `.gitignore`

Ensure `.yarnrc.yml` is NOT in `.gitignore` (it must be tracked). Remove the line if present:

```diff
-.yarnrc.yml
```

Keep `.yarn` in `.gitignore` (contains cache/state files).

### Step 4: Remove Incompatible Scripts

Yarn 4 does not support `patch-package` the same way. If `postinstall: "patch-package"` exists:

1. Check if `patches/` directory exists with actual patch files
2. If no patches exist, remove:
    - `"postinstall": "patch-package"` from scripts
    - `"patch-package"` from resolutions/devDependencies
    - `"postinstall-postinstall"` from resolutions/devDependencies

If patches exist, migrate to Yarn 4's built-in patching: `yarn patch <package>`.

### Step 5: Clean Install

```bash
# Remove all node_modules (critical for Yarn 1→4 migration)
find . -name 'node_modules' -type d -prune -exec rm -rf {} +
rm -f .yarn/install-state.gz

# Fresh install
yarn install
```

### Step 6: Update Vercel Deploy Commands

Yarn 4 does not support `--ignore-engines` or `--production` flags on `yarn install`.

Update all `vercel.json` files:

```diff
-"installCommand": "cd ../../ && yarn install --ignore-engines --production",
+"installCommand": "cd ../../ && yarn install",
```

**Important**: Do NOT add `corepack enable` to the `installCommand`. Vercel ignores `corepack enable` inside install commands and will still use Yarn 1.22.x. Instead, set the `ENABLE_COREPACK` environment variable to `1` in Vercel project settings (Project Settings > Environment Variables).

**Do NOT use `nodeVersion`** in `vercel.json` — it is not a valid property and will cause schema validation errors. Node.js version is controlled via `engines.node` in `package.json` (see Step 7).

Final `vercel.json` format:

```json
{
    "$schema": "https://openapi.vercel.sh/vercel.json",
    "framework": "nextjs",
    "installCommand": "cd ../../ && yarn install",
    "buildCommand": "yarn build"
}
```

**Files to update:**

- `apps/magento/vercel.json`
- `apps/medusa/vercel.json`
- `apps/bigcommerce/vercel.json`

### Step 7: Add Engine Constraints to App package.json Files

Vercel uses the `engines.node` field from the app's `package.json` (in `apps/*/`) to determine the Node.js version for builds — not the root `package.json`. Add `engines` to each app:

```json
"engines": {
    "node": "24.x",
    "yarn": ">=4.0.0"
}
```

**Files to update:**

- `apps/magento/package.json`
- `apps/medusa/package.json`
- `apps/bigcommerce/package.json`

### Step 8: Clean Up package-lock.json

If a `package-lock.json` exists (from a previous npm/Yarn 1 install), it causes warnings during Vercel builds and can confuse package resolution. Remove it and add it to `.gitignore`:

```bash
# Remove from repo if tracked
git rm --cached package-lock.json 2>/dev/null || rm -f package-lock.json

# Add to .gitignore
echo "package-lock.json" >> .gitignore
```

### Step 9: Vercel Project Settings

After deploying, configure these environment variables in **Vercel Project Settings > Environment Variables**:

| Variable          | Value | Purpose                                                                       |
| ----------------- | ----- | ----------------------------------------------------------------------------- |
| `ENABLE_COREPACK` | `1`   | Enables Corepack so Vercel uses the `packageManager` field to activate Yarn 4 |

Without `ENABLE_COREPACK=1`, Vercel falls back to Yarn 1.22.x which is incompatible with `engines.yarn >= 4.0.0`.

## Turborepo Migration (pipeline → tasks)

If the project uses Turborepo, check the `turbo.json` config. Turbo 2.x renamed the top-level `"pipeline"` key to `"tasks"`:

```diff
 {
-    "pipeline": {
+    "tasks": {
         "build": {
             "dependsOn": ["^build"],
             "outputs": ["dist/**", ".next/**"]
         },
         "dev": {
             "cache": false
         },
         "lint": {
             "outputs": []
         },
         "clean": {
             "outputs": []
         }
     }
 }
```

Also update `turbo` in root `devDependencies`:

```diff
-"turbo": "1.10.15"
+"turbo": "^2.0.0"
```

**Note**: Turbo 2.x also changes some other behaviors (caching, output modes). Check the [Turbo 2.0 migration guide](https://turbo.build/repo/docs/crafting-your-repository/upgrading) for full details.

## ESLint Compatibility (Flat Config)

### Circular Reference Fix

When using ESLint 9 flat config with `FlatCompat`, a circular structure error can occur. Fix by importing configs that support native flat config directly:

```js
// eslint.config.mjs

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fixupConfigRules } from '@eslint/compat';
import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'; // Direct import
import prettier from 'eslint-config-prettier'; // Direct import

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all,
});

const config = [
    ...nextCoreWebVitals,
    prettier,
    ...fixupConfigRules(
        compat.extends('plugin:storybook/recommended'), // FlatCompat only for storybook
    ),
    // ... rules and ignores
];

export default config;
```

**Key**: Only use `FlatCompat` for plugins that don't support native flat config (e.g., `eslint-plugin-storybook`). Import `eslint-config-next/core-web-vitals` and `eslint-config-prettier` directly.

### Plugin Redefinition Fix (Root ESLint Config)

When `eslint-config-next/core-web-vitals` is imported directly (not through `FlatCompat`), it already registers the `eslint-plugin-import` plugin. Do **not** also explicitly import and register it — this causes:

```
ConfigError: Key "plugins": Cannot redefine plugin "import".
```

**Fix**: Remove any explicit `import _import from "eslint-plugin-import"` and its `plugins: { import: fixupPluginRules(_import) }` block from the root `eslint.config.mjs`. The `import/*` rules still work because the plugin is loaded via `nextCoreWebVitals`.

Root `eslint.config.mjs` should look like:

```js
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import prettier from 'eslint-config-prettier';

export default [
    {
        ignores: ['packages/ui/legacy/*'],
    },
    ...nextCoreWebVitals,
    prettier,
    {
        settings: {
            react: { version: 'detect' },
        },
        rules: {
            // ... rules that reference import/* still work
            'import/no-duplicates': 'error',
            'import/no-useless-path-segments': [
                'error',
                { noUselessIndex: true },
            ],
            // ...
        },
    },
];
```

### Resolution Versions

Ensure these resolutions in root `package.json` are compatible:

```json
"@eslint/compat": "1.4.1",
"@eslint/eslintrc": "3.3.3"
```

### lint-staged `--no-warn-ignored` Flag and `git add` Removal

When `lint-staged` passes files to ESLint that match ignore patterns (e.g., `next-env.d.ts`), ESLint emits a warning that fails with `--max-warnings 0`. Add `--no-warn-ignored`:

Also, older projects (v2 era) may have `"git add"` as the last command in their `lint-staged` config. This is **deprecated** in modern `lint-staged` (v10+) — `lint-staged` automatically stages files after running commands. Remove it.

```diff
 "lint-staged": {
     "*.{js,jsx,ts,tsx}": [
-        "yarn lint",
-        "yarn prettier:fix",
-        "git add"
+        "yarn lint --no-warn-ignored --",
+        "yarn prettier:fix --"
     ]
 }
```

**Update in all apps and client project apps:**

- `apps/magento/package.json` (or `apps/*/package.json` in client projects)
- `apps/medusa/package.json`
- `apps/bigcommerce/package.json`

## lint-staged Workspace Dependency

Yarn 4 is stricter about dependency resolution. If workspace packages (e.g., `packages/ui`, `packages/ui-tailwind`) reference `lint-staged` in their `package.json` config but don't list it as a dependency, it will fail with `command not found: lint-staged`.

Add `lint-staged` as an explicit `devDependency` in those packages:

```json
"devDependencies": {
    "lint-staged": "15.2.7"
}
```

## Verification

After all changes:

```bash
# Clean install
find . -name 'node_modules' -type d -prune -exec rm -rf {} +
yarn install

# Verify versions
node --version   # v24.x.x
yarn --version   # 4.12.0

# Test build
yarn build

# Test lint
yarn lint

# Test commit hooks
git add -A && git commit --dry-run
```

## Common Issues

| Issue                                                               | Cause                                                                               | Fix                                                                        |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `SyntaxError: Unknown token` on install                             | Old `.yarnrc` file conflicts with Yarn 4                                            | Delete `.yarnrc`, merge config into `.yarnrc.yml`                          |
| Both `.yarnrc` and `.yarnrc.yml` exist                              | Partial Yarn 4 setup or migration leftover                                          | Merge `.yarnrc` config into `.yarnrc.yml`, delete `.yarnrc`                |
| Registry auth fails after Yarn 4 migration                          | Auth token was in `.yarnrc` but not in `.npmrc`                                     | Keep auth token in `.npmrc` (Yarn 4 reads it); registry URL in `.yarnrc.yml` |
| `lint-staged` adds duplicate changes                                | Deprecated `"git add"` in lint-staged commands                                      | Remove `"git add"` from lint-staged config (auto-staging since v10)        |
| `ENOENT: cloning error` during install                              | Stale `node_modules` from Yarn 1                                                    | Delete all `node_modules/` and reinstall                                   |
| `command not found: patch-package`                                  | `postinstall` script references missing binary                                      | Remove `patch-package` postinstall if no patches exist                     |
| `command not found: lint-staged`                                    | Missing explicit dep in workspace package                                           | Add `lint-staged` to package's `devDependencies`                           |
| `Converting circular structure to JSON`                             | `FlatCompat` wrapping configs with circular refs                                    | Import `eslint-config-next` and `eslint-config-prettier` directly          |
| `Cannot redefine plugin "import"`                                   | Explicit `eslint-plugin-import` registration + `nextCoreWebVitals` both register it | Remove explicit import plugin registration from root `eslint.config.mjs`   |
| `File ignored` warning fails lint                                   | `--max-warnings 0` + ignored file passed by lint-staged                             | Add `--no-warn-ignored` to lint command                                    |
| `--ignore-engines` unknown option                                   | Yarn 4 doesn't support this flag                                                    | Remove from `vercel.json` install commands                                 |
| `--production` unknown option                                       | Yarn 4 doesn't support this flag                                                    | Remove from `vercel.json` install commands                                 |
| `nodeVersion` schema validation error                               | `vercel.json` does not support `nodeVersion` property                               | Use `engines.node` in app `package.json` instead                           |
| Vercel uses Yarn 1.22.x despite `corepack enable` in installCommand | Vercel ignores `corepack enable` in install commands                                | Set `ENABLE_COREPACK=1` as environment variable in Vercel project settings |
| `package-lock.json` warning on Vercel                               | Conflicting lock file from npm/Yarn 1                                               | Delete `package-lock.json` and add to `.gitignore`                         |
| `turbo.json: "pipeline" is deprecated`                              | Turbo 2.x renamed `pipeline` to `tasks`                                             | Rename `"pipeline"` → `"tasks"` in `turbo.json`                           |
| `engines.yarn` blocks Yarn 4                                        | Root `package.json` has `"yarn": ">=1.0.0 <2.0.0"`                                  | Update to `"yarn": ">=4.0.0"`                                             |
| `SyntaxError: "error, try again" is not valid JSON` on install       | Missing or invalid auth token for a scoped package registry                          | Add `npmAuthToken` for all npm scopes in `.npmrc`; add scope to `.yarnrc.yml` `npmScopes` |
| Custom `@experius/*` packages fail to resolve                        | Old `@experius` scope not configured in `.yarnrc.yml`                                | Add `experius` scope to `npmScopes` in `.yarnrc.yml` pointing to same registry |
