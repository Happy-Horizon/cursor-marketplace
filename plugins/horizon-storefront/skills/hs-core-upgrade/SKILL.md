---
name: hs-core-upgrade
description: Upgrade Horizon Storefront client projects from v2+ to v4 (Next.js 12/13/14→16, React 17/18→19). Detects source version, runs codemods, and guides manual fixes. Use when upgrading Horizon Storefront versions, migrating client projects, or when the user mentions v2-to-v4, v3-to-v4, Next.js upgrade, or React 19 migration.
---

# Horizon Storefront Upgrade (v2+/v3 → v4)

Upgrades Horizon Storefront projects from **any v2+ version** to v4.x (Next.js 16, React 19). Automatically detects the source version and applies the appropriate steps.

## Version Detection

Read `package.json` and determine the source version:

| Indicator                       | Source Version       | Next.js   | React     |
| ------------------------------- | -------------------- | --------- | --------- |
| `@experius-commerce/*` packages | **v2 or older**      | 12.x–13.x | 17.x–18.x |
| `@happyhorizon/*` 2.x packages  | **v2** (post-rename) | 13.x      | 18.x      |
| `@happyhorizon/*` 3.x packages  | **v3**               | 14.x      | 18.x      |
| `next` version 12.x–13.x        | **v2 era**           | 12–13     | 17–18     |
| `next` version 14.x             | **v3 era**           | 14        | 18        |
| `next/legacy/image` imports     | **v2 era**           | 12–13     | —         |
| `@apollo/client` dependency     | **v2 era** (early)   | —         | —         |

## Upgrade Checklist

```
Upgrade Progress:
- [ ] Step 0: Detect source version
- [ ] Step 1: Rename @experius → @happyhorizon (v2 only)
- [ ] Step 2: Migrate next/legacy/image (v2 only)
- [ ] Step 3: Run v4 automated codemods
- [ ] Step 4: Update dependencies
- [ ] Step 4b: Clean up legacy tooling (patch-package, patches/, lint-staged)
- [ ] Step 4c: Migrate Yarn 1 → Yarn 4 (v2 projects, see hs-node-yarn-update skill)
- [ ] Step 5: Update next.config / core.config
- [ ] Step 5b: Update vercel.json
- [ ] Step 5c: Migrate ESLint to flat config
- [ ] Step 5d: Migrate turbo.json (if applicable)
- [ ] Step 6: Migrate middleware to proxy
- [ ] Step 7: Fix React 19 type changes
- [ ] Step 8: Fix SCSS breaking changes
- [ ] Step 9: Fix CSS formatting
- [ ] Step 10: Update classify helpers
- [ ] Step 11: Align client app with v4 boilerplate
  - [ ] 11a: Apply v4 ContextProvider architecture (rewrite `_app.tsx`, create local `customContextProviders.tsx`, strip providers from local `pageLayout.tsx` — Step 16d)
  - [ ] 11b: Sidebar API + useUI rename + iron-session compat
  - [ ] 11c: Local `sessionOptions.ts` + rewire `with-session` importers + update `.env.local` `PACKAGE_NAME`
  - [ ] 11d: Align `_error.tsx` (no `404.tsx`/`500.tsx`)
  - [ ] 11e: Rename `public/manifest.json` → `manifest.<theme>.json`
- [ ] Step 12: Install missing third-party dependencies
- [ ] Step 13: Create compatibility shims and barrel files
- [ ] Step 14: Fix runtime issues (UIStaticProvider, dialog null safety, react-intl dedupe)
- [ ] Step 15: Fix remaining TypeScript build errors (use sub-agents for parallel fixes)
  - [ ] 15a: Collect all errors with tsc --noEmit
  - [ ] 15b: Group errors into parallel batches
  - [ ] 15c: Dispatch sub-agents (up to 4 in parallel)
  - [ ] 15d: Verify src/ errors resolved
  - [ ] 15e: Fix node_modules resolution (tsconfig paths)
  - [ ] 15f: Redirect broken node_modules imports
  - [ ] 15g: Final build verification (yarn build → exit code 0)
- [ ] Step 16: Verify build + dev server + browser
```

## Context: Monorepo vs Client Project

**Monorepo** (this repo): Changes go into `packages/` and `apps/`.
**Client projects**: Only have `node_modules/@happyhorizon/*` — upgrades affect `package.json`, `src/`, and config files.

Detect the context first:

- If `packages/` exists → monorepo development
- If `node_modules/@happyhorizon/` exists without `packages/` → client project

## Codemod Script Paths

The codemod scripts are bundled with this skill in the `scripts/` directory next to this `SKILL.md`. Resolve the absolute path to that directory once and reuse it for every command — the scripts work regardless of the plugin install location (marketplace cache, `~/.cursor/plugins/local/`, or a monorepo checkout):

```bash
# Resolve once based on this skill's location, then run from anywhere.
# Replace <skill-dir> with the absolute path to this skill (the directory
# containing this SKILL.md and the scripts/ folder).
SCRIPTS="<skill-dir>/scripts"
node $SCRIPTS/codemod-rename-experius.js . --dry-run
```

All codemod scripts accept the target project root or directory as the first argument — they do NOT need to be run from the directory they live in.

## Step 0: Detect Source Version

Read `package.json` and identify:

- Current `next` version (12.x/13.x = v2, 14.x = v3)
- Current `react` / `react-dom` versions
- Current `@happyhorizon/*` or `@experius-commerce/*` package versions
- Whether `@apollo/client` is present (early v2)
- Whether `next/legacy/image` imports exist in source
- Current `@next/*` package versions
- `eslint-config-next` version

Also check:

- Does `src/middleware.ts` exist? (needs proxy migration)
- Does `next.config.js` use deprecated options?
- Does `next.config.js` have `experimental.middlewarePrefetch`? (needs rename to `proxyPrefetch`)
- Any custom `classify` usage in theme overwrites?
- Does `patches/` directory exist with Next.js patches? (stale after upgrade)
- Does `package.json` have `patch-package` / `postinstall-postinstall`? (needs cleanup)
- Does `package.json` have suspicious deps like `"fs": "*"`? (should be removed)
- Are there custom `@experius/ui-*` plugin packages? (verify v4 equivalents exist on registry)
- Are there custom `@apollo/client` queries in `src/framework/api/`? (needs manual migration)
- Does `.yarnrc` exist with `@experius` scope registries? (codemod handles this)
- Does `engines.yarn` in root `package.json` constrain to Yarn 1? (needs update for Yarn 4)
- Does `turbo.json` use the deprecated `"pipeline"` key? (needs rename to `"tasks"` for Turbo 2.x)
- Does `vercel.json` have `--ignore-engines` in `installCommand`? (incompatible with Yarn 4)
- What ESLint config format is used? (`.eslintrc.*` needs migration to flat config for ESLint 9)
- Does the project use `forwardRef`? (deprecated in React 19, still works but recommended to migrate)

