# Horizon Storefront Upgrade: Complete Change Reference

This document covers all breaking changes for upgrading from **v2+** or **v3** to **v4**.

## Version Timeline

| Version | Era | Next.js | React | Package Scope | Registry |
|---|---|---|---|---|---|
| v1.x | 2022 | 12.x | 17.x | `@experius-commerce/*` | `npm.experius.nl` |
| v2.x | Jul 2023 | 13.x | 18.x | `@experius-commerce/*` → `@happyhorizon/*` | `npm.happyhorizon.dev` |
| v3.x | Late 2023 | 14.2.5 | 18.3.1 | `@happyhorizon/*` | `npm.happyhorizon.dev` |
| v4.x | Current | 16.1.6 | 19.2.0 | `@happyhorizon/*` | `npm.happyhorizon.dev` |

---

## v2-Specific Changes (v2 → v4 only)

These changes **only apply** when upgrading from v2 or older. Skip if already on v3.

### Package Scope Rename (@experius → @happyhorizon)

Projects on versions before v2.0.0 (July 2023) use the legacy `@experius-commerce` scope. These must be renamed before upgrading to v4.

#### Package Name Mapping

| Old Name | New Name |
|---|---|
| `@experius-commerce/core` | `@happyhorizon/commerce-core` |
| `@happyhorizon/commerce-framework-magento` | `@happyhorizon/commerce-framework-magento` |
| `@happyhorizon/commerce-framework-medusa` | `@happyhorizon/commerce-framework-medusa` |
| `@happyhorizon/commerce-framework-bigcommerce` | `@happyhorizon/commerce-framework-bigcommerce` |
| `@experius-commerce/types` | `@happyhorizon/commerce-types` |
| `@experius-commerce/utils` | `@happyhorizon/commerce-utils` |
| `@experius-commerce/swr` | `@happyhorizon/commerce-swr` |
| `@experius-commerce/cypress` | `@happyhorizon/commerce-cypress` |
| `@experius-commerce/router` | `@happyhorizon/commerce-router` |
| `@experius-commerce/storefront-app` | `@happyhorizon/storefront-app` |
| `@experius-commerce/storefront-app-tailwind` | `@happyhorizon/storefront-app-tailwind` |
| `@experius-commerce/cms-framework-storyblok` | `@happyhorizon/cms-framework-storyblok` |
| `@experius-commerce/cms-framework-payloadcms` | `@happyhorizon/cms-framework-payloadcms` |
| `@experius-ui` | `@happyhorizon/ui` |
| `@experius-ui-tailwind` | `@happyhorizon/ui-tailwind` |

Note the structural change: `@experius-commerce/<name>` becomes `@happyhorizon/commerce-<name>` (scope changes AND the sub-scope moves into the package name).

#### Registry URL Change

| Old | New |
|---|---|
| `npm.experius.nl` | `npm.happyhorizon.dev` |
| `@experius-commerce:registry` | `@happyhorizon:registry` |

#### Files Affected

| File | What Changes |
|---|---|
| `package.json` | Dependency names in all sections |
| `.npmrc` | Registry URL and scope |
| `.yarnrc` | Scope registries (`@experius-commerce:registry` → `@happyhorizon:registry`) |
| `tsconfig.json` / `tsconfig.template.json` | Path mappings (`@experius-commerce/*` → `@happyhorizon/*`) |
| `.prettierrc.js` | Import order patterns |
| All `.ts/.tsx/.js/.jsx` | Import statements |
| All `.scss/.css` | `@import` / `@use` statements |
| `next.config.js` | `transpilePackages` array |

#### Import Statement Examples

```diff
-import { getCurrencyCode } from '@experius-commerce/core/context';
+import { getCurrencyCode } from '@happyhorizon/commerce-core/context';

-import { classify } from '@experius-ui/helpers';
+import { classify } from '@happyhorizon/ui/helpers';

-import type { Product } from '@experius-commerce/types';
+import type { Product } from '@happyhorizon/commerce-types';
```

### next/legacy/image → next/image (v2 projects)

v2 projects used `next/legacy/image` with the old `layout` prop API. In v3+, the modern `next/image` API is used.

```diff
-import Image from 'next/legacy/image';
+import Image from 'next/image';

-<Image src="/photo.jpg" layout="fill" objectFit="cover" />
+<Image src="/photo.jpg" fill style={{ objectFit: 'cover' }} />

-<Image src="/photo.jpg" layout="responsive" width={800} height={600} />
+<Image src="/photo.jpg" width={800} height={600} />
```

Key changes:
- `layout="fill"` → `fill` prop (parent needs `position: relative`)
- `layout="responsive|intrinsic|fixed"` → removed (new defaults)
- `objectFit` → `style={{ objectFit: '...' }}`
- `objectPosition` → `style={{ objectPosition: '...' }}`
- `lazyBoundary` / `lazyRoot` → removed

### @apollo/client Removal (early v2)

Some early v2 projects still have `@apollo/client`. This was replaced by `graphql-request` in v1.22.0/v2.0.0.

```diff
-"@apollo/client": "^3.x.x",
+"graphql-request": "^6.0.0",
```

The `codemod-rename-experius.js` script automatically removes `@apollo/client` and adds `graphql-request`.

**Note**: If the project has custom Apollo queries/mutations (commonly found in `src/framework/api/`), these need manual conversion to `graphql-request` patterns. The `@happyhorizon/commerce-*` packages handle this internally, but custom client-side GraphQL calls need updating:

```diff
-import { gql } from '@apollo/client';
+import { gql } from 'graphql-request';

// The gql tag works the same way. The main change is the import source.
// If queries use Apollo-specific features (@client directives, fetchPolicy,
// cache config), those need refactoring to graphql-request or the
// framework's built-in data fetching patterns.
```

### Custom @experius/* Plugin Packages (v2 projects)

Some v2 projects have custom `@experius/ui-*` plugin packages that are NOT part of the core Horizon Storefront packages. Examples:

- `@experius/ui-euvatvalidation`
- `@experius/ui-ordercomment`
- `@experius/ui-ponumber`
- `@experius/ui-postcodenl`

The rename codemod applies a catch-all rename (`@experius/` → `@happyhorizon/`), resulting in names like `@happyhorizon/ui-euvatvalidation`. **After running the codemod, verify these renamed packages actually exist on the `npm.happyhorizon.dev` registry.** If they don't:

1. Check if the package has been published under the new scope
2. If not published, keep the original `@experius/` scope for these packages and add the old registry scope back to `.npmrc`
3. Or publish the packages under `@happyhorizon/` scope

These packages also appear in `transpilePackages` in `next.config.js` and need the same verification.

### patch-package / postinstall-postinstall Removal (v2 projects)

Many v2 projects use `patch-package` for Next.js patches. When upgrading:

1. **Remove stale patch files**: Delete patch files targeting old versions (e.g. `patches/next+13.5.9.patch`) — they are for the old Next.js version and will not apply
2. **Remove from package.json**: The codemod removes `patch-package`, `postinstall-postinstall`, and the `postinstall` script
3. **If legitimate patches remain**: Migrate to Yarn 4's built-in patching: `yarn patch <package>`

### Suspicious Dependencies (v2 projects)

Some v2 projects have `"fs": "*"` in dependencies. This is a Node.js built-in and should not be listed as a dependency. Remove it:

```diff
-"fs": "*",
```

### lint-staged Cleanup (v2 projects)

Older projects have deprecated `"git add"` in `lint-staged` commands. Remove it and add `--no-warn-ignored`:

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

### Storybook Compatibility (v2/v3 projects)

Storybook 7.x is NOT compatible with React 19. Projects using Storybook need to upgrade to 8.x+:

| Package | v2/v3 | v4 |
|---|---|---|
| `@storybook/react` | 7.x | ^8.0.0 |
| `@storybook/nextjs` | 7.x | ^8.0.0 |
| `storybook` | 7.x | ^8.0.0 |
| `@storybook/addon-essentials` | 7.x | ^8.0.0 |
| `@storybook/addon-interactions` | 7.x | ^8.0.0 |
| `@storybook/addon-links` | 7.x | ^8.0.0 |
| `@storybook/blocks` | 7.x | ^8.0.0 |
| `@storybook/testing-library` | 0.2.x | Remove (built into 8.x) |
| `eslint-plugin-storybook` | ^0.6.x | ^0.11.0 |

### next-transpile-modules Removal

v2 projects may use the `next-transpile-modules` package:

```diff
// next.config.js (v2)
-const withTM = require('next-transpile-modules')(['@happyhorizon/ui', ...]);
-module.exports = withTM({ ... });

// next.config.js (v3+) — built-in since Next.js 13.1
+module.exports = {
+    transpilePackages: ['@happyhorizon/ui', ...],
+    ...
+};
```

### @next/font → next/font

v2 projects may use the separate `@next/font` package:

