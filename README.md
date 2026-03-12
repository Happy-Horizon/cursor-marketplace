# Happy Horizon Cursor Marketplace

A curated set of AI plugins for Happy Horizon teams, following the [Cursor Team Marketplace](https://github.com/fieldsphere/cursor-team-marketplace-template) format.

## Included Plugins

### [hyva-ai-tools](plugins/hyva-ai-tools/)

AI-powered skills for Magento 2 development with Hyvä Theme. Source: [lewisvoncken/hyva-ai-tools](https://github.com/lewisvoncken/hyva-ai-tools).

| Skill | Description |
|-------|-------------|
| `hyva-alpine-component` | Write CSP-compatible Alpine.js components for Hyvä themes |
| `hyva-child-theme` | Create a Hyvä child theme with Tailwind CSS configuration |
| `hyva-cms-component` | Create custom Hyvä CMS components with PHTML templates |
| `hyva-cms-components-dump` | Dump combined JSON of all available Hyvä CMS components |
| `hyva-cms-custom-field` | Create custom field types and field handlers for Hyvä CMS |
| `hyva-compile-tailwind-css` | Compile Tailwind CSS for Hyvä themes |
| `hyva-create-module` | Scaffold new Magento 2 modules in app/code/ |
| `hyva-exec-shell-cmd` | Detect development environment and execute commands with appropriate wrappers |
| `hyva-playwright-test` | Write Playwright tests for Hyvä themes with Alpine.js |
| `hyva-render-media-image` | Generate responsive `<picture>` elements using the Hyva Media view model |
| `hyva-theme-list` | List all Hyvä theme paths in a Magento 2 project |
| `hyva-ui-component` | Install Hyva UI template-based components to themes |

## Repository Structure

```
.cursor-plugin/marketplace.json   # Marketplace manifest and plugin registry
plugins/
  hyva-ai-tools/
    .cursor-plugin/plugin.json    # Plugin metadata
    skills/                       # Skill folders with SKILL.md
      hyva-alpine-component/
      hyva-child-theme/
      hyva-cms-component/
      hyva-cms-components-dump/
      hyva-cms-custom-field/
      hyva-compile-tailwind-css/
      hyva-create-module/
      hyva-exec-shell-cmd/
      hyva-playwright-test/
      hyva-render-media-image/
      hyva-theme-list/
      hyva-ui-component/
scripts/
  validate-template.mjs           # Validation script
```

## Validate Changes

```bash
node scripts/validate-template.mjs
```

This checks marketplace paths, plugin manifests, and required frontmatter in skill files.

## Submission Checklist

- Each plugin has a valid `.cursor-plugin/plugin.json`
- Plugin names are unique, lowercase, and kebab-case
- `.cursor-plugin/marketplace.json` entries map to real plugin folders
- Required frontmatter (`name`, `description`) exists in all SKILL.md files
- `node scripts/validate-template.mjs` passes