**Set the upgrade path:**

- v2 (with `@experius-commerce/*`): Steps 1 → 16
- v2 (already `@happyhorizon/*`): Steps 2 → 16
- v3: Steps 3 → 16

## Step 1: Rename @experius to @happyhorizon (v2 with legacy scope)

**Skip if** the project already uses `@happyhorizon/*` packages.

Older projects (pre-v2.0.0, before July 2023) use the `@experius-commerce/*` package scope. Run the rename codemod **first**:

```bash
# Dry run to preview changes
node $SCRIPTS/codemod-rename-experius.js . --dry-run

# Apply changes
node $SCRIPTS/codemod-rename-experius.js .
```

This handles:

- `package.json` dependency names (including `resolutions`) + removes `@apollo/client` (replaced by `graphql-request`)
- `package.json` cleanup: removes `patch-package`, `postinstall-postinstall`, and `postinstall` script
- `.npmrc` registry URLs (`npm.experius.nl` → `npm.happyhorizon.dev`)
- `.yarnrc` scope registries (`@experius-commerce:registry` → `@happyhorizon:registry`)
- `tsconfig.json` path mappings
- `.prettierrc.js` import ordering
- All import statements in `.ts/.tsx/.js/.jsx` files

**Custom `@experius/*` plugin packages**: Some projects have custom packages like `@experius/ui-euvatvalidation`, `@experius/ui-postcodenl`, etc. The codemod renames these to `@happyhorizon/ui-*` via catch-all regex. **After running, verify these renamed packages actually exist on the `npm.happyhorizon.dev` registry.** If they don't, you may need to keep the old package names or publish the packages under the new scope.

After running, do `yarn install` to resolve the new package names before continuing.

## Step 2: Migrate next/legacy/image (v2 projects)

**Skip if** project is v3+ (Next.js 14+) — these already use `next/image`.

v2-era projects used `next/legacy/image` with the old `layout` prop API. Run the migration codemod:

```bash
# Dry run to preview changes
node $SCRIPTS/codemod-legacy-image.js ./src --dry-run

# Apply changes
node $SCRIPTS/codemod-legacy-image.js ./src
```

This handles:

- `import Image from 'next/legacy/image'` → `import Image from 'next/image'`
- `layout="fill"` → `fill` prop
- `layout="responsive|intrinsic|fixed"` → removed (new defaults)
- `objectFit` / `objectPosition` → moved to `style` prop
- Removes deprecated `lazyBoundary` / `lazyRoot` props

**Manual review needed:**

- Ensure parent of `fill` images has `position: relative`
- Merge `style` props if component already had inline styles
- Check that image dimensions (`width`/`height`) are correctly set for non-fill images

## Step 3: Run Automated Codemods

Run the v4 codemods in order:

```bash
# 1. Replace JSX.Element with React.ReactElement across codebase
node $SCRIPTS/codemod-jsx-element.js ./src

# 2. Fix useRef() calls to useRef(null)
node $SCRIPTS/codemod-useref.js ./src

# 3. Fix SCSS division operators (/ → *0.5 where applicable)
node $SCRIPTS/codemod-scss-division.js ./src

# 4. Migrate middleware.ts to proxy.ts
node $SCRIPTS/codemod-middleware-to-proxy.js ./src
```

After each codemod, review the changes with `git diff` before proceeding.

## Step 4: Update Dependencies

Update `package.json`:

```json
{
    "next": "16.1.6",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "@next/bundle-analyzer": "16.1.6",
    "@next/third-parties": "16.1.6",
    "eslint-config-next": "16.1.6",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@types/node": "^24.0.0"
}
```

Update all `@happyhorizon/*` packages to `^4.0.0` or latest v4 version.

**v2-specific**: Also remove any remaining legacy deps:

- Remove `@apollo/client`, `apollo-*` packages (if codemod didn't catch them)
- Remove `next-transpile-modules` (built into Next.js 13.1+)
- Remove `@next/font` (built into Next.js 13.2+ as `next/font`)

Then run `yarn install` (or `npm install`).

## Step 4b: Clean Up Legacy Tooling

### patch-package and stale patches

The codemod removes `patch-package` and `postinstall-postinstall` from `package.json`. For the actual patch files, use the **[hs-patch-validation skill](../hs-patch-validation/SKILL.md)** to analyze each patch:

1. **Analyze each patch** using the hs-patch-validation skill to determine if the fix is still needed in the new version
2. **Drop** patches for issues fixed in the new version (e.g. `next+13.5.9.patch` is almost certainly stale for Next.js 16)
3. **Migrate to code** patches that implement project-specific behavior (e.g. URL-specific routing → move to `src/proxy.ts`)
4. **Re-apply** patches that fix bugs still present in the new version (use `yarn patch <package>` for Yarn 4)
5. Remove `"postinstall": "patch-package"` from scripts if not already removed

### lint-staged cleanup

Older projects may have `"git add"` in their `lint-staged` commands. This is deprecated in modern `lint-staged` and should be removed:

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

### Suspicious dependencies

Remove `"fs": "*"` if present — `fs` is a Node.js built-in and should not be listed as a dependency. Some v2 projects added this erroneously.

### Storybook compatibility

If the project uses Storybook 7.x, it may not be compatible with React 19. Check the Storybook changelog for React 19 support — Storybook 8.x+ is required. Update:

```json
{
    "@storybook/react": "^8.0.0",
    "@storybook/nextjs": "^8.0.0",
    "storybook": "^8.0.0"
}
```

Also update related addons (`@storybook/addon-essentials`, etc.) to matching 8.x versions.

## Step 4c: Migrate Yarn 1 → Yarn 4 (v2 projects)

**Skip if** the project already uses Yarn 4 (check for `packageManager` field in root `package.json` or `yarn --version` shows 4.x).

Most v2 projects use Yarn 1.x. The upgrade to v4 requires several coordinated changes. Follow the **[hs-node-yarn-update skill](../hs-node-yarn-update/SKILL.md)** for the complete migration, which covers:

1. **Enable Corepack**: `corepack enable && yarn set version 4.12.0`
2. **Migrate `.yarnrc` → `.yarnrc.yml`**: Move scope registries to `npmScopes` format, keep auth tokens in `.npmrc`
3. **Update `engines.yarn`** in root `package.json`: `"yarn": ">=4.0.0"` (v2 projects often have `"<2.0.0"` which blocks Yarn 4)
4. **Add `engines`** to each `apps/*/package.json` (Vercel reads these)
5. **Remove incompatible scripts**: `--ignore-engines`, `--production` flags
6. **Update `vercel.json`**: Remove `--ignore-engines` from `installCommand` (see Step 5b)
7. **Set `ENABLE_COREPACK=1`** in Vercel project settings
8. **Clean install**: Delete all `node_modules/`, then `yarn install`

**Important**: The rename codemod (Step 1) already handles `.yarnrc` scope renames (`@experius-*` → `@happyhorizon`), so `.yarnrc` should have correct scopes before this migration.

## Step 5: Update next.config / core.config

### Build command change

In `package.json`, update the build script:

```diff
-"build": "next build",
+"build": "next build --webpack",
```

### Client project config cleanup

If the project has a custom `next.config.js`, check for these changes:

**v2-specific:**

- Remove `next-transpile-modules` wrapper (use `transpilePackages` array instead)
- Remove `images.loader` if using legacy loader (Fastly loader comes via package update)
- Remove `experimental.appDir` (if present from Next.js 13 era)
- Remove `compiler.styledComponents` (if not using styled-components)
- Remove SWC plugin configurations for old versions

**All versions — check custom config overlays:**

- **`experimental.middlewarePrefetch: 'flexible'`** → Rename to `experimental.proxyPrefetch: 'flexible'` (this is easy to miss in client `next.config.js` files that spread `coreConfig.experimental`)
- Update `@experius/*` references in `transpilePackages` arrays to `@happyhorizon/*` (the rename codemod handles import statements but may miss config arrays in custom next.config.js files)

### core.config.js changes (monorepo only)

For client projects these changes come via `@happyhorizon/commerce-core` package update. In monorepo, apply manually:

| Removed / Changed                   | Replacement                                              |
| ----------------------------------- | -------------------------------------------------------- |
| `eslint.dirs`                       | Remove entirely (Next.js 16 auto-detects)                |
| `swcMinify: true`                   | Remove (default in Next.js 16)                           |
| `experimental.cssChunking`          | Remove (stable in Next.js 16)                            |
| `experimental.esmExternals`         | Remove (default in Next.js 16)                           |
| `experimental.bundlePagesExternals` | Move to top level: `bundlePagesRouterDependencies: true` |
| `experimental.middlewarePrefetch`   | Rename to `experimental.proxyPrefetch`                   |
| `serverRuntimeConfig`               | Merge keys into `env` block                              |

Add `turbopack: {}` at the config root level (enables Turbopack support).

Handle `MEDIA_URL` safely:

```javascript
// Before (v3)
...process.env.MEDIA_URL.split(',').map(...)

// After (v4)
...(process.env.MEDIA_URL || '').split(',').filter(Boolean).map(...)
```

## Step 5b: Update vercel.json

Update all `vercel.json` files in each app directory:

```diff
-"installCommand": "cd ../../ && yarn install --ignore-engines",
+"installCommand": "cd ../../ && yarn install",
```

**Also set** the `ENABLE_COREPACK` environment variable to `1` in Vercel project settings. Without it, Vercel falls back to Yarn 1.22.x. See the [hs-node-yarn-update skill](../hs-node-yarn-update/SKILL.md) for details.

## Step 5c: Migrate ESLint to Flat Config

Next.js 16 with ESLint 9 uses the flat config format. Migrate from `.eslintrc.*` to `eslint.config.mjs`.

**v2 projects** typically have `.eslintrc.js` (root) and `.eslintrc.json` (app level). Both need migration.

Key points:

- Import `eslint-config-next/core-web-vitals` and `eslint-config-prettier` directly (not through `FlatCompat`)
- Only use `FlatCompat` for plugins that don't support flat config (e.g. `eslint-plugin-storybook`)
- Do NOT explicitly register `eslint-plugin-import` — it's included via `nextCoreWebVitals`
- Add `--no-warn-ignored` to lint commands in `lint-staged`

See the **[hs-node-yarn-update skill](../hs-node-yarn-update/SKILL.md)** ESLint Compatibility section for complete flat config examples and common issues (circular references, plugin redefinition).

## Step 5d: Migrate turbo.json (if applicable)

If the project uses Turborepo, check the `turbo.json` config. Turbo 2.x renamed `"pipeline"` to `"tasks"`:

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
         }
     }
 }