```diff
-import { Inter } from '@next/font/google';
+import { Inter } from 'next/font/google';
```

Built into Next.js since 13.2.

### Yarn 1 → Yarn 4 Migration (v2 projects)

Most v2 projects use Yarn 1.x with an `engines` constraint like `"yarn": ">=1.0.0 <2.0.0"`. The v4 upgrade requires migrating to Yarn 4 (Berry):

| Item | v2 | v4 |
|---|---|---|
| Yarn version | 1.x | 4.12.0 (via Corepack) |
| Config file | `.yarnrc` (INI) | `.yarnrc.yml` (YAML) |
| Package manager field | None | `"packageManager": "yarn@4.12.0+sha..."` |
| Engine constraint | `"yarn": ">=1.0.0 <2.0.0"` | `"yarn": ">=4.0.0"` |
| Auth tokens | `.yarnrc` or `.npmrc` | `.npmrc` only |
| Patching | `patch-package` | `yarn patch` (built-in) |

**Key migration steps:**

1. `corepack enable && yarn set version 4.12.0`
2. Migrate `.yarnrc` → `.yarnrc.yml` (scopes go to `npmScopes`, auth tokens stay in `.npmrc`)
3. Update `engines.yarn` in root and app `package.json` files
4. Remove incompatible install flags (`--ignore-engines`, `--production`)
5. Set `ENABLE_COREPACK=1` in Vercel project settings
6. Delete all `node_modules/` and reinstall

See the **hs-node-yarn-update skill** for complete migration guide.

### vercel.json Changes (v2 projects)

Yarn 4 doesn't support the `--ignore-engines` flag:

```diff
-"installCommand": "cd ../../ && yarn install --ignore-engines",
+"installCommand": "cd ../../ && yarn install",
```

Also: set `ENABLE_COREPACK=1` as a Vercel environment variable (not in `installCommand`). Vercel ignores `corepack enable` inside install commands.

### ESLint Flat Config Migration (v2/v3 projects)

Next.js 16 ships with ESLint 9 which uses flat config format. Projects with `.eslintrc.*` files need migration to `eslint.config.mjs`:

```diff
-// .eslintrc.js (legacy format)
-module.exports = {
-    extends: ["next/core-web-vitals", "prettier"],
-    plugins: ['import'],
-    rules: { ... }
-};

+// eslint.config.mjs (flat format)
+import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
+import prettier from 'eslint-config-prettier';
+
+export default [
+    ...nextCoreWebVitals,
+    prettier,
+    { rules: { ... } },
+];
```

**Common pitfalls:**
- Do NOT register `eslint-plugin-import` explicitly — it's included via `nextCoreWebVitals`
- Only use `FlatCompat` for plugins that don't support flat config (e.g. `eslint-plugin-storybook`)
- Import `eslint-config-next/core-web-vitals` and `eslint-config-prettier` directly

See the **hs-node-yarn-update skill** ESLint Compatibility section for full examples.

### turbo.json Migration (v2 projects using Turborepo)

Turbo 2.x renamed `"pipeline"` to `"tasks"`:

```diff
 {
-    "pipeline": {
+    "tasks": {
         "build": {
             "dependsOn": ["^build"],
             "outputs": ["dist/**", ".next/**"]
         }
     }
 }
```

Also update `turbo` in root `devDependencies` to `^2.0.0`.

### forwardRef Deprecation (React 19)

React 19 deprecates `forwardRef` — ref is now a regular prop. Existing `forwardRef` usage still works but will show deprecation warnings. This is an **optional** migration:

```diff
-import { forwardRef } from 'react';
-
-const Component = forwardRef<HTMLDivElement>(
-    ({ children, ...props }, ref) => (
-        <div ref={ref} {...props}>{children}</div>
-    ),
-);
+const Component = ({ children, ref, ...props }: {
+    children: React.ReactNode;
+    ref?: React.Ref<HTMLDivElement>;
+}) => (
+    <div ref={ref} {...props}>{children}</div>
+);
```

This is NOT a breaking change — prioritize other migration steps first.

---

## v3 → v4 Changes (applies to all upgrades)

### @happyhorizon/* Package API Breaking Changes (v4)

These are module path and API changes within `@happyhorizon/*` v4 packages. Client theme overwrites that import from old paths will break with `Module not found` errors.

#### @happyhorizon/ui Module Path Changes

| Old Path (v3) | New Path (v4) | Notes |
|---|---|---|
| `@happyhorizon/ui/hooks` (barrel) | Individual hook imports | The `hooks/index.ts` barrel file was removed. Import hooks individually (e.g. `@happyhorizon/ui/hooks/useWindowSize`) or create a local barrel file in your theme |
| `@happyhorizon/ui/hooks/useSearchBarWrapper` | `@happyhorizon/ui/hooks/useSearch` | Hook renamed |
| `@happyhorizon/ui/helpers/combineValidators` | `@happyhorizon/ui/helpers/forms/combineValidators` | Moved into `forms/` subdirectory |
| `@happyhorizon/ui/helpers/formValidators` | `@happyhorizon/ui/helpers/forms` | Moved into `forms/` subdirectory |
| `@happyhorizon/ui/helpers/gtag` | Removed | `dispatchGtag` was removed. Create a local no-op stub if theme code imports it |
| `@happyhorizon/ui/helpers` → `trackPageView` | `@happyhorizon/ui/dataLayer` → `trackPageView` | Moved to `dataLayer` module. Re-export from theme barrel for backward compat |
| `@happyhorizon/ui/helpers/forms` → `isRequired` | `@happyhorizon/ui/helpers/forms/validateIsRequired` | Renamed |
| `@happyhorizon/ui/helpers/forms` → `hasLengthAtLeast` | `@happyhorizon/ui/helpers/forms/validateLengthAtLeast` | Renamed |
| `@happyhorizon/ui/helpers/forms` → `hasLengthAtMost` | `@happyhorizon/ui/helpers/forms/validateLengthAtMost` | Renamed |
| `@happyhorizon/ui/helpers/forms` → `validateConfirmPassword` | `@happyhorizon/ui/helpers/forms/validateEqualToField` | Renamed |
| `@happyhorizon/ui/components/authSidebar/components/header` | Removed | `Sidebar` component now accepts `title` and `onBack` props directly instead of a separate `Header` child |

**Fix pattern — local barrel file for hooks:**

Create `src/theme/<themename>/ui/hooks/index.ts` to restore backward compatibility:

```typescript
// Re-export hooks that theme components expect from '@happyhorizon/ui/hooks'
export { useWindowSize } from './useWindowSize'; // local overwrite if exists
export { useEventListener } from '@happyhorizon/ui/hooks/useEventListener';
export { useScrollLock } from '@happyhorizon/ui/hooks/useScrollLock';
// Add other hooks as needed by your theme
```

**Fix pattern — local stub for removed exports:**

Create `src/theme/<themename>/ui/helpers/gtag.ts`:

```typescript
// dispatchGtag was removed in v4 — no-op stub for backward compatibility
export const dispatchGtag = (..._args: unknown[]) => {};
```

And a barrel `src/theme/<themename>/ui/helpers/index.ts`:

```typescript
export { classify } from '@happyhorizon/ui/helpers/classify';
export * from '@happyhorizon/ui/helpers/catalog';
export * from '@happyhorizon/ui/helpers/parseUrl';
export * from '@happyhorizon/ui/helpers/currency';
export * from '@happyhorizon/ui/helpers/locale';
// trackPageView moved to dataLayer in v4
export { trackPageView } from '@happyhorizon/ui/dataLayer';
// dispatchGtag removed in v4 - local no-op stub
export { dispatchGtag } from './gtag';
```

**Important**: `trackPageView` should be imported from `@theme/ui/helpers` (the barrel), NOT from `@theme/ui/helpers/gtag`. The `gtag.ts` file only contains the `dispatchGtag` no-op stub. Files importing both should use separate import lines:

```typescript
import { dispatchGtag } from '@theme/ui/helpers/gtag';
import { trackPageView } from '@theme/ui/helpers';
```

#### @happyhorizon/ui Component API Changes

**Sidebar component**: No longer renders a separate `Header` child. Instead, pass header-related props directly:

```diff
-import Header from '@happyhorizon/ui/components/authSidebar/components/header';
-
-<Sidebar>
-    <Header title="Account" onBack={closeSidebar} />
-    {children}
-</Sidebar>
+<Sidebar title="Account" onBack={closeSidebar} closeSidebar={closeSidebar}>
+    {children}
+</Sidebar>
```

**BaseDialog / HTML `<dialog>` component**: The native `<dialog>` element requires null-safety guards in React:

