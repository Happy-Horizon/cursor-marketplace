---
name: hs-patch-validation
description: Validate existing patch-package patches during upgrades. Analyzes each patch to determine if the fix is still needed in the new package version, helps re-apply patches when needed, and identifies patches that can be safely removed. Use when upgrading Horizon Storefront or any project that uses patch-package.
---

# Patch Validation

Validates existing `patch-package` patches during dependency upgrades. Determines whether each patch is still needed, can be safely dropped, or must be re-applied to the new version.

## When to Use

- During Horizon Storefront upgrades (v2→v4, v3→v4)
- When upgrading any major dependency that has patches in `patches/`
- When migrating from `patch-package` (Yarn 1) to `yarn patch` (Yarn 4)
- When `yarn install` or `patch-package` fails due to version mismatch

## Validation Checklist

```
Patch Validation Progress:
- [ ] Inventory all patches in patches/ directory
- [ ] For each patch: analyze what it fixes
- [ ] For each patch: check if fix is in the new version
- [ ] For each patch: determine action (drop / re-apply / migrate)
- [ ] Apply actions
- [ ] Verify functionality
```

## Workflow

### Step 1: Inventory Patches

List all `.patch` files in the `patches/` directory:

```
patches/
├── next+13.5.9.patch          # package+version.patch format
├── react-dom+18.2.0.patch     # another example
└── ...
```

The filename format is `<package-name>+<version>.patch` (from `patch-package`).

### Step 2: Analyze Each Patch

For each patch file:

1. **Read the patch** to understand the exact changes
2. **Classify the fix** into one of these categories:

| Category | Description | Example |
|---|---|---|
| **Bug fix** | Fixes a bug in the package | Router not handling specific URLs correctly |
| **Feature addition** | Adds functionality not in the package | Custom prefetch behavior for catch-all routes |
| **Workaround** | Works around a package limitation | Hard navigation for specific paths |
| **Configuration** | Changes default behavior/config | Different error handling strategy |
| **Project-specific** | Patch only makes sense for this project | URL-specific routing rules |

3. **Document the intent**: Why was this patch created? What problem does it solve?

### Step 3: Check New Version

For each patch, determine if the fix is still needed:

#### Method A: Read the Changelog

Check the package changelog for mentions of the patched behavior:

```bash
# For Next.js patches, check the release notes
# Use WebFetch to read the changelog for the target version
```

Key questions:
- Was the bug fixed upstream in a later version?
- Was the API changed so the patch no longer applies?
- Was the feature added natively?

#### Method B: Compare Source Code

Read the patched file in the new version to see if:
1. The patched code still exists (same file, same function)
2. The fix was incorporated upstream
3. The code was refactored (patch may not apply but problem may persist)

```bash
# After installing the new version, check if the patched file/function still exists
# Look at the specific lines the patch modifies
```

#### Method C: Test Without the Patch

1. Install the new version WITHOUT the patch
2. Test the specific functionality the patch addresses
3. If it works → patch can be dropped
4. If it doesn't → patch needs re-application

### Step 4: Determine Action

For each patch, assign one of these actions:

| Action | When | How |
|---|---|---|
| **Drop** | Fix is in new version, or patched code no longer exists | Delete the patch file |
| **Re-apply** | Fix is still needed and code structure is similar | Create new patch for new version |
| **Migrate to code** | Fix is project-specific behavior, not a bug | Move the logic into project source code (theme overwrite, middleware/proxy, etc.) |
| **Report upstream** | Fix is a legitimate bug that should be in the package | Create an issue/PR on the package repo, keep patch temporarily |

### Step 5: Re-Applying Patches

#### For Yarn 4 (using `yarn patch`):

```bash
# Start an interactive patch session
yarn patch <package-name>

# This creates a temporary directory with the package source
# Apply the changes manually (guided by the old patch)
# Then commit the patch:
yarn patch-commit -s <temp-directory>
```

This creates a `.yarn/patches/<package>-<hash>.patch` file and adds a `resolutions` entry to `package.json`:

```json
"resolutions": {
    "<package>@<version>": "patch:<package>@<version>#~/.yarn/patches/<package>-<hash>.patch"
}
```

#### For patch-package (Yarn 1):

```bash
# Make changes directly in node_modules/<package>/
# Then run:
npx patch-package <package-name>
```