```

Also update `turbo` in root `devDependencies` to the latest 2.x version.

## Step 6: Migrate Middleware to Proxy

Next.js 16 renames the middleware concept to "proxy". In client projects:

1. Rename `src/middleware.ts` → `src/proxy.ts`
2. Rename the exported function:

```diff
-export function middleware(request: NextRequest) {
+export function proxy(request: NextRequest) {
```

Everything else (config, matcher, logic) stays the same.

## Step 7: Fix React 19 Type Changes

### JSX.Element → React.ReactElement

React 19 removes the global `JSX` namespace. Replace all occurrences:

```diff
-type ParsedElement = JSX.Element | object | void | undefined | null | false;
+type ParsedElement = React.ReactElement | object | void | undefined | null | false;
```

Add `import React from 'react'` or `import type React from 'react'` where needed.

### useRef requires initial value

React 19 requires an explicit initial value for `useRef`:

```diff
-const ref = useRef();
+const ref = useRef<HTMLDivElement | null>(null);
```

### forwardRef deprecation (optional)

React 19 deprecates `forwardRef` — ref is now passed as a regular prop. Existing `forwardRef` usage still works but is recommended to migrate:

```diff
-import { forwardRef } from 'react';
-
-const MyComponent = forwardRef<HTMLDivElement>(
-    ({ children, ...props }, ref) => {
-        return <div ref={ref} {...props}>{children}</div>;
-    },
-);
+const MyComponent = ({ children, ref, ...props }: { children: React.ReactNode; ref?: React.Ref<HTMLDivElement> }) => {
+    return <div ref={ref} {...props}>{children}</div>;
+};
```

This is not a breaking change — `forwardRef` still works in React 19. Prioritize other fixes first.

### forwardRef destructuring pattern (classify helper)

The `classify` helper pattern changed to avoid direct parameter destructuring in `forwardRef`:

```diff
-const WrappedComponent = forwardRef<Ref, Props>(
-    ({ extraClasses, classes, ...rest }, ref) => {
+const WrappedComponent = forwardRef<Ref, Props>(
+    (props, ref) => {
+        const { extraClasses, classes, ...rest } = props as Props;
```

This applies to any custom `classify` usage in theme overwrites.

### Custom Apollo GraphQL queries (v2 projects)

If the project has custom `@apollo/client` queries in `src/framework/api/` (e.g. `gql` template literals), these need manual migration to `graphql-request` patterns. The `@happyhorizon/commerce-*` packages handle internal queries, but custom client-side GraphQL calls need updating:

```diff
-import { gql } from '@apollo/client';
-
-export const GET_POPULAR_BRANDS = gql`
-    query GetPopularBrands {
-        ...
-    }
-`;
+import { gql } from 'graphql-request';
+
+export const GET_POPULAR_BRANDS = gql`
+    query GetPopularBrands {
+        ...
+    }
+`;
```

The `gql` tag works the same way in `graphql-request`. The main change is the import source. If queries use Apollo-specific features (like `@client` directives, `fetchPolicy`, or `cache` config), those need to be refactored to use the `graphql-request` API or the framework's built-in data fetching patterns.

Check `src/framework/` for files that import from `@apollo/client` and update them.

## Step 8: Fix SCSS Breaking Changes

### Division operator deprecation

Sass deprecated `/` for division. Replace with `*0.5` or `math.div()`:

```diff
-width: ($ui-container-max-width-large / 2) - 3.5rem;
+width: ($ui-container-max-width-large * 0.5) - 3.5rem;
```

### Missing semicolons after @content

```diff
 @mixin min-screen($breakpoint) {
     @media (min-width: $breakpoint) {
-        @content
+        @content;
     }
 }
```

### SCSS property ordering

Ensure properties come before media queries in rule blocks.

## Step 9: Fix CSS Formatting

- **Leading zeros**: `.75rem` → `0.75rem`
- **Quote consistency**: Use single quotes
- **Multi-line values**: Long box-shadow, transitions across multiple lines

## Step 10: Update classify Helpers

If the project has custom `classify` usage in theme overwrites, update the `WithClassesProps` type:

```diff
-type WithClassesProps<P, Classes> = Omit<P, 'classes'> & {
+type WithClassesProps<P, Classes> = Omit<P, 'classes' | 'extraClasses'> & {
```

## Step 11: Align Client App with v4 Boilerplate

Client app directories (e.g. `apps/vekto/`) must be aligned with the v4 boilerplate. This is a **major step** that affects 200–400 files in a typical v2 project. See [v3-to-v4-changes.md — Client App Alignment](v3-to-v4-changes.md#client-app-alignment-apps--v4-boilerplate) for the complete reference.

### 11a: core.config.js

Update the webpack alias plugin, transpilePackages, and all config options:

- Rename all `@experius-commerce/*` and `@experius/ui` references in alias definitions
- Add `@happyhorizon/storefront-app` and `@happyhorizon/commerce-router` to `transpilePackages`
- Replace `images.domains` with `images.remotePatterns`
- Add `sassOptions.silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'mixed-decls']`
- Remove `eslint.dirs`, `swcMinify`
- Remove `serverRuntimeConfig` — merge into `env` block
- Ensure all `env` values are strings (not booleans/numbers)
- `JSON.stringify()` any object env values (e.g. `STORES`)

### 11b: next.config.js (client overrides)

- Rename `experimental.middlewarePrefetch` → `experimental.proxyPrefetch`
- Update redirect/rewrite patterns: `:path*` → `/:path*` (path-to-regexp v8)
- Update `@experius/*` in `transpilePackages` to `@happyhorizon/*`

### 11c: package.json

- Add all new v4 dependencies (see v3-to-v4-changes.md Category 4)
- Remove `"fs": "*"`, `patch-package`, `postinstall-postinstall`
- Update dev/build scripts: add `--webpack` flag
- Update `lint-staged`: remove `"git add"`, add `--no-warn-ignored --`
- Update Storybook to 8.x
- Add `engines.node`

### 11d: _app.tsx

Add explicit `layoutProps` default:

```diff
-<PageLayout {...props} {...pageProps} locale={locale}>
+<PageLayout {...props} {...pageProps} layoutProps={pageProps.layoutProps || {}} locale={locale}>
```

### 11e: Theme component API migrations

- **Sidebar API**: Refactor `authSidebar.tsx` and `miniCart.tsx` — replace `header={<Header ... />}` with direct props (`closeSidebar`, `title`, `onBack`, etc.)
- **useUI() context**: `setSidebarView` → `handleSidebarViewChange`
- **useSearchBarWrapper** → `useSearch`

### 11f: Theme `pageLayout.tsx` provider chain

The local theme `pageLayout.tsx` (resolved by the `@happyhorizon/ui` alias plugin BEFORE the upstream version) needs the full v4 provider stack. **`MegaMenuProvider` is the easiest one to miss** — `<Header>` from v4 `@happyhorizon/ui` calls `useMegaMenu()` internally, so omitting it crashes the dev server on first render even though `yarn build` exits 0.

Import and wrap (innermost — wraps `<Header>` and `<MobileMenu>`):

```tsx
import { MegaMenuProvider } from '@happyhorizon/ui/context/megaMenuProvider';

// inside the existing provider stack:
<CompareListProvider>
    <MegaMenuProvider>
        <Header />
        ...
        <MobileMenu />
    </MegaMenuProvider>
</CompareListProvider>
```

See [v3-to-v4-changes.md Category 6c](v3-to-v4-changes.md) for the full provider chain.

### 11g: PWA manifest filename

v4 `<Meta>` references `/manifest.${process.env.THEME}.json` (see `node_modules/@happyhorizon/ui/components/meta.tsx`). Rename the public-folder manifest to match the active theme:

1. Read the active theme from `apps/<app>/config/theme.config.json` — top-level object key (e.g. `"base"`, `"vekto"`).
2. `git mv apps/<app>/public/manifest.json apps/<app>/public/manifest.<theme>.json`
3. For multi-theme projects (parent chain in `theme.config.json`), create one manifest per theme.

The plain `manifest.json` filename is a v2/v3 holdover. In v4 it 404s — no build error, no render error, just silent PWA degradation. See [v3-to-v4-changes.md Category 6e](v3-to-v4-changes.md).

## Step 12: Install Missing Third-Party Dependencies

v4 packages may pull in dependencies that were previously transitive or bundled. Install explicitly:

```bash
yarn add sass critters classnames node-html-parser request-ip react-lazy-hydration react-glider react-zoom-pan-pinch react-slider
```

Also install `next-pwa` if the project uses it (may have been transitive before).

## Step 13: Create Compatibility Shims and Barrel Files

### iron-session compatibility shim

Create `src/lib/iron-session-compat.ts` to bridge `iron-session/next` (v6 API) to v8:

```typescript
import { getIronSession } from 'iron-session';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { GetServerSidePropsContext, GetServerSidePropsResult } from 'next';

export function withIronSessionApiRoute(handler, options) {
    return async (req: NextApiRequest, res: NextApiResponse) => {
        (req as any).session = await getIronSession(req, res, options);
        return handler(req, res);
    };
}

export function withIronSessionSsr(handler, options) {
    return async (context: GetServerSidePropsContext) => {
        (context.req as any).session = await getIronSession(context.req, context.res, options);
        return handler(context);
    };
}
```

Then update all files importing from `iron-session/next` to use the local shim. Commonly affected: `src/pages/api/cart.tsx`, `src/pages/api/user.ts`, `src/pages/api/postcodenl.ts`, and SSR pages using `withIronSessionSsr`.

### Form validator compatibility shim

v4 renamed form validation helpers in `@happyhorizon/ui/helpers/forms`:

| Old Name (v3) | New Name (v4) |
|---|---|
| `isRequired` | `validateIsRequired` |
| `hasLengthAtLeast` | `validateLengthAtLeast` |
| `hasLengthAtMost` | `validateLengthAtMost` |
| `validateConfirmPassword` | `validateEqualToField` |

Create `src/lib/form-validators-compat.ts` to maintain backward compatibility:

```typescript
import { validateIsRequired } from '@happyhorizon/ui/helpers/forms/validateIsRequired';
import { validateLengthAtLeast } from '@happyhorizon/ui/helpers/forms/validateLengthAtLeast';
import { validateLengthAtMost } from '@happyhorizon/ui/helpers/forms/validateLengthAtMost';
import { validateEqualToField } from '@happyhorizon/ui/helpers/forms/validateEqualToField';

export const isRequired = validateIsRequired;
export const hasLengthAtLeast = validateLengthAtLeast;
export const hasLengthAtMost = validateLengthAtMost;
export const validateConfirmPassword: (...args: any[]) => any = validateEqualToField;
```

Then update imports in theme files that used the old names:

```diff
-import { isRequired, hasLengthAtLeast } from '@happyhorizon/ui/helpers/forms';
+import { isRequired, hasLengthAtLeast } from '@/lib/form-validators-compat';
```

### Theme barrel files

Create local barrel files for removed package exports:

1. `src/theme/<themename>/ui/hooks/index.ts` — re-export hooks from individual paths
2. `src/theme/<themename>/ui/helpers/index.ts` — re-export helpers + stubs
3. `src/theme/<themename>/ui/helpers/gtag.ts` — no-op `dispatchGtag` stub

**Important**: `trackPageView` is NOT in the `gtag.ts` stub. It should be re-exported in the helpers barrel from `@happyhorizon/ui/dataLayer`:

```typescript
// src/theme/<themename>/ui/helpers/index.ts
export { classify } from '@happyhorizon/ui/helpers/classify';
export * from '@happyhorizon/ui/helpers/catalog';
// trackPageView moved to dataLayer in v4
export { trackPageView } from '@happyhorizon/ui/dataLayer';
// dispatchGtag removed in v4 - local no-op stub
export { dispatchGtag } from './gtag';
```

See [v3-to-v4-changes.md](v3-to-v4-changes.md) for exact file contents.

### Theme meta overwrite

If the project imports `@theme/appLogo.png`, create a `meta.tsx` theme overwrite importing `.svg` instead.

## Step 14: Fix Runtime Issues

After the dev server starts without compilation errors, test in the browser. Common runtime issues:

### UIStaticProvider wrapping

If you see `TypeError: Cannot read properties of undefined (reading 'generalInformation')`, wrap `ManagedUIContext` with `UIStaticProvider` in `pageLayout.tsx`:

```diff
+import { UIStaticProvider } from '@happyhorizon/ui/context/uiStatic';

+<UIStaticProvider layoutProps={props.layoutProps || {}} ...>
     <ManagedUIContext layoutProps={props.layoutProps || {}} ...>
         {children}
     </ManagedUIContext>
+</UIStaticProvider>
```

### BaseDialog null safety

If you see `TypeError: Cannot read properties of null (reading 'close')`, update `baseDialog.tsx` with null ref guards:

```typescript
useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen) {
        if (!dialog.open) isModal ? dialog.showModal() : dialog.show();
    } else {
        if (dialog.open) dialog.close();
    }
}, [isOpen, isModal]);
```

### Desktop flyout menu broken

This is typically caused by the `baseDialog.tsx` crash. Fixing the null safety guards above resolves the menu.

## Step 15: Fix Remaining TypeScript Build Errors

This step fixes all remaining TypeScript errors after prior steps. It is designed to be **parallelized using sub-agents** for speed.

### 15a: Collect all errors at once

Next.js build shows only **one error at a time**. Use `tsc` to get the full error list:

```bash
# Collect ALL src/ errors (skip node_modules — those are handled in 15f)
npx tsc --noEmit --types cypress,node 2>&1 | grep "^src/" | sort -u
```

If `tsc` fails early on missing type definitions (e.g., `Cannot find type definition file for 'gtag.js'`), override with `--types`:

```bash
npx tsc --noEmit --types cypress,node 2>&1 | grep "^src/" | sort -u
```

### 15b: Group errors for parallel sub-agents

Analyze the error list and group into **up to 4 parallel batches** by error pattern:

| Group | Error Pattern | Fix Strategy |
|---|---|---|
| **Import errors** | `has no exported member 'dispatchGtag'`, `has no exported member 'trackPageView'`, `Cannot find module '...'` | Change import paths to `@theme/ui/helpers/gtag` (for `dispatchGtag`) or `@theme/ui/helpers` (for `trackPageView`). See import fix rules below. |
| **Classify/prop-spread errors** | `Property 'X' does not exist on type 'IntrinsicAttributes & Omit<...>'` | Apply spread-as-any pattern. See pattern rules below. |
| **Component API errors** | `Property 'X' is missing in type ... but required`, `Type 'X' is not assignable to type 'Y'` | Add missing required props, cast incompatible types. See component API rules below. |
| **Complex page errors** | Multiple errors in checkout.tsx, product.tsx, category.tsx | Read full file, apply combination of above patterns. See complex fix rules below. |

### 15c: Dispatch sub-agents with these instructions

Launch up to 4 `Task` sub-agents in parallel. Each sub-agent prompt MUST include:

1. **The project path**: e.g., `/Users/.../apps/vekto/`
2. **The exact file list** with line numbers and error messages
3. **The fix patterns** (copy the relevant section below into the prompt)
4. **An instruction to read each file before editing**

#### Fix patterns to include in sub-agent prompts

**PATTERN: Import fixes (dispatchGtag / trackPageView)**

- `dispatchGtag` was removed from `@happyhorizon/ui/helpers`. Import from `@theme/ui/helpers/gtag` instead.
- `trackPageView` was moved. Import from `@theme/ui/helpers` (the barrel file), NOT from `@theme/ui/helpers/gtag`.
- If a file imports BOTH, use two separate import lines.
- If other members remain in the original `@happyhorizon/ui/helpers` import (e.g., `classify`), keep that line but remove `dispatchGtag`/`trackPageView` from it.
- If the import becomes empty after removing members, delete the entire line.

```typescript
// dispatchGtag — import from gtag stub
import { dispatchGtag } from '@theme/ui/helpers/gtag';
// trackPageView — import from helpers barrel (NOT gtag)
import { trackPageView } from '@theme/ui/helpers';
```

**PATTERN: Spread-as-any (for classify HOC prop mismatches)**

When a classified component rejects props that the theme overwrite expects:

```tsx
// BEFORE — fails because 'showRowTotal' is not in the type
<ProductList cart={cart} showRowTotal={true} />

// AFTER — keep key/ref as direct attributes, wrap everything else
<ProductList key={k} {...{ cart, showRowTotal: true } as any} />
```

Rules:
- Keep `key` and `ref` as direct JSX attributes (React needs them outside spreads)
- Wrap ALL other props in `{...{ } as any}`
- When an HTML element gets `restProps` with `title?: ReactNode`, cast: `{...restProps as any}`

**PATTERN: className → extraClasses**

```diff
-<Heading className={classes.title}>Title</Heading>
+<Heading extraClasses={{ root: classes.title }}>Title</Heading>
```

Affected: `Heading`, `EnergyIcon`, `Wysiwyg`, `Row`, `Button` (`classes={x}` → `extraClasses={{ root: x }}`)

**PATTERN: New required props**

| Component | Add Props | Values |
|---|---|---|
| `Checkbox` | `name` | Same as `field` value |
| `Logo` | `width`, `height` | Numeric dimensions (e.g., `150`, `40`) |
| `AddressAddEditDialog` | `isBusy` | `false` |
| `ProductShell` | `entity`, `reviews`, `compare` | `product` object, `false`, `false` |
| `ProductActions` | `reviewCount` | `0` |
| `CheckoutStep` | `activeStep` | `layout.activeStep` (was `currentStep` in v3) |

**PATTERN: Checkout hook rename**

```diff
-const { currentStep } = useCheckout();  // or layout.currentStep
+const { activeStep } = useCheckout();   // or layout.activeStep
```

Replace ALL `currentStep` references with `activeStep` in checkout files.

**PATTERN: Side-effect-only components**

Components that only run `useEffect` without rendering must return `null`:

```diff
 const MyWidget = ({ slug }) => {
     useEffect(() => { /* side effects */ }, [slug]);
+    return null;
 };
```

**PATTERN: ItemSlider import resolution**

When `ItemSlider` rejects extra props (`titleUrl`, `titleLinkLabel`):

```diff
-import { ItemSlider } from '@happyhorizon/ui/components/itemSlider';
+import { ItemSlider } from '@theme/ui/components/itemSlider/itemSlider';
```

**PATTERN: Form validator imports**

When `isRequired`, `hasLengthAtLeast`, `hasLengthAtMost`, or `validateConfirmPassword` are not found:

```diff
-import { isRequired, hasLengthAtLeast } from '@happyhorizon/ui/helpers/forms';
+import { isRequired, hasLengthAtLeast } from '@/lib/form-validators-compat';
```

(Requires the compat shim from Step 13.)

#### Example sub-agent prompt template

```
You need to fix TypeScript errors in a Horizon Storefront client project at `<PROJECT_PATH>`.

CONTEXT: This project was upgraded from v3 to v4. The `classify` HOC produces
stricter types in v4. Use the patterns below to fix errors.

FILES AND ERRORS:
1. `<file>` line <N>: <error message>
2. `<file>` line <N>: <error message>
...

FIX PATTERNS:
<paste the relevant patterns from above>

For each file:
1. Read the file to understand the context around the error
2. Apply the appropriate fix pattern
3. Do NOT break existing functionality

Return a summary of changes made to each file.
```

### 15d: Verify src/ errors are resolved

After all sub-agents complete, re-run:

```bash
npx tsc --noEmit --types cypress,node 2>&1 | grep "^src/" | sort -u
```

If errors remain, fix them manually or dispatch another sub-agent round.

### 15e: Fix node_modules resolution errors

After all `src/` errors are fixed, the build may still fail on `node_modules/` errors.

**For `@experius/*` packages** (legacy plugins like `ui-euvatvalidation`, `ui-ordercomment`):
Add tsconfig.json path mappings so TypeScript can resolve their old-style imports:

```json
{
    "paths": {
        "@experius/ui/*": ["./src/theme/<theme>/ui/*", "../../node_modules/@happyhorizon/ui/*"],
        "@experius-commerce/swr/*": ["./src/swr/*", "../../node_modules/@happyhorizon/commerce-swr/*"],
        "@experius-commerce/core/*": ["../../node_modules/@happyhorizon/commerce-core/*"],
        "@experius-commerce/types/*": ["../../node_modules/@happyhorizon/commerce-types/*"],
        "@happyhorizon-commerce/types/*": ["../../node_modules/@happyhorizon/commerce-types/*"],
        "@happyhorizon-commerce/utils/*": ["../../node_modules/@happyhorizon/commerce-utils/*"]
    }
}
```

**For remaining `@happyhorizon/*` internal errors** (e.g., `Settings` type missing properties):
Add `typescript.ignoreBuildErrors` to `next.config.js`:

```javascript
typescript: {
    // All src/ type errors resolved; remaining errors are package-internal
    ignoreBuildErrors: true,
},
```

### 15f: Redirect imports away from broken node_modules

When a node_modules package uses removed APIs (e.g., `@happyhorizon/ui-postcodenl` importing `next/config`), redirect the import in the consuming file to the theme overwrite:

```diff
-import { postcodeHandler } from '@happyhorizon/ui-postcodenl/pages/api/postcodenl';
+import { postcodeHandler } from '@theme/ui-postcodenl/pages/api/postcodenl';
```

### 15g: Final build verification

Run `yarn build` (not just `tsc`). The webpack build may catch module resolution errors that `tsc` misses (e.g., `next/config` removal). Keep iterating until exit code 0.

## Step 16: Verify Build + Dev Server + Browser

The upgrade is **NOT complete** until BOTH `yarn build` AND `yarn dev` pass without errors. A green build alone is not sufficient — `next build --webpack` skips many React 19 / context-resolution checks that only fire on hydration. A handful of v4 breakages (duplicate React contexts, missing providers, runtime hook chains) will only show up on the first dev render.

### 16a: Build verification

```bash
yarn build  # equivalent to: next build --webpack
```

Iterate until exit code 0. See Step 15 for the TS error grind workflow.

### 16b: Dev server verification (REQUIRED)

```bash
# From a separate terminal, run the dev server
yarn dev

# In a second terminal, hit the homepage AND the core API routes
curl -s -o /dev/null -w "GET /         -> %{http_code}\n" http://localhost:3000/
curl -s -o /dev/null -w "GET /api/cart -> %{http_code}\n" http://localhost:3000/api/cart
curl -s -o /dev/null -w "GET /api/user -> %{http_code}\n" http://localhost:3000/api/user
```

`yarn dev` must:

1. Start (`Ready in Xms`) without throwing.
2. Compile the homepage on first request without webpack/sass errors.
3. Return **HTTP 200** for `GET /` (NOT 500).
4. Return **HTTP 200** for `GET /api/cart` and `GET /api/user` (NOT 500). These exercise the iron-session v8 codepath end-to-end.
5. Render the homepage HTML (>10 KB body) without React error overlays.

If any of these returns 500, `tail` the dev log and match the stack trace against the table in **16c: Common dev-server runtime errors**. The two most common patterns:

- `useXxx must be used within a XxxProvider` — missing v4 provider in local theme `pageLayout.tsx`.
- `TypeError: argument name is invalid` thrown from `req.session.save()` (or any `getIronSession` call) — iron-session v8 cookie-name validation rejecting a scoped npm name.

### 16c: Common dev-server runtime errors (and the fixes)

| Symptom in dev log | Root cause | Fix |
|---|---|---|
| `[React Intl] Could not find required intl object` thrown from inside an upstream hook (e.g. `useUserContext`, `useCart`) even though `<LocaleProvider>` is present in `_app.tsx` | **Duplicate `react-intl` install**. `@happyhorizon/commerce-swr` pins `react-intl` to an exact version. If anything else in the tree (e.g. legacy `@experius/ui-postcodenl@2.x` peer of `@experius/ui@3.1.2`) pulls a different exact version, you get two `IntlContext` objects. The provider only registers one of them. | Add `"react-intl": "<version-from-commerce-swr>"` to root `package.json` `resolutions`, then `yarn install`. Verify with `find node_modules -name react-intl -type d` — only one path should exist. |
| `useMegaMenu must be used within a MegaMenuProvider` (also `useMyStore`, custom-context hooks) | The local theme is missing a `customContextProviders.tsx` (or it doesn't register the provider). v4 `<Header>` calls `useMegaMenu()` internally; the provider must be supplied through the upstream `<ContextProvider>` chain via the local override at `apps/<app>/src/theme/<theme>/ui/context/customContextProviders.tsx`. | See **16d Part 2** — register `MegaMenuProvider` (and any project-specific providers like `ManagedMyStoreContext`) in the local `customContextProviders` array. Do NOT add `<MegaMenuProvider>` inside `pageLayout.tsx` — that's the v3 pattern. |
| `Cannot read properties of undefined (reading 'generalInformation')` | Missing `<UIStaticProvider>` wrapper. | Wrap `<ManagedUIContext>` with `<UIStaticProvider layoutProps={safeLayoutProps}>` (see Category 6 in `v3-to-v4-changes.md`). |
| `Cannot read properties of null (reading 'close')` (or `.show`/`.showModal`) | `dialogRef.current` is null on hydration. | Add null guards in `baseDialog.tsx` (see Category 6). |
| `useUser is not defined` (or `TypeError: useUser is not a function`) inside a theme overwrite hook | v4 deprecates the default `useUser` export — files that still call `useUser()` may have been renamed to import only `useUserContext`. | Either `import { useUser } from '@happyhorizon/commerce-swr/lib/useUser'` (still exported, deprecated) or — preferred — replace the call with `useUserContext()`. |
| `TypeError: argument name is invalid` thrown from `req.session.save()` / `getIronSession` (typically observed as `GET /api/cart 500` and `GET /api/user 500`) | **iron-session v8 cookie-name validation**. The upstream `@happyhorizon/commerce-utils/lib/with-session` derives its cookie name from `` `horizon-${process.env.PACKAGE_NAME}` ``. After the v4 rename `PACKAGE_NAME` is a scoped npm name (e.g. `@happyhorizon/<app>-app`); `@` and `/` are not in the RFC-6265 allowed cookie-name set, so iron-session throws on every save. | Two-step fix: (a) update `apps/<app>/.env.local` and `.env.local.example` so `PACKAGE_NAME` matches the new `apps/<app>/package.json` `name` (the codemod renames `package.json` but not `.env.local`); (b) shadow the upstream `sessionOptions` with a local `apps/<app>/src/lib/sessionOptions.ts` that sanitizes the cookie name (`replace(/[^A-Za-z0-9!#$%&'*+\-.^_\`\|~]/g, '-')`) and re-point all 7–9 importers (`pages/api/cart.tsx`, `pages/api/user.ts`, `pages/checkout.tsx`, `pages/customer/account/*.tsx`, `pages/[[...slug]].tsx`) from `@happyhorizon/commerce-utils/lib/with-session` to `@/lib/sessionOptions`. See [v3-to-v4-changes.md](v3-to-v4-changes.md) Category 6e. |
| `404` for `/manifest.json` in browser console / `<head>` | v4's `@happyhorizon/ui/components/meta.tsx` references `` `/manifest.${process.env.THEME}.json` ``, but the public manifest still uses the v2/v3 name `manifest.json`. | Rename `apps/<app>/public/manifest.json` to `manifest.<theme>.json` (theme matches the top-level key in `apps/<app>/config/theme.config.json`, typically `base`). Ensure `THEME` is set in `.env.local`. |

### 16d: Canonical v4 architecture — `<ContextProvider>` + `customContextProviders` + dumb `pageLayout.tsx`

> **v3-vs-v4 inversion:** v3 stuffed every provider into the local theme `pageLayout.tsx` and `_app.tsx` only rendered `<LocaleProvider><SWRConfig><PageLayout>`. v4 inverts this — `<ContextProvider>` from `@happyhorizon/ui/context/contextProvider` owns the entire provider chain, and `pageLayout.tsx` is a pure presentation component. Missing this rewrite is the #1 source of `useXxx must be used within a XxxProvider` errors after the upgrade — the local theme `pageLayout.tsx` keeps shipping the v3 provider chain even though the upstream architecture has moved on.

**Three things must be in place:**

#### 1. `_app.tsx` uses `<ContextProvider>` (no manual provider stack)

```tsx
import React from 'react';
React.useLayoutEffect = React.useEffect;

import { useRouter } from 'next/router';

import { Registry } from '@happyhorizon/commerce-core/registry';
import { PageLayout } from '@happyhorizon/ui/components/pageLayout';
import { ContextProvider } from '@happyhorizon/ui/context/contextProvider';

import '@theme/styles/globals.scss';

const fetcher = (resource, init) =>
    fetch(resource, init).then((res) => res.json());

function StorefrontHorizonApp(props) {
    const { Component, pageProps } = props;
    const { locale } = useRouter();

    if (pageProps && Object.keys(pageProps).length === 0) {
        return <Component {...pageProps} />;
    }

    return (
        <ContextProvider
            value={{ fetcher }}
            {...pageProps}
            locale={locale}
            layoutProps={pageProps.layoutProps || {}}
        >
            <PageLayout type={pageProps?.type}>
                <Registry entity={pageProps?.entity}>
                    <Component {...pageProps} />
                </Registry>
            </PageLayout>
        </ContextProvider>
    );
}

export default StorefrontHorizonApp;
```

`<ContextProvider>` automatically applies the **standard provider chain** from upstream `@happyhorizon/ui/context/contextProvider`:

```
StaticUIContext → ManagedUIContext → CmsProvider → LocaleProvider →
CompareListProvider → SWRConfig → ...customContextProviders
```

Each provider in that chain receives only the `pageProps` keys whitelisted in its `props` array (e.g. `StaticUIContext` receives `layoutProps`, `customerContext`, `abtest`, `locale`, `currencyCode`, `storeCode`). `value={{ fetcher }}` is forwarded to `SWRConfig`.

#### 2. Project-specific providers go in `src/theme/<theme>/ui/context/customContextProviders.tsx`

The HS commerce-core theme alias plugin resolves `@happyhorizon/ui/context/customContextProviders` to this local file at build time. Anything not in the standard chain (`MegaMenuProvider`, `ManagedMyStoreContext`, custom CMS context, etc.) belongs here — **not** in `pageLayout.tsx`.

```tsx
import type { ContextProviderInterface } from '@happyhorizon/ui/context/contextProvider';

import { MegaMenuProvider } from '@happyhorizon/ui/context/megaMenuProvider';
import { ManagedMyStoreContext } from '@theme/context/myStore';

export const customContextProviders: ContextProviderInterface[] = [
    { Provider: ManagedMyStoreContext, props: [] },
    { Provider: MegaMenuProvider, props: [] },
];
```

`props` semantics:

- `props: ['foo', 'bar']` — only forward `pageProps.foo` and `pageProps.bar`
- `props: []` — forward nothing
- omit `props` — forward all `pageProps`

#### 3. Local `pageLayout.tsx` is a pure presentation component (NO providers)

The local override should mirror the **upstream** signature (`@happyhorizon/ui/components/pageLayout/pageLayout.tsx`) — read context via `useUIStatic()`, render `<Meta>`, `<SkipTo>`, `<Header>`, `<Global>`, `<MiniCart>`, `<AuthSidebar>`, `<MobileMenu>`, `<Footer>`, `<ToastContainer>`. Add **only** project-specific UI (e.g. `<SiteNotice />`) — never re-add `<UIStaticProvider>`, `<ManagedUIContext>`, `<MegaMenuProvider>`, `<Registry>`, etc. Those have all moved up the tree.

```tsx
function PageLayoutComponent({ classes, children, type }: PageLayoutProps) {
    const { layoutProps, locale } = useUIStatic();
    // ... preload links, classnames ...
    return (
        <>
            <Meta />
            <SkipTo pageType={type} />
            <SiteNotice /> {/* local addition */}
            <Header />
            <div className={classes.root}>
                <Global />
                <main>{children}</main>
                <Mask /><MiniCart /><AuthSidebar />
                {!layoutProps?.minimalHeader && <MobileMenu />}
            </div>
            <Footer />
            <ToastContainer />
        </>
    );
}
```

**Symptom-to-fix mapping** (replaces v3-era guidance):

| Symptom | Fix |
|---|---|
| `useMegaMenu must be used within a MegaMenuProvider` | Add `MegaMenuProvider` to `customContextProviders.tsx`. Do NOT add it to `pageLayout.tsx`. |
| `useUIStatic` returns `undefined` / `Cannot read properties of undefined (reading 'generalInformation')` | `_app.tsx` is still on the v3 manual stack — rewrite to use `<ContextProvider>`. |
| `useUserContext` / `useIntl` / `useCart` throws "must be used within Provider" inside an upstream hook even though `<LocaleProvider>` is present | Either (a) `_app.tsx` not yet migrated to `<ContextProvider>`, or (b) `customContextProviders.tsx` not present at the local theme path so the alias resolves to the upstream stub. |
| Local `pageLayout.tsx` still has `<UIStaticProvider>` / `<ManagedUIContext>` / `<Registry>` wrappers | Strip them — they cause double-wrapping (two contexts, the inner one wins, breaking SSR hydration). |

### 16e: Browser verification checklist

After `GET /` returns 200, open `http://localhost:3000` in a browser:

- Homepage renders without console errors
- Navigation / mega menu opens and closes
- Sidebar (cart, auth) opens and closes
- Page transitions work
- Dialog components (search, menu) function correctly
- No SCSS deprecation **errors** (warnings are noisy but expected — silenced via `sassOptions.silenceDeprecations`)
- `next/legacy/image` remnants render without console errors (v2 projects)

The upgrade is complete only when steps 16a, 16b, AND 16e all pass.

## Additional Resources

- For detailed change list, see [v3-to-v4-changes.md](v3-to-v4-changes.md)
- For Yarn 4 migration, ESLint flat config, and Vercel deployment, see [hs-node-yarn-update skill](../hs-node-yarn-update/SKILL.md)
- For patch analysis during upgrade, see [hs-patch-validation skill](../hs-patch-validation/SKILL.md)
- For identifying client fixes to backport to core, see [hs-backport-recommendation skill](../hs-backport-recommendation/SKILL.md) (separate from upgrade)
- For Next.js 16 migration guide, use WebFetch: https://nextjs.org/docs/app/guides/upgrading/version-16
- For React 19 changes: https://react.dev/blog/2024/12/05/react-19
- For Next.js 13→14 changes: https://nextjs.org/blog/next-14