```typescript
// REQUIRED: Guard against null dialogRef.current on hydration
useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return; // Ref not attached yet

    if (isOpen) {
        if (!dialog.open) { // Prevent InvalidStateError
            isModal ? dialog.showModal() : dialog.show();
        }
    } else {
        if (dialog.open) { // Prevent closing already-closed dialog
            dialog.close();
        }
    }
}, [isOpen, isModal]);
```

#### @happyhorizon/ui Component Prop Changes (v4 Stricter Types)

The `classify` HOC in v4 produces stricter TypeScript types. Many components that previously accepted arbitrary props now have narrower type definitions. This causes widespread type errors in theme overwrites.

**The "spread-as-any" fix pattern:**

```tsx
// BEFORE — fails because 'customProp' is not in the classify-wrapped type
<Component propA={a} customProp={b} />

// AFTER — bypass strict type checking, keep key/ref outside
<Component key={k} {...{ propA: a, customProp: b } as any} />
```

**`className` → `extraClasses` migration:**

Many components replaced `className` with `extraClasses`:

```diff
-<Heading className={classes.title}>Title</Heading>
+<Heading extraClasses={{ root: classes.title }}>Title</Heading>

-<Button classes={classes.button}>Click</Button>
+<Button extraClasses={{ root: classes.button }}>Click</Button>
```

Affected: `Heading`, `EnergyIcon`, `Wysiwyg`, `Row`, `Button`, `Logo`

**New required props added in v4:**

| Component | New Required Props | Typical Values |
|---|---|---|
| `Checkbox` | `name` | Same as `field` value |
| `Logo` | `width`, `height` | Numeric dimensions |
| `AddressAddEditDialog` | `isBusy` | `false` |
| `ProductShell` | `entity`, `reviews`, `compare` | `product`, `false`, `false` |
| `ProductActions` | `reviewCount` | `0` |
| `CheckoutStep` | `activeStep` | From `useCheckout` hook |

**Checkout hook rename:**

```diff
-const { currentStep } = useCheckout();
+const { activeStep } = useCheckout();
```

**Side-effect-only components must return null (React 19):**

```diff
 const MyWidget = ({ slug }) => {
     useEffect(() => { /* side effects */ }, [slug]);
-};
+    return null;
+};
```

**HTML element prop conflicts with ReactNode:**

When spreading restProps onto HTML elements where `title?: ReactNode` conflicts with HTML's `title: string`:

```tsx
// Cast the spread to bypass the type conflict
<aside className={rootClass} {...restProps as any}>
```

**Components commonly requiring spread-as-any** (50+ instances typical):

`Usps` (`customUsps`, `location`), `ProductList` (`showRowTotal`), `Quantity` (`isVisible`, `handleRemoveFromCart`), `SearchBar`/`SearchBarWrapper` (`placeholder`, `showProductsButton`), `Pagination` (`shouldAddPrevNextLinksInHead`, `pageControl`), `CategorySort` (`createProductListLink`), `Dialog` (`shouldDisableAllButtons`, `formProps`), `PaymentMethod` (`submitButton`), `RadioGroup` (`required`), `SubMenu` (`style`, `children`), `ThreeColumnMenu` (`renderItem`, `getId`), `MenuBarItem` (`style`), `MenuDialog` (`isModal`), `BasicToggle` (`title`), `Toolbar` (`pageControl`), `Tile` (`variant_url_key`), `Option` (`onClick`), `ListComponent` (`onClick`), `CartQuantity`, `Product` (`showRowTotal`, `showPrice`), `ProductPageNav` (`description`), `EnergyLabel` (`label` type mismatch), `PriceBlock` (`displayLowestPrice`), `StockMessage` (`real_stock`, `custom_stock_message`), `AddressList` (`title` type), `AuthModal` (`onCancel` void vs object), `Sidebar` (`underlayContent`), `BasePrice` (`price` type), `Rating` (`value` string→number), `ItemSlider` (`titleUrl`, `titleLinkLabel`)

**ItemSlider import resolution:**

When `ItemSlider` has extra props in a theme overwrite, import from the theme path:

```diff
-import { ItemSlider } from '@happyhorizon/ui/components/itemSlider';
+import { ItemSlider } from '@theme/ui/components/itemSlider/itemSlider';
```

#### @happyhorizon/commerce-utils Changes

| Old Export | Status | Fix |
|---|---|---|
| `shouldHandleLocale` from `@happyhorizon/commerce-utils/lib/middleware` | Removed | Implement locally in `src/proxy.ts` |
| `isStaticPage` from `@happyhorizon/commerce-utils/lib/middleware` | Removed | Implement locally in `src/proxy.ts` |

**Local implementation pattern:**

```typescript
// src/proxy.ts
const shouldHandleLocale = (pathname: string) => {
    return !pathname.startsWith('/api/') &&
           !pathname.startsWith('/_next/') &&
           !pathname.includes('.');
};

const isStaticPage = (pathname: string) => {
    const staticPages = ['/cart', '/checkout', '/checkout-success'];
    return staticPages.some(page => pathname.startsWith(page));
};
```

#### @happyhorizon/storefront-app Changes

- Package now contains TypeScript/JSX files that must be transpiled. Add to `transpilePackages` in `next.config.js` or `core.config.js`:

```javascript
transpilePackages: [
    // ... existing entries
    '@happyhorizon/storefront-app',
],
```

#### @happyhorizon/commerce-router Changes

- Package now contains TypeScript/JSX files that must be transpiled:

```javascript
transpilePackages: [
    // ... existing entries
    '@happyhorizon/commerce-router',
],
```

#### UIStaticContext / UIStaticProvider Changes

The `UIStaticProvider` context that provides `layoutProps` (menu items, store config, etc.) may no longer be automatically applied in the package's `PageLayout`. If you get runtime errors like `Cannot read properties of undefined (reading 'generalInformation')`, you need to explicitly wrap your page layout:

```diff
+import { UIStaticProvider } from '@happyhorizon/ui/context/uiStaticContext';
+
 const PageLayout = ({ layoutProps, children }) => {
-    return (
-        <ManagedUIContext layoutProps={layoutProps}>
-            {children}
-        </ManagedUIContext>
-    );
+    const safeLayoutProps = layoutProps || {};
+    return (
+        <UIStaticProvider layoutProps={safeLayoutProps}>
+            <ManagedUIContext layoutProps={safeLayoutProps}>
+                {children}
+            </ManagedUIContext>
+        </UIStaticProvider>
+    );
 };
```

#### Form Validator Renames

v4 renamed form validation helpers in `@happyhorizon/ui/helpers/forms`. Create a compatibility shim:

```typescript
// src/lib/form-validators-compat.ts
import { validateIsRequired } from '@happyhorizon/ui/helpers/forms/validateIsRequired';
import { validateLengthAtLeast } from '@happyhorizon/ui/helpers/forms/validateLengthAtLeast';
import { validateLengthAtMost } from '@happyhorizon/ui/helpers/forms/validateLengthAtMost';
import { validateEqualToField } from '@happyhorizon/ui/helpers/forms/validateEqualToField';

// Backward-compatible aliases
export const isRequired = validateIsRequired;
export const hasLengthAtLeast = validateLengthAtLeast;
export const hasLengthAtMost = validateLengthAtMost;
export const validateConfirmPassword: (...args: any[]) => any = validateEqualToField;
```

**Files commonly affected**: checkout address forms, create account forms, edit profile forms, EU VAT validation.

#### next/config Removal (Next.js 16)

`getConfig()` from `next/config` was removed in Next.js 16. Replace with direct `process.env` access:

```diff
-import getConfig from 'next/config';
-const { serverRuntimeConfig } = getConfig();
-const secret = serverRuntimeConfig.API_SECRET;
+const secret = process.env.API_SECRET;
```

**Files commonly affected**: `src/pages/api/postcodenl.ts`, any API route using server runtime config.

If the broken file is in `node_modules` (e.g., `@happyhorizon/ui-postcodenl`), redirect the import to a theme overwrite that uses `process.env` instead.

#### tsconfig.json Path Mappings for Legacy Packages

When a project has legacy `@experius/*` packages in `transpilePackages` (e.g., `@experius/ui-euvatvalidation`), TypeScript can't resolve their internal `@experius/ui/*` and `@experius-commerce/*` imports. Add path mappings:

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

The webpack aliases already handle these at runtime (in `core.config.js`), but TypeScript needs the path mappings for type checking.

#### Handling Remaining node_modules Type Errors

After all `src/` errors are fixed, the build may still fail on internal type errors in `@happyhorizon/*` packages (e.g., `Settings` type missing `search`, `reviews`, `compare`, `web_app` properties). These are package-internal issues. Add to `next.config.js`:

```javascript
typescript: {
    // All src/ type errors resolved; remaining are package-internal
    ignoreBuildErrors: true,
},
```

