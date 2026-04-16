# Happy Horizon Cursor Marketplace

A curated [Cursor Team Marketplace](https://github.com/fieldsphere/cursor-team-marketplace-template)-style registry of plugins for Happy Horizon teams — Magento 2 / Hyvä, the Horizon storefront stack, and shared frontend guidance.

The manifest lives at [`.cursor-plugin/marketplace.json`](.cursor-plugin/marketplace.json). Each plugin is a folder under [`plugins/`](plugins/) with its own `.cursor-plugin/plugin.json`.

## Plugins

### [hyva-ai-tools](plugins/hyva-ai-tools/)

AI-oriented skills for Magento 2 with Hyvä Theme. Upstream: [lewisvoncken/hyva-ai-tools](https://github.com/lewisvoncken/hyva-ai-tools).

| Skill                       | Description                                                                   |
| --------------------------- | ----------------------------------------------------------------------------- |
| `hyva-alpine-component`     | Write CSP-compatible Alpine.js components for Hyvä themes                     |
| `hyva-child-theme`          | Create a Hyvä child theme with Tailwind CSS configuration                     |
| `hyva-cms-component`        | Create custom Hyvä CMS components with PHTML templates                        |
| `hyva-cms-components-dump`  | Dump combined JSON of all available Hyvä CMS components                       |
| `hyva-cms-custom-field`     | Create custom field types and field handlers for Hyvä CMS                     |
| `hyva-compile-tailwind-css` | Compile Tailwind CSS for Hyvä themes                                          |
| `hyva-create-module`        | Scaffold new Magento 2 modules in `app/code/`                                 |
| `hyva-exec-shell-cmd`       | Detect development environment and execute commands with appropriate wrappers |
| `hyva-playwright-test`      | Write Playwright tests for Hyvä themes with Alpine.js                         |
| `hyva-render-media-image`   | Generate responsive `<picture>` elements using the Hyva Media view model      |
| `hyva-theme-list`           | List all Hyvä theme paths in a Magento 2 project                              |
| `hyva-ui-component`         | Install Hyva UI template-based components to themes                           |

### [magento2-development](plugins/magento2-development/)

Cursor rules for Magento 2 / Adobe Commerce. See the [plugin README](plugins/magento2-development/README.md).

| Rule                 | Description                                                                     |
| -------------------- | ------------------------------------------------------------------------------- |
| `magento-structure`  | Project layout, key Magento files, and Cursor rule hygiene for M2 repos         |
| `php/standards`      | PHP 8 constructor promotion, casting, imports, and related coding style         |
| `app/magento-module` | Module development — component types, Adobe technical guidelines, and standards |
| `app/magento2-xss`   | XSS prevention — escaping in PHTML/PHP, output contexts, and template security  |

### [horizon-storefront](plugins/horizon-storefront/)

Happy Horizon **storefront** conventions for the monorepo and client apps. See the [plugin README](plugins/horizon-storefront/README.md).

| Skill                    | Description                                                                                              |
| ------------------------ | -------------------------------------------------------------------------------------------------------- |
| `hs-git-commit-messages` | Draft commit subjects/bodies in this repo’s `[TYPE][TICKET]` format; asks when ticket or type is unclear |

| Rule                             | Description                                                                        |
| -------------------------------- | ---------------------------------------------------------------------------------- |
| `development-environment`        | Install, env files, and day-to-day commands for the Horizon Storefront dev stack   |
| `project-structure`              | Monorepo layout, `@happyhorizon/*` packages, and import resolution across contexts |
| `client-app-development`         | Client apps under `apps/` — themes, framework extensions, and Next.js structure    |
| `horizon-storefront-development` | Package workflows, conventions, and versioning in `packages/`                      |
| `git-commit-messages`            | Required commit subject format (`[TYPE][TICKET] Summary`) and body style           |

### [horizon-frontend-foundations](plugins/horizon-frontend-foundations/)

Shared **Next.js / React / Vercel-oriented** rules and vendor skills for Horizon client repos. Plugin `rules/` and `skills/` are **symlinks** into [`synced-vendor-skills/`](synced-vendor-skills/) so vendor bodies are not duplicated. Typical client setup: enable **both** `horizon-frontend-foundations` and `horizon-storefront` in Cursor.

| Skill                         | Description                                                                                      |
| ----------------------------- | ------------------------------------------------------------------------------------------------ |
| `building-components`         | Build accessible, composable UI components, design tokens, publishing, and docs                  |
| `frontend-design`             | Distinctive production-grade interfaces and styling that avoid generic AI aesthetics             |
| `next-best-practices`         | Next.js conventions — routing, RSC boundaries, data fetching, metadata, errors, images, bundling |
| `next-upgrade`                | Upgrade Next.js using official migration guides and codemods                                     |
| `turborepo`                   | Monorepo task pipelines, caching, remote cache, filters, CI, and package boundaries              |
| `vercel-composition-patterns` | React composition patterns — compound components, context, fewer boolean props                   |
| `vercel-react-best-practices` | React and Next.js performance guidance from Vercel Engineering (rules catalog)                   |
| `web-design-guidelines`       | Review UI against Web Interface Guidelines (accessibility, UX, best practices)                   |

| Rule                       | Description                                                                             |
| -------------------------- | --------------------------------------------------------------------------------------- |
| `vendor-stack-foundations` | Align client work with Next.js, React, and Vercel-style patterns from the shared plugin |

**Refreshing vendor skills:** prefer the GitHub Action [Sync vendor skills](https://github.com/Happy-Horizon/cursor-marketplace/actions/workflows/sync-vendor-skills.yml) (manual run or daily schedule); it runs `npx skills update -y -p`, prunes extra agent trees, and opens a PR when the lockfile or skills change. For adding skills or local workflows, see [plugins/horizon-frontend-foundations/README.md](plugins/horizon-frontend-foundations/README.md) and [synced-vendor-skills/README.md](synced-vendor-skills/README.md).

## Repository layout

```
.cursor-plugin/marketplace.json          # Registry + plugin list
.github/workflows/sync-vendor-skills.yml   # Scheduled / manual vendor skill sync → PR
synced-vendor-skills/                    # skills-lock.json, .agents/skills/, shared rules
plugins/
  hyva-ai-tools/                         # Hyvä-focused skills (+ plugin.json)
  magento2-development/                  # Magento 2 rules
  horizon-storefront/                    # Storefront rules + skills
  horizon-frontend-foundations/        # Symlinks into synced-vendor-skills/
scripts/
  validate-template.mjs                  # Manifest + plugin + skill checks
  prune-synced-vendor-agent-skills.sh    # Keep only .agents/skills after skills CLI update
```

## Validate changes

From the repo root:

```bash
node scripts/validate-template.mjs
```

This checks marketplace paths, each plugin manifest, and required frontmatter in skill files (including symlinked vendor skills where applicable).

## Submission checklist

- Each plugin has a valid `.cursor-plugin/plugin.json`
- Plugin `name` values are unique, lowercase, and kebab-case
- [`.cursor-plugin/marketplace.json`](.cursor-plugin/marketplace.json) `plugins[].source` paths exist under `plugins/`
- Required frontmatter (`name`, `description`) exists in every `SKILL.md`
- `node scripts/validate-template.mjs` passes
