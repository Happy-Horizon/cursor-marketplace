---
name: hyva-theme-list
description: List all Hyvä theme paths in a Magento 2 project. This skill should be used when the user wants to find Hyvä themes, list available themes, discover theme paths, or when other skills need to locate Hyvä themes. Trigger phrases include "list hyva themes", "find themes", "show themes", "available themes", "theme paths".
---

# Hyvä Theme Listing

Lists all Hyvä theme paths in a Magento 2 project. Themes are identified by the presence of `web/tailwind/package.json`.

## Usage

**Important:** Execute from the Magento project root directory.

```bash
bash <skill_path>/scripts/list_hyva_themes.sh
```

**Output format:** One theme path per line (relative to project root).

```
app/design/frontend/Example/customTheme
vendor/hyva-themes/magento2-default-theme-csp
```

## Search Locations

| Location | Description |
|----------|-------------|
| `app/design/frontend/` | Custom themes developed for the project |
| `vendor/` | Installed themes from any vendor |

## Theme Identification

A directory is a Hyvä theme when it contains both:
1. `web/tailwind/package.json`
2. `theme.xml`

## Integration with Other Skills

Other skills invoke this skill to locate themes:
- `hyva-child-theme` — to find parent theme options
- `hyva-compile-tailwind-css` — to find themes to build
- `hyva-ui-component` — to find the target theme for component installation