**Tip**: To see ALL TypeScript errors at once (instead of Next.js's one-at-a-time behavior), run:

```bash
npx tsc --noEmit --types cypress,node 2>&1 | grep "^src/"
```

This helps batch-fix `src/` errors before moving on to node_modules issues.

#### iron-session Compatibility (v6 → v8)

The `iron-session/next` subpath export was removed in `iron-session` v8 (which comes as a transitive dependency with v4 packages). Create a compatibility shim:

```typescript
// src/lib/iron-session-compat.ts
import { getIronSession } from 'iron-session';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { GetServerSidePropsContext, GetServerSidePropsResult } from 'next';

export function withIronSessionApiRoute(
    handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>,
    options: { cookieName: string; password: string; cookieOptions?: object },
) {
    return async (req: NextApiRequest, res: NextApiResponse) => {
        (req as any).session = await getIronSession(req, res, options);
        return handler(req, res);
    };
}

export function withIronSessionSsr<P extends Record<string, unknown>>(
    handler: (
        context: GetServerSidePropsContext,
    ) => Promise<GetServerSidePropsResult<P>>,
    options: { cookieName: string; password: string; cookieOptions?: object },
) {
    return async (context: GetServerSidePropsContext) => {
        (context.req as any).session = await getIronSession(
            context.req,
            context.res,
            options,
        );
        return handler(context);
    };
}
```

Then update all files that import from `iron-session/next`:

```diff
-import { withIronSessionApiRoute } from 'iron-session/next';
+import { withIronSessionApiRoute } from '@/lib/iron-session-compat';
```

**Files commonly affected**: `src/pages/api/cart.tsx`, `src/pages/api/user.ts`, `src/pages/api/postcodenl.ts`, and any SSR pages using `withIronSessionSsr`.

### Missing Third-Party Dependencies

v4 packages may have dependencies that were previously bundled or transitive but now need explicit installation. Common missing packages:

| Package | Why Needed |
|---|---|
| `sass` | Next.js built-in Sass support requires explicit installation |
| `critters` | Critical CSS extraction (required by `@happyhorizon/commerce-core`) |
| `classnames` | CSS class utility (was transitive, now needs explicit dep) |
| `node-html-parser` | HTML parsing in mappers |
| `request-ip` | IP detection in API routes |
| `react-lazy-hydration` | Deferred hydration for performance |
| `react-glider` | Carousel/slider component |
| `react-zoom-pan-pinch` | Image zoom on product pages |
| `react-slider` | Range slider component (filters) |

Install all at once:

```bash
yarn add sass critters classnames node-html-parser request-ip react-lazy-hydration react-glider react-zoom-pan-pinch react-slider
```

### Dependency Version Changes

| Package | v2 | v3 | v4 |
|---|---|---|---|
| `next` | 12.x–13.x | 14.2.5 | 16.1.6 |
| `react` | 17.x–18.x | 18.3.1 | ^19.2.0 |
| `react-dom` | 17.x–18.x | 18.3.1 | ^19.2.0 |
| `@next/bundle-analyzer` | — | 14.2.5 | 16.1.6 |
| `@next/third-parties` | — | 14.2.5 | 16.1.6 |
| `eslint-config-next` | — | 14.2.5 | 16.1.6 |
| `@types/react` | — | 18.3.3 | ^19.0.0 |
| `@types/react-dom` | — | 18.3.0 | ^19.0.0 |
| `@types/node` | — | 20.14.12 | ^24.0.0 |
| `@happyhorizon/*` | 1.x–2.x | 3.x.x | ^4.0.0-beta.1+ |

### 1. Middleware → Proxy Rename

**Files affected**: `src/middleware.ts` in all apps

```diff
// Filename: middleware.ts → proxy.ts
-export function middleware(request: NextRequest) {
+export function proxy(request: NextRequest) {
```

The `config` export with `matcher` stays the same.

### 2. JSX.Element → React.ReactElement

**Files affected**: Any file using `JSX.Element` type

React 19 removes the global `JSX` namespace. All `JSX.Element` references must become `React.ReactElement`.

```diff
+import React from 'react';
// or
+import type React from 'react';

-afterCartActions?: JSX.Element;
+afterCartActions?: React.ReactElement;

-type ParsedElement = JSX.Element | object | void | undefined | null | false;
+type ParsedElement = React.ReactElement | object | void | undefined | null | false;

-(props: SVGProps<SVGSVGElement>): JSX.Element;
+(props: SVGProps<SVGSVGElement>): React.ReactElement;

-render: (children: React.ReactNode) => JSX.Element;
+render: (children: React.ReactNode) => React.ReactElement;
```

### 3. useRef Requires Initial Value

**Files affected**: Any file using `useRef()` without arguments

```diff
-const adyenCheckoutRef = useRef();
-const adyenDialogRef = useRef();
+const adyenCheckoutRef = useRef<HTMLDivElement | null>(null);
+const adyenDialogRef = useRef<HTMLDivElement | null>(null);
```

### 4. forwardRef Destructuring Pattern

**Files affected**: `classify.tsx` helpers and any custom classify usage

React 19's stricter typing requires moving destructuring inside the function body:

```diff
 const WrappedComponent = forwardRef<Ref, WithClassesProps<P, Classes>>(
-    (
+    (props, ref) => {
         // Extract extraClasses and classes from the component props
-        { extraClasses, classes, ...rest },
-        ref,
-    ) => {
+        const { extraClasses, classes, ...rest } = props as WithClassesProps<P, Classes>;
```

Also, `WithClassesProps` type must omit `extraClasses`:

```diff
-type WithClassesProps<P, Classes> = Omit<P, 'classes'> & {
+type WithClassesProps<P, Classes> = Omit<P, 'classes' | 'extraClasses'> & {
```

### 5. Build Command Change

```diff
-"build": "next build",
+"build": "next build --webpack",
```

### 6. Icon Type Import Change

```diff
-import type { FC, SVGProps } from 'react';
+import type React, { FC, SVGProps } from 'react';
```

## Next.js Config Changes (core.config.js)

### Removed Options

| Option | Reason |
|---|---|
| `eslint.dirs` | Auto-detected in Next.js 16 |
| `swcMinify: true` | Default in Next.js 16 |
| `experimental.cssChunking: 'loose'` | Stable in Next.js 16 |
| `experimental.esmExternals: 'loose'` | Default in Next.js 16 |
| `serverRuntimeConfig` | Deprecated; merge into `env` |

### Renamed/Moved Options

| v3 Location | v4 Location |
|---|---|
| `experimental.bundlePagesExternals: true` | `bundlePagesRouterDependencies: true` (top level) |
| `experimental.middlewarePrefetch: 'flexible'` | `experimental.proxyPrefetch: 'flexible'` |

**Important for client projects**: If the project's custom `next.config.js` spreads `coreConfig.experimental` and then adds `middlewarePrefetch: 'flexible'`, this override must be renamed to `proxyPrefetch: 'flexible'`. This is easy to miss because it's in the client config, not in `core.config.js`.

### Added Options

| Option | Value | Purpose |
|---|---|---|
| `turbopack` | `{}` | Enables Turbopack support |

### MEDIA_URL Safety

```diff
-...process.env.MEDIA_URL.split(',').map((hostname) => ({
+...(process.env.MEDIA_URL || '')
+    .split(',')
+    .filter(Boolean)
+    .map((hostname) => ({
```

## SCSS Breaking Changes

### Division Operator → Multiplication

Sass deprecated `/` for division. Use `*0.5` instead of `/ 2`:

```diff
-width: ($ui-container-max-width-large / 2) - 3.5rem;
+width: ($ui-container-max-width-large * 0.5) - 3.5rem;
```

For calc() with interpolation, add spaces around `/`:

```diff
-$ui-layout-2col-75-width: calc(75% - #{$ui-layout-gap} / (2/1)) !default;
+$ui-layout-2col-75-width: calc(75% - #{$ui-layout-gap} / (2 / 1)) !default;
```

### Missing Semicolons After @content

```diff
 @mixin screen($breakpoint-min, $breakpoint-max) {
     @media (min-width: $breakpoint-min) and (max-width: $breakpoint-max) {
-        @content
+        @content;
     }
 }
```

Affected mixins: `screen`, `min-screen`, `max-screen`, `hover`

### Property Ordering

Properties must come before nested rules/media queries:

```diff
 .image {
     display: block;
     height: auto;
+    margin: 0 auto;
     opacity: 1;
     @media (min-width: $ui-breakpoint-lg) {
         width: 50%;
     }
-    margin: 0 auto;
 }
```

## CSS/SCSS Formatting Changes

### Leading Zeros

```diff
-$ui-font-size-s: .75rem !default;
+$ui-font-size-s: 0.75rem !default;
```

All bare decimal values (`.75`, `.875`, `.5`, `.0625`) should have a leading zero.

### Quote Consistency

Use single quotes consistently:

```diff
-.CollapsibleContent[data-state="open"] {
+.CollapsibleContent[data-state='open'] {
```

### Multi-line Value Formatting

Long values should be formatted across multiple lines:

```diff
-$ui-box-shadow: 0 .0625rem .1875rem rgba(0, 0, 0, 0.09), 0 .0625rem .125rem rgb(248, 248, 248) !default;
+$ui-box-shadow:
+    0 0.0625rem 0.1875rem rgba(0, 0, 0, 0.09),
+    0 0.0625rem 0.125rem rgb(248, 248, 248) !default;
```

## Files Commonly Affected in Client Projects

| File | Changes Needed |
|---|---|
| `package.json` | Dependency versions, build script, remove legacy deps, remove `patch-package`/`postinstall-postinstall`/`"fs": "*"`, update `lint-staged`, update Storybook, update `engines.yarn` |
| `.npmrc` | Registry URL and scope (v2 only) |
| `.yarnrc` | Scope registries (v2 only); then delete during Yarn 4 migration |
| `.yarnrc.yml` | Add `npmScopes` config during Yarn 4 migration |
| `patches/` | Delete stale Next.js patch files |
| `vercel.json` | Remove `--ignore-engines` from `installCommand` |
| `.eslintrc.*` | Migrate to `eslint.config.mjs` flat config |
| `turbo.json` | Rename `"pipeline"` → `"tasks"` (Turbo 2.x) |
| `src/middleware.ts` | Rename to `proxy.ts`, rename export |
| `src/framework/api/` | Migrate custom `@apollo/client` queries to `graphql-request` (v2) |
| `src/theme/*/styles/variables.scss` | Quote style, blank lines |
| `src/theme/*/styles/globals.css` | Trailing newline, blank lines |
| `next.config.js` | Remove `next-transpile-modules` (v2), rename `middlewarePrefetch` → `proxyPrefetch`, config options |
| Any `.tsx` with `JSX.Element` | Replace with `React.ReactElement` |
| Any `.tsx` with `useRef()` | Add `null` initial value |
| Any `.tsx` with `forwardRef` | Optional: migrate to ref-as-prop pattern |
| Any `.tsx` with `next/legacy/image` | Migrate to `next/image` (v2) |
| Any `.scss` with `/` division | Replace with `*0.5` or `math.div()` |
| Any `.scss` with `@content` without `;` | Add semicolons |

---

## Client App Alignment (apps/* → v4 Boilerplate)

When upgrading a client project, the client app directory (e.g. `apps/vekto/`) must be aligned with the v4 version of the boilerplate app (`apps/magento`). This section covers ALL categories of changes needed, in the order they should be applied.

**Scope**: This affects files in `src/framework/`, `src/pages/`, `src/swr/`, `src/theme/`, `core.config.js`, `next.config.js`, and `package.json`. A typical v2 client app has **300+ files** that need import path updates.

### Category 1: Package Scope Rename in App Files (v2 only)

The rename codemod (Step 1) handles source files, but verify ALL files in the app directory are updated. This is the **bulk of changes** (~90% of modified files).

**Import rename patterns:**

| Old Import | New Import |
|---|---|
| `@experius-commerce/core/*` | `@happyhorizon/commerce-core/*` |
| `@experius-commerce/types/*` | `@happyhorizon/commerce-types/*` |
| `@experius-commerce/utils/*` | `@happyhorizon/commerce-utils/*` |
| `@experius-commerce/swr/*` | `@happyhorizon/commerce-swr/*` |
| `@experius-commerce/framework/*` | `@happyhorizon/commerce-framework/*` |
| `@experius-commerce/framework-magento/*` | `@happyhorizon/commerce-framework-magento/*` |
| `@experius/ui/*` | `@happyhorizon/ui/*` |

**Files affected by category:**

| Directory | File Count (typical) | Primary Changes |
|---|---|---|
| `src/framework/api/` | 40–60 files | All `@experius-commerce/*` imports |
| `src/framework/graphql/` | 2–5 files | `@experius-commerce/core`, `types`, `framework`, `utils` |
| `src/framework/mappers/` | 10–15 files | `@experius-commerce/core`, `types`, `framework` |
| `src/pages/` | 20–30 files | `@experius/ui/*`, `@experius-commerce/*` |
| `src/swr/` | 2–5 files | `@experius-commerce/types`, `@experius/ui/*`, `@experius-commerce/swr` |
| `src/theme/*/ui/` | 100–200+ files | `@experius/ui/*`, `@experius-commerce/*` |
| `src/theme/*/ui/context/` | 1–3 files | `@experius-commerce/core`, `@experius-commerce/types` |
| `src/theme/*/ui/types/` | 2–5 files | `declare module '@experius-commerce/types/*'` |

**Type augmentation modules** in `src/theme/*/ui/types/extends.d.ts` require special attention — `declare module` strings must match the new package names exactly:

```diff
-declare module '@experius-commerce/types/commerce' {
+declare module '@happyhorizon/commerce-types/commerce' {
     interface CommerceConfig {
         betaEmailAddresses: string[];
     }
 }
```

### Category 2: core.config.js Alignment

The client's `core.config.js` contains webpack alias configuration that references package names. All aliases must be updated:

```diff
 // Alias plugin references
-let provider = '@experius-commerce/framework-' + process.env.FRAMEWORK;
+let provider = '@happyhorizon/commerce-framework-' + process.env.FRAMEWORK;

 // UI package resolution
-path.dirname(require.resolve('@experius/ui/package.json'))
+path.dirname(require.resolve('@happyhorizon/ui/package.json'))

 // Alias definitions
-{name: '@experius-commerce/framework', alias: providerAlias},
-{name: '@experius/ui', alias: overrideComponentsAlias},
-{name: '@experius-commerce/swr', alias: [...]},
+{name: '@happyhorizon/commerce-framework', alias: providerAlias},
+{name: '@happyhorizon/ui', alias: overrideComponentsAlias},
+{name: '@happyhorizon/commerce-swr', alias: [...]},

 // SWR package resolution
-path.dirname(require.resolve('@experius-commerce/swr/package.json')),
+path.dirname(require.resolve('@happyhorizon/commerce-swr/package.json')),
```

**Also update in `core.config.js`:**

```diff
 // transpilePackages
-'@experius/ui',
+'@happyhorizon/ui',
+'@happyhorizon/storefront-app',
+'@happyhorizon/commerce-router',
 provider,
-'@experius-commerce/types',
-'@experius-commerce/swr',
-'@experius-commerce/core',
-'@experius-commerce/utils',
+'@happyhorizon/commerce-types',
+'@happyhorizon/commerce-swr',
+'@happyhorizon/commerce-core',
+'@happyhorizon/commerce-utils',

 // images.domains → images.remotePatterns
-images: {
-    domains: process.env.MEDIA_URL.split(','),
+images: {
+    remotePatterns: process.env.MEDIA_URL.split(',').map((domain) => ({
+        protocol: 'https',
+        hostname: domain.trim(),
+    })),

 // sassOptions — add silenceDeprecations
 sassOptions: {
     includePaths: [...],
     prependData: `...`,
+    silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'mixed-decls'],
 },

 // Remove eslint.dirs, swcMinify
-eslint: { dirs: ['src', 'config'] },
-swcMinify: true,

 // Remove serverRuntimeConfig — merge into env
-serverRuntimeConfig: {
-    REDIS_HOST: process.env.REDIS_HOST,
-    REDIS_PORT: process.env.REDIS_PORT,
-    CI: process.env.CI,
-},
+// Use process.env directly on server side

 // env values MUST be strings in Next.js 16
-CACHE_DEBUG: process.env.CACHE_DEBUG || false,
-KLARNA_ENABLED: process.env.KLARNA_ENABLED ? process.env.KLARNA_ENABLED === "true" : false,
-ROOT_CATEGORY: process.env.ROOT_CATEGORY || 2
+CACHE_DEBUG: process.env.CACHE_DEBUG || 'false',
+KLARNA_ENABLED: process.env.KLARNA_ENABLED === "true" ? 'true' : 'false',
+ROOT_CATEGORY: process.env.ROOT_CATEGORY || '2'

 // Remove deprecated experimental options
-experimental: {
-    esmExternals: 'loose',
-    isrMemoryCacheSize: 0,
-    middlewarePrefetch: 'strict'
-},
+experimental: {
+    // esmExternals is default in Next.js 16
+    // isrMemoryCacheSize removed
+},

 // Object env values must be JSON.stringify'd
-STORES: { nl: { ... }, fr: { ... } },
+STORES: JSON.stringify({ nl: { ... }, fr: { ... } }),
```

### Category 3: next.config.js Client Overrides

The client's `next.config.js` that extends `coreConfig` needs:

```diff
 experimental: {
     ...coreConfig.experimental,
-    middlewarePrefetch: 'flexible',
+    proxyPrefetch: 'flexible',
 },

 // Redirect/rewrite patterns — path-to-regexp v8 requires / prefix
-source: '/multisafepay/connect/cancel:path*',
-destination: '/checkout:path*?type=cancelPayment',
+source: '/multisafepay/connect/cancel/:path*',
+destination: '/checkout/:path*?type=cancelPayment',
```

### Category 4: package.json Alignment

**Dependencies to add:**

```json
{
    "@happyhorizon/commerce-core": "^4.0.0-canary.3",
    "@happyhorizon/commerce-cypress": "^4.0.0-canary.3",
    "@happyhorizon/commerce-framework-magento": "^4.0.0-canary.3",
    "@happyhorizon/commerce-router": "4.0.0-canary.3",
    "@happyhorizon/commerce-swr": "4.0.0-canary.3",
    "@happyhorizon/storefront-app": "4.0.0-canary.3",
    "@happyhorizon/ui": "^4.0.0-canary.3",
    "classnames": "^2.5.1",
    "critters": "^0.0.25",
    "graphql-request": "^7.0.0",
    "next": "16.1.6",
    "next-pwa": "^5.6.0",
    "node-html-parser": "^7.0.2",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "react-glider": "^5.0.0",
    "react-lazy-hydration": "^0.1.0",
    "react-slider": "^2.0.6",
    "react-zoom-pan-pinch": "^3.7.0",
    "request-ip": "^3.3.0",
    "sass": "^1.97.3"
}
```

**Dependencies to remove:**

```json
{
    "fs": "*",
    "patch-package": "...",
    "postinstall-postinstall": "..."
}
```

**DevDependencies to update:**

```json
{
    "@next/bundle-analyzer": "16.1.6",
    "@next/third-parties": "16.1.6",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "eslint": "^9.18.0",
    "eslint-config-next": "16.1.6",
    "eslint-config-prettier": "^10.0.1",
    "@storybook/*": "8.5.3",
    "storybook": "8.5.3"
}
```

**Scripts to update:**

```diff
-"dev": "next dev",
-"build": "next build",
+"dev": "next dev --webpack",
+"build": "next build --webpack",
```

**lint-staged to update:**

```diff
-"*.{js,jsx,ts,tsx}": ["yarn lint", "yarn prettier:fix", "git add"]
+"*.{js,jsx,ts,tsx}": ["yarn lint --no-warn-ignored --", "yarn prettier:fix --"]
```

**Add engines:**

```json
"engines": {
    "node": ">=22.0.0"
}
```

### Category 5: _app.tsx Changes

The main `_app.tsx` needs an explicit `layoutProps` default to prevent runtime errors:

```diff
 <PageLayout
     {...props}
     {...pageProps}
+    layoutProps={pageProps.layoutProps || {}}
     locale={locale}
     currencyCode={pageProps.currencyCode}
 >
```

### Category 6: Sidebar / Header Component API Changes

All components using `Sidebar` with a `header` prop containing a `Header` child component must be refactored. The `Header` component was removed; `Sidebar` now accepts these props directly:

| New Prop | Type | Description |
|---|---|---|
| `closeSidebar` | `() => void` | Close callback (was on Header) |
| `title` | `string \| ReactNode` | Header title (was on Header) |
| `onBack` | `() => void` | Back button callback (was on Header) |
| `goBackLabel` | `string` | Accessibility label for back button |
| `showBackButton` | `boolean` | Whether to show the back button |

**`useUI()` context change:**

```diff
-const { setSidebarView } = useUI();
+const { handleSidebarViewChange } = useUI();
```

**Files commonly affected:**
- `src/theme/*/ui/components/authSidebar/authSidebar.tsx`
- `src/theme/*/ui/components/miniCart/miniCart.tsx`

### Category 6b: `_error.tsx` Alignment (do NOT create `404.tsx` / `500.tsx`)

HS projects always handle 404 and 5xx through a **single Pages Router file**: `src/pages/_error.tsx`. Next.js 16 may warn about a missing `404.tsx`, but the canonical HS pattern is to keep `_error.tsx` and ignore that warning — adding `404.tsx`/`500.tsx` causes route conflicts with `_error.tsx`'s fallthrough behavior and double-implements layout chrome.

**Key shape of the v4 file:**

1. The page body is just `<ErrorView />` — **no local `<PageLayout>` wrapper**. The layout chrome (header, footer, providers) comes from `_app.tsx` / `pageLayout.tsx` and is driven by `layoutProps` returned from `getInitialProps`. Wrapping with `<PageLayout>` here double-renders the chrome and (in v4) won't even type-check because upstream `PageLayout` reads `layoutProps` from `useUIStatic()` rather than accepting it as a prop.
2. `getInitialProps` is **async** and must:
    - Compute `statusCode` from `res?.statusCode ?? err?.statusCode ?? 404`.
    - Short-circuit (return only `{ statusCode }`) when `context.query.slug` includes `'_next'` — these are framework asset misses and shouldn't trigger a layout-data fetch.
    - Derive `storeCode` from `getStoreCodeByLocale(context.locale)` and put it on `context` (the layout helpers read it from there).
    - Derive `currencyCode` from `context.query.currency || getCurrencyCode(context.locale)`.
    - Spread `await getLayoutStaticProps(context)` last so the layout has the same data it gets on every other page.

**Canonical v4 `_error.tsx`:**

```tsx
import {
    getCurrencyCode,
    getStoreByCode,
    getStoreCodeByLocale,
} from '@happyhorizon/commerce-core/context';
import { getLayoutStaticProps } from '@happyhorizon/commerce-framework/api/layoutStaticProps';
import { ErrorView } from '@happyhorizon/ui/components/errorView';

function Error() {
    return <ErrorView />;
}
Error.getInitialProps = async ({ res, err, ...context }) => {
    const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
    if (context?.query?.slug?.includes('_next')) {
        return {
            statusCode,
        };
    }
    const storeCode = getStoreCodeByLocale(context.locale);
    context.storeCode = storeCode;
    return {
        statusCode,
        storeCode,
        currencyCode:
            context?.query?.currency || getCurrencyCode(context.locale),
        locale: context.locale,
        ...(await getLayoutStaticProps(context)),
    };
};

export default Error;
```

**Things to remove during alignment:**

- Stale `// @TODO: ... (hs 4.0)` placeholders left over from v2.
- A local `<PageLayout>` wrapper around `<ErrorView />` (any form — with or without `layoutProps={...}`). The layout already wraps every page via `_app.tsx`.
- A synchronous, status-code-only `getInitialProps`. The async version above is what the layout needs to render correctly on the error route.
- Any sibling `src/pages/404.tsx` or `src/pages/500.tsx` files created by older upgrade runs — delete them; they conflict with `_error.tsx`.

### Category 6c: v4 Architecture Inversion — `<ContextProvider>` + `customContextProviders` + dumb `pageLayout.tsx`

> **The single biggest architectural change in v4.** v3 stuffed every provider into the local theme `pageLayout.tsx` and `_app.tsx` only rendered `<LocaleProvider><SWRConfig><PageLayout>`. v4 inverts this — a single `<ContextProvider>` from `@happyhorizon/ui/context/contextProvider` owns the entire provider chain at the `_app.tsx` level, and `pageLayout.tsx` is a pure presentation component. **Skipping this rewrite is the #1 cause of post-upgrade `useXxx must be used within a XxxProvider` errors** even after `yarn build` exits 0 — the build never instantiates the providers, so the mismatch only surfaces on first dev-server hydration.

**Three files must change in lockstep.** Doing only one or two creates double-wrapped contexts (two instances of the same provider, the inner one wins, SSR/CSR mismatch) or missing providers — both fail at runtime.

#### Part 1 — `apps/<app>/src/pages/_app.tsx`: replace v3 manual stack with `<ContextProvider>`

```tsx
import React from 'react';
React.useLayoutEffect = React.useEffect; // v4 informed-form workaround

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

`<ContextProvider>` automatically applies the **upstream-defined standard chain** from `node_modules/@happyhorizon/ui/context/contextProvider.tsx`:

```
StaticUIContext (was UIStaticProvider in v3)
  ManagedUIContext
    CmsProvider
      LocaleProvider
        CompareListProvider                     ← resolved via alias to local override if present
          SWRConfig
            ...customContextProviders           ← project-specific (Part 2)
              {children}
```

Each provider receives only the `pageProps` keys whitelisted in its `props` array — see `node_modules/@happyhorizon/ui/context/contextProvider.tsx` for the canonical list. `value={{ fetcher }}` is forwarded to `SWRConfig` (whitelisted as `props: ['value']`).

Remove from `_app.tsx`:

- `<LocaleProvider>` (now in chain)
- `<SWRConfig>` (now in chain — pass `value={{ fetcher }}` to `<ContextProvider>` instead)
- Manual `<UIStaticProvider>` / `<ManagedUIContext>` wrappers (now in chain)

#### Part 2 — `apps/<app>/src/theme/<theme>/ui/context/customContextProviders.tsx`: register project-specific providers

The HS commerce-core theme alias plugin resolves `@happyhorizon/ui/context/customContextProviders` to this local file at build time, overriding the upstream empty stub. **Anything not in the standard chain belongs here.** For most projects, that means `MegaMenuProvider` (v4-new — required by upstream `<Header>` which calls `useMegaMenu()`) and `ManagedMyStoreContext` (project-local).

```tsx
import type { ContextProviderInterface } from '@happyhorizon/ui/context/contextProvider';

import { MegaMenuProvider } from '@happyhorizon/ui/context/megaMenuProvider';
import { ManagedMyStoreContext } from '@theme/context/myStore';

export const customContextProviders: ContextProviderInterface[] = [
    { Provider: ManagedMyStoreContext, props: [] },
    { Provider: MegaMenuProvider, props: [] },
];
```

`props` semantics (see `ContextProviderInterface`):

| Form | Meaning |
|---|---|
| `props: ['foo', 'bar']` | Forward only `pageProps.foo` and `pageProps.bar` to the provider |
| `props: []` | Forward nothing |
| omit `props` | Forward all `pageProps` |

Order matters — providers earlier in the array are wrapped further OUT (the array is folded right-to-left into a tree).

#### Part 3 — `apps/<app>/src/theme/<theme>/ui/components/pageLayout/pageLayout.tsx`: strip ALL providers

The local override should mirror the upstream presentation file at `node_modules/@happyhorizon/ui/components/pageLayout/pageLayout.tsx` — read context with `useUIStatic()`, render the chrome (`<Meta>`, `<SkipTo>`, `<Header>`, `<Global>`, `<MiniCart>`, `<AuthSidebar>`, `<MobileMenu>`, `<Footer>`, `<ToastContainer>`). Add **only** project-specific UI such as `<SiteNotice />`. **Never** re-add `<UIStaticProvider>`, `<ManagedUIContext>`, `<MegaMenuProvider>`, `<Registry>`, `<LocaleProvider>`, etc. — they are already in the tree above.

Reference shape (matches upstream + boxxer-style local additions):

```tsx
import { useUIStatic } from '@happyhorizon/ui/context/uiStatic';
import { commerceConfig, themeConfig } from '@happyhorizon/commerce-core/context';
// ...component imports...
import { SiteNotice } from '@theme/components/siteNotice'; // local addition

function PageLayoutComponent({ classes, children, type }) {
    const { layoutProps, locale } = useUIStatic();
    const contentClass = layoutProps?.minimalHeader
        ? classes.contentMinimalHeader
        : classes.content;

    return (
        <>
            {/* preload links, e.g. /api/cart, /api/user */}
            <Meta />
            <SkipTo pageType={type} />
            <SiteNotice />
            <Header />
            <div className={classes.root}>
                <Global />
                <main className={contentClass}>{children}</main>
                <Mask /><MiniCart /><AuthSidebar />
                {!layoutProps?.minimalHeader && <MobileMenu />}
            </div>
            <Footer />
            <ToastContainer />
            {themeConfig?.cookieNotification?.enabled && <CookieNotification locale={locale} />}
        </>
    );
}

export default classify(defaultClasses)(PageLayoutComponent);
```

#### Symptom-to-root-cause matrix (applies after Part 1+2+3 are done)

| Symptom | Root cause |
|---|---|
| `useMegaMenu must be used within a MegaMenuProvider` | Missing entry in local `customContextProviders.tsx` (Part 2). Do NOT add provider to `pageLayout.tsx`. |
| `useUIStatic` returns `undefined` / "Cannot read properties of undefined (reading 'generalInformation')" | `_app.tsx` still on v3 stack — Part 1 not applied. |
| `[React Intl] Could not find required intl object` thrown from inside `useUserContext` / `useCart` (despite Part 1 done) | Either (a) `customContextProviders.tsx` missing at the local theme path so the alias falls back to the upstream stub and Part 1's `LocaleProvider` registers against a deduplicated `IntlContext` — see Category 6d for the related `react-intl` dedupe; or (b) two copies of `react-intl` installed. |
| Local `pageLayout.tsx` contains `<UIStaticProvider>` / `<ManagedUIContext>` / `<MegaMenuProvider>` / `<Registry>` wrappers and the homepage hangs / shows a hydration mismatch warning | Double-wrapping — Part 3 not applied. The inner duplicate context wins on hydration but loses on subsequent renders, producing erratic state. |
| `useMyStore must be used within a MyStoreProvider` (or other project-specific hook) | Missing entry in `customContextProviders.tsx` for the project-specific provider (`ManagedMyStoreContext`). |

### Category 6d: `react-intl` deduplication

`@happyhorizon/commerce-swr` pins `react-intl` to an exact version (e.g. `6.6.8`). Other transitive deps — most notably the legacy `@experius/ui-postcodenl@2.x` chain that pulls `@experius/ui@3.1.2` — pin a different exact version (e.g. `6.4.7`). Yarn 4 honors exact pins, so two copies of `react-intl` end up installed, each with its own `IntlContext`. `<LocaleProvider>` (which renders `<IntlProvider>`) registers against ONE of them; upstream hooks like `useUserContext`, `useCart`, etc. that internally call `useIntl()` from the OTHER copy throw `[React Intl] Could not find required intl object`.

**Fix:** add a `react-intl` resolution to the root `package.json`, pinned to whatever version `@happyhorizon/commerce-swr` declares:

```json
{
    "resolutions": {
        "react-intl": "6.6.8"
    }
}
```

Then `yarn install` and verify with:

```bash
find node_modules -name react-intl -type d
```

Only one path should be returned. If two paths still exist, locate the offending peer constraint (`yarn why react-intl`) and either upgrade the dependency or add a more aggressive resolution (`"react-intl@*": "6.6.8"`).

This dedup step belongs in **Phase 4b (Infrastructure Migration)** alongside the other resolution updates — adding it before the dev-server smoke test in Phase 5b prevents the most common v4 runtime regression.

### Category 6e: PWA manifest filename includes theme name

v4 `<Meta>` (in `@happyhorizon/ui/components/meta.tsx`) renders:

```tsx
<link rel="manifest" href={`/manifest.${process.env.THEME}.json`} />
```

So the file in `apps/<app>/public/` must be named `manifest.<theme>.json`, where `<theme>` is the active theme name from `apps/<app>/config/theme.config.json` (the top-level key, e.g. `base`, `vekto`, `xxlnutrition`). The plain `manifest.json` filename is a v2/v3 holdover that produces a 404 in v4 (the browser silently ignores PWA install hints — the build, compilation, and page render all stay green, so this is easy to miss).

**Migration:**

1. Open `apps/<app>/config/theme.config.json` and read the top-level theme key — typically `"base"` (the first object key).
2. `git mv apps/<app>/public/manifest.json apps/<app>/public/manifest.<theme>.json`
3. If the project supports multiple themes (parent chain in `theme.config.json`), create one manifest per theme — the path resolves at runtime via `process.env.THEME`.
4. Verify during the dev-server smoke test (Phase 5b): a request for `/manifest.<theme>.json` should return 200 in the dev log.

### Category 6f: iron-session v8 cookie name sanitization (`sessionOptions` shadow)

**Symptom:** `GET /api/cart 500` and `GET /api/user 500` (and any SSR page using `withIronSessionSsr`) throw at runtime:

```
TypeError: argument name is invalid
    at async cartHandler (src/pages/api/cart.tsx:N:5)
        ^ at await req.session.save();
```

**Root cause:** iron-session v8 strictly validates cookie names against the RFC 6265 `cookie-name` token grammar (only `[A-Za-z0-9!#$%&'*+\-.^_`|~]` allowed). The upstream `@happyhorizon/commerce-utils/lib/with-session.ts` sets:

```ts
cookieName: `horizon-${process.env.PACKAGE_NAME}`
```

After the v4 rename, `PACKAGE_NAME` is a scoped npm package name like `@happyhorizon/<app>-app`. The `@` and `/` characters are **not** in the cookie-name token set, so iron-session throws `TypeError: argument name is invalid` on every `req.session.save()` (and also on the initial `getIronSession` decode for some legacy cookies).

This is invisible during `yarn build` — the build never executes the API route handler — and only surfaces on the first dev-server request to a session-backed route.

**Migration (two parts — both required):**

#### Part 1 — Update `.env.local` to the new package name

The codemod renames `apps/<app>/package.json` `name` from `@experius-commerce/magento-app` → `@happyhorizon/<app>-app` but does **not** touch `.env.local`. Update both files manually so `PACKAGE_NAME` matches the new package name (this also keeps `next.config`'s `transpilePackages` and `core.config`'s `env` mappings consistent):

```diff
# apps/<app>/.env.local AND apps/<app>/.env.local.example
-PACKAGE_NAME="@experius-commerce/magento-app"
+PACKAGE_NAME="@happyhorizon/<app>-app"
```

#### Part 2 — Shadow the upstream `sessionOptions` locally

Even after Part 1, the cookie name `horizon-@happyhorizon/<app>-app` is still RFC 6265 invalid. The upstream file lives in `node_modules` and cannot be edited. Create a local override that sanitizes the cookie name:

```ts
// apps/<app>/src/lib/sessionOptions.ts
import type { SessionOptions } from 'iron-session';
import type { User } from '@happyhorizon/commerce-types';

const safePackageName = (process.env.PACKAGE_NAME || 'app').replace(
    /[^A-Za-z0-9!#$%&'*+\-.^_`|~]/g,
    '-',
);

