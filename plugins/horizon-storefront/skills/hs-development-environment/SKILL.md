---
name: hs-development-environment
description: Guidelines for setting up and running the Horizon Storefront development environment
---

# Development Environment

## Prerequisites

- **Node.js**: v24 (use `nvm install 24` or `nvm use` with `.nvmrc`)
- **Yarn**: 4.12.0 (Berry, enabled via `corepack enable`)
- **Corepack**: Must be enabled (`corepack enable`) for Yarn 4

For upgrading Node.js or Yarn, see the [hs-node-yarn-update skill](../hs-node-yarn-update/SKILL.md).

## Initial Setup

### Installation

1. **Install dependencies**:

    ```bash
    corepack enable
    yarn install
    ```

2. **Set up environment files** (if not already present):

    ```bash
    cp apps/magento/.env.local.example apps/magento/.env.local
    cp apps/bigcommerce/.env.local.example apps/bigcommerce/.env.local
    cp apps/medusa/.env.local.example apps/medusa/.env.local
    ```

3. **Configure environment variables** in each app's `.env.local` file:
    - `FRAMEWORK` - Commerce framework (magento, medusa, bigcommerce)
    - `FRAMEWORK_CMS` - CMS framework (storyblok, payloadcms)
    - `UI_PACKAGE` - UI package variant (ui, ui-tailwind)
    - Other framework-specific variables

### TypeScript Configuration

- TypeScript configs are generated automatically via `envsub` from `tsconfig.template.json`
- **Pre-dev hook**: `predev` runs `tsconfigdev` which generates `tsconfig.json` with environment variable substitution
- **Pre-build hook**: `prebuild` runs `tsconfig` which generates `tsconfig.json` for production builds
- Environment variables from `.env.local` are substituted into path mappings

## Running Development Servers

### Running All Apps (Monorepo Root)

Run all apps in parallel using Turbo:

```bash
yarn dev
```

This command:

- Runs `predev` hook which generates TypeScript configs
- Executes `turbo run dev --parallel` to start all apps simultaneously
- Uses Turbo for parallel execution and caching

### Running Individual Apps

Navigate to the app directory and run:

```bash
# Magento app
cd apps/magento && yarn dev

# Medusa app
cd apps/medusa && yarn dev

# BigCommerce app
cd apps/bigcommerce && yarn dev
```

Each app runs Next.js development server:

- **Magento**: Typically runs on default Next.js port (3000)
- **Medusa**: Typically runs on default Next.js port (3000)
- **BigCommerce**: Typically runs on port 1705 (see `package.json`)

### Running Individual Packages

Packages don't have dev servers, but you can:

- **Build packages**: `cd packages/ui && yarn build`
- **Run Storybook** (if available): `cd packages/ui && yarn storybook`
- **Run tests**: `cd packages/ui && yarn test`

## Development Workflow

### Code Quality

- **Linting**: `yarn lint` (runs ESLint across all packages/apps)
- **Formatting**: `yarn format` (runs Prettier on all files)
- **Pre-commit**: Husky hooks run `lint-staged` automatically before commits

### Building

- **Build all**: `yarn build` (runs `prebuild` then `turbo run build --parallel`)
- **Build individual app**: `cd apps/magento && yarn build`
- **Build individual package**: `cd packages/ui && yarn build`

### Testing

- **Run all tests**: `yarn test` (runs Cypress tests in parallel)
- **Open test runner**: `yarn test:open` (opens Cypress UI)
- **Run app tests**: `cd apps/magento && yarn test` or `yarn test:open`

### Storybook

- **Run all Storybooks**: `yarn storybook` (runs all Storybook instances in parallel)
- **Build Storybooks**: `yarn storybook:build`
- **Start built Storybooks**: `yarn storybook:start`
- **Run individual Storybook**: `cd apps/magento && yarn storybook` (runs on port 6006)

## Environment Variables

### Required Environment Variables

Each app requires specific environment variables in `.env.local`:

**Common Variables:**