### Step 6: Migrating Patches to Project Code

Some patches are better implemented as project-level code instead of package patches. Common migration patterns:

#### Router/Navigation patches → Proxy/Middleware

If the patch modifies routing behavior (like hard navigation for specific URLs):

```typescript
// src/proxy.ts (or src/middleware.ts in older versions)
export function proxy(request: NextRequest) {
    // Move URL-specific routing logic here instead of patching Next.js internals
    if (request.nextUrl.pathname.startsWith('/external-tool')) {
        return NextResponse.redirect(new URL('/external-tool', request.url));
    }
    // ... rest of proxy logic
}
```

#### Data fetching patches → API routes or getServerSideProps

If the patch modifies data fetching behavior:

```typescript
// Move to a custom API route or getServerSideProps/getStaticProps
// instead of patching the framework's internal fetching
```

#### DOM patches → Client-side utilities

If the patch modifies DOM behavior (like Google Translate compatibility):

```typescript
// src/theme/*/helpers/patchDomMethods.ts
// Keep as a theme-level utility, not a package patch
```

## Patch Analysis Template

For each patch, document:

```
## Patch: <filename>
- **Package**: <package-name>@<version>
- **File(s) modified**: <list of files in the patch>
- **Category**: Bug fix / Feature / Workaround / Project-specific
- **Intent**: <what problem does this solve?>
- **New version**: <target version>
- **Still needed?**: Yes / No / Partially
- **Action**: Drop / Re-apply / Migrate to code / Report upstream
- **Migration path**: <if migrating, where does the logic go?>
- **Verification**: <how to test that the fix still works>
```

## Example: Analyzing a Next.js Router Patch

Given a patch like `next+13.5.9.patch` that:
1. Forces hard navigation for a specific URL (`/groepenkast-op-maat`)
2. Modifies prefetch behavior for catch-all routes (`[[...slug]]`)

### Analysis:

**Part 1: Hard navigation for specific URL**
- **Category**: Project-specific workaround
- **Intent**: External configurator at `/groepenkast-op-maat` needs full page reload
- **Still needed in Next.js 16?**: The URL-specific need is project-specific, not a Next.js bug
- **Action**: **Migrate to code** — move to `src/proxy.ts` or handle via `next.config.js` redirects/rewrites
- **Migration**:

```typescript
// src/proxy.ts — handle hard navigation via redirect
if (request.nextUrl.pathname.startsWith('/groepenkast-op-maat')) {
    // Return a response that forces a full page load
    // Or use next.config.js redirect to an external URL
}
```

**Part 2: Prefetch behavior for catch-all routes**
- **Category**: Bug fix / workaround
- **Intent**: Ensures proper data fetching for `[[...slug]]` dynamic routes
- **Still needed in Next.js 16?**: Next.js 16 has significantly reworked routing and prefetching. Check if the issue persists.
- **Action**: **Test without patch first**. If the issue persists, investigate if there's a configuration option (`experimental.proxyPrefetch`) or if the patch needs re-application.

## Common Patch Patterns in Horizon Storefront Projects

| Patch Target | Common Reason | Likely Action on Upgrade |
|---|---|---|
| `next/dist/shared/lib/router/router.js` | URL-specific routing fixes | Migrate to proxy.ts or next.config.js |
| `next/dist/server/render.js` | SSR rendering fixes | Check if fixed in new version |
| `next/dist/client/image.js` | Image component behavior | Usually fixed in newer Next.js |
| `react-dom` patches | Hydration or DOM fixes | Usually fixed in React 19 |
| `@happyhorizon/*` patches | Fixes waiting for next package release | Check if included in v4 packages |

## Integration with Upgrade Workflow

This skill integrates with the Horizon Storefront upgrade (see `hs-core-upgrade/SKILL.md`):

1. **Before upgrade**: Run patch validation as part of Step 0 (detection)
2. **During upgrade**: Execute patch actions as part of Step 4b (legacy tooling cleanup)
3. **After upgrade**: Verify patched functionality still works as part of Step 11 (verification)

The upgrade codemod (`codemod-rename-experius.js`) already removes `patch-package` and `postinstall-postinstall` from `package.json`. This skill handles the actual patch content analysis that the codemod cannot do.