declare module 'next' {
    interface NextApiRequest {
        session: {
            readonly save: () => Promise<void>;
            readonly destroy: () => void;
            readonly updateConfig: (newSessionOptions: SessionOptions) => void;
            cartId?: string;
            auth: User;
        };
    }
}

declare module 'iron-session' {
    interface IronSessionData {
        auth: User;
        cartId?: string;
    }
}

export const sessionOptions: SessionOptions = {
    password: process.env.SECRET_COOKIE_PASSWORD as string,
    cookieName: `horizon-${safePackageName}`,
    cookieOptions: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: process.env.NODE_ENV === 'production',
        maxAge: 604800 - 60,
    },
};
```

Then rewire **all** importers from the upstream module to the local one:

```diff
-import { sessionOptions } from '@happyhorizon/commerce-utils/lib/with-session';
+import { sessionOptions } from '@/lib/sessionOptions';
```

Files that typically need updating (7–9 per app):

- `apps/<app>/src/pages/api/cart.tsx`
- `apps/<app>/src/pages/api/user.ts`
- `apps/<app>/src/pages/checkout.tsx`
- `apps/<app>/src/pages/customer/account/address.tsx`
- `apps/<app>/src/pages/customer/account/edit.tsx`
- `apps/<app>/src/pages/customer/account/orders/[[...slug]].tsx`
- `apps/<app>/src/pages/customer/account/wishlist.tsx`
- `apps/<app>/src/pages/[[...slug]].tsx` (if not commented out)
- Any theme overwrite that imports `withIronSessionSsr` / `withIronSessionApiRoute` (e.g. `theme/<theme>/ui-postcodenl/pages/api/postcodenl.ts`)

Bulk-replace command:

```bash
grep -rl "from '@happyhorizon/commerce-utils/lib/with-session'" apps/<app>/src \
  | xargs sed -i '' "s|from '@happyhorizon/commerce-utils/lib/with-session'|from '@/lib/sessionOptions'|g"