- `FRAMEWORK` - Commerce framework identifier
- `FRAMEWORK_CMS` - CMS framework identifier (optional)
- `UI_PACKAGE` - UI package variant

**Framework-Specific Variables:**

- Magento: API endpoints, store views, etc.
- Medusa: API URL, store configuration, etc.
- BigCommerce: Store hash, API tokens, etc.

### Environment File Location

- **App-specific**: `apps/{app-name}/.env.local`
- **Example files**: `apps/{app-name}/.env.local.example`
- **Never commit**: `.env.local` files are gitignored

## Port Configuration

### Default Ports

- **Next.js Dev Server**: 3000 (default, can be overridden)
- **BigCommerce App**: 1705 (configured in `package.json`)
- **Storybook**: 6006 (default)
- **Cypress**: Uses app port + test configuration

### Port Conflicts

If ports are in use:

- Change port in app's `package.json` dev script
- Or use `-p` flag: `next dev -p 3001`

## Turbo Configuration

### Turbo Tasks

Turbo manages parallel execution of tasks across the monorepo:

- **`dev`**: Development servers (no caching)
- **`build`**: Production builds (cached)
- **`lint`**: Linting (cached)
- **`test`**: Testing (cached)
- **`precommit`**: Pre-commit checks (cached)
- **`storybook`**: Storybook dev servers (no caching)

### Turbo Cache

- Build outputs are cached in `.turbo/` directory
- Cache is shared across team members (if configured)
- Clear cache: `yarn clean` or delete `.turbo/` directory

## Common Development Tasks

### Hot Reloading

- All apps support hot module replacement (HMR)
- Changes to packages trigger rebuilds in consuming apps
- Changes to app code trigger immediate reload

### TypeScript Compilation

- TypeScript is checked during development
- Errors appear in terminal and browser console
- No separate compilation step needed (Next.js handles it)

### Package Development

When developing packages:

1. Make changes in `packages/{package-name}/`
2. Changes are automatically picked up by apps via path mappings
3. No need to rebuild packages during development (in monorepo)
4. For testing, run package-specific commands

### Debugging

- Use browser DevTools for client-side debugging
- Use VS Code debugger for server-side debugging
- Set breakpoints in TypeScript files
- Check terminal output for server-side logs

## Troubleshooting

### TypeScript Config Not Generated

- Ensure `.env.local` exists in app directory
- Run `yarn tsconfigdev` manually
- Check environment variables are set correctly

### Port Already in Use

- Find process using port: `lsof -i :3000`
- Kill process or change port in `package.json`
- Use different port: `next dev -p 3001`

### Package Changes Not Reflected

- Ensure path mappings in `tsconfig.json` point to local packages
- Check that you're importing from `@happyhorizon/*` (not direct paths)
- Restart dev server if needed

### Build Failures

- Clear Turbo cache: `yarn clean`
- Clear Next.js cache: `rm -rf apps/{app}/.next`
- Reinstall dependencies: `yarn install`
- Check for TypeScript errors: `yarn lint`

## Cursor Environment Configuration

The `.cursor/environment.json` file configures:

- **Install command**: Sets up environment files automatically
- **Terminal presets**: Quick access to run individual apps
    - "Run Magento App"
    - "Run Medusa App"
    - "Run BigCommerce App"

## Best Practices

1. **Ensure corepack is enabled** (`corepack enable`) before running Yarn commands
2. **Always run `yarn install`** after pulling changes or switching branches
2. **Keep `.env.local` files updated** with required environment variables
3. **Use Turbo commands** (`yarn dev`, `yarn build`) for parallel execution
4. **Run linting before committing** (`yarn lint`)
5. **Test changes** in the specific app you're working on
6. **Clear caches** if experiencing build issues
7. **Check terminal output** for errors and warnings

## Documentation References

- **Horizon Storefront Developer Docs**: https://devdocs.experius.nl/
- **Next.js Documentation**: https://nextjs.org/docs
- **Turbo Documentation**: https://turbo.build/repo/docs