```

**Verify** during Phase 5b smoke test:

```bash
curl -s -o /dev/null -w "GET /api/cart -> %{http_code}\n" http://localhost:3000/api/cart   # expect 200
curl -s -o /dev/null -w "GET /api/user -> %{http_code}\n" http://localhost:3000/api/user   # expect 200
```

### Category 7: New Files to Create

| File | Purpose |
|---|---|
| `src/proxy.ts` | Replaces `src/middleware.ts` — rename export from `middleware` to `proxy`, implement `shouldHandleLocale` and `isStaticPage` locally |
| `eslint.config.mjs` | Replaces `.eslintrc.json` — flat config format |
| `src/lib/iron-session-compat.ts` | Compatibility shim for `iron-session/next` removal |
| `src/lib/sessionOptions.ts` | Local override of `@happyhorizon/commerce-utils/lib/with-session` `sessionOptions` with RFC-6265-safe cookie name (Category 6f) |
| `src/lib/form-validators-compat.ts` | Backward-compatible aliases for renamed form validators (`isRequired` → `validateIsRequired`, etc.) |
| `src/theme/<theme>/ui/context/customContextProviders.tsx` | **v4-required.** Local override of `@happyhorizon/ui/context/customContextProviders` — registers project-specific providers (typically `MegaMenuProvider`, `ManagedMyStoreContext`) into the upstream `<ContextProvider>` chain. See Category 6c. |
| `src/theme/*/ui/hooks/index.ts` | Local barrel file for hooks (v4 removed barrel) |
| `src/theme/*/ui/helpers/index.ts` | Local barrel file for helpers (re-exports + stubs). Must re-export `trackPageView` from `@happyhorizon/ui/dataLayer` |
| `src/theme/*/ui/helpers/gtag.ts` | No-op stub for removed `dispatchGtag` only (NOT `trackPageView`) |
| `src/theme/*/ui/components/meta.tsx` | Theme overwrite if using `@theme/appLogo.png` (may need `.svg`) |

### Category 8: Files to Delete

| File | Reason |
|---|---|
| `src/middleware.ts` | Renamed to `src/proxy.ts` |
| `.eslintrc.json` | Replaced by `eslint.config.mjs` |

### Category 9: Runtime Fixes After Dev Server Starts

Even after all compilation errors are resolved, these runtime issues commonly appear:

1. **`TypeError: Cannot read properties of undefined (reading 'generalInformation')`** — Missing `UIStaticProvider` wrapper in `pageLayout.tsx`. See "UIStaticContext / UIStaticProvider Changes" section above.

2. **`TypeError: Cannot read properties of null (reading 'close')`** — HTML `<dialog>` element null ref on hydration. See "BaseDialog / HTML `<dialog>` component" section above.

3. **Desktop flyout menu not working** — Caused by the `<dialog>` crash breaking the component tree. Fixing the `baseDialog.tsx` null safety guards resolves this.

4. **Missing data in contexts** — If `layoutProps` is `undefined` instead of `{}`, many context consumers crash. Ensure `_app.tsx` passes `layoutProps={pageProps.layoutProps || {}}`.

### Upgrade Sequence Summary

For a v2 client app, apply changes in this order:

1. Run scope rename codemod (`@experius-commerce/*` → `@happyhorizon/*`)
2. Update `package.json` (deps, scripts, engines, lint-staged)
3. Update `core.config.js` (aliases, config options, transpilePackages)
4. Update `next.config.js` (proxyPrefetch, redirect patterns, env values)
5. Create `src/proxy.ts`, delete `src/middleware.ts`
6. Create `eslint.config.mjs`, delete `.eslintrc.json`
7. Align `src/pages/_error.tsx` to the v4 pattern (see Category 6b) — do NOT create `404.tsx` / `500.tsx`
8. Create `src/lib/iron-session-compat.ts`, update all `iron-session/next` imports
9. Create `src/lib/sessionOptions.ts` with sanitized cookie name, rewire all `@happyhorizon/commerce-utils/lib/with-session` importers (Category 6f). Update `apps/<app>/.env.local` and `.env.local.example` so `PACKAGE_NAME` matches the new `package.json` `name`.
10. Rename `apps/<app>/public/manifest.json` → `manifest.<theme>.json` (Category 6e)
11. Create `src/lib/form-validators-compat.ts`, update form validator imports
12. Create theme barrel files (`hooks/index.ts`, `helpers/index.ts`, `helpers/gtag.ts`)
13. **Apply the v4 ContextProvider architecture** (Category 6c — three lockstep changes):
    - Rewrite `_app.tsx` to use `<ContextProvider value={{ fetcher }} {...pageProps}>` from `@happyhorizon/ui/context/contextProvider` (no manual `<LocaleProvider>`/`<SWRConfig>`)
    - Create `src/theme/<theme>/ui/context/customContextProviders.tsx` registering `MegaMenuProvider` + `ManagedMyStoreContext` (and any other project-specific providers)
    - Strip ALL providers from local `pageLayout.tsx` — leave only the presentation tree (`<Meta>`, `<Header>`, `<Footer>`, etc.)
14. Add `"react-intl": "<commerce-swr-version>"` to root `package.json` `resolutions` to dedupe (Category 6d)
16. Update `authSidebar.tsx` and `miniCart.tsx` for new Sidebar API
17. Fix `baseDialog.tsx` with null safety guards
18. Fix classify HOC type errors with spread-as-any pattern (use `npx tsc --noEmit` for full error list)
19. Fix `className` → `extraClasses` migrations
20. Add missing required props to components (`Checkbox.name`, `Logo.width/height`, etc.)
21. Add tsconfig path mappings for legacy `@experius/*` packages
22. Add `typescript.ignoreBuildErrors` for remaining node_modules errors
23. Redirect broken node_modules imports to theme overwrites (e.g., `postcodenl`)
24. Run `yarn build`, verify all compilation errors resolved
25. Run `yarn dev` smoke test: `GET /`, `GET /api/cart`, `GET /api/user` must all return HTTP 200 (see SKILL.md Step 16b)
26. Test in browser for runtime errors
