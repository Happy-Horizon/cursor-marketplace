---
name: hs-tailwindplus-to-recipe
description: >-
  Convert Tailwind Plus components into theme-commerce shell recipes. Use when
  the user asks to add a Tailwind Plus component to the commerce theme, create a
  recipe from Tailwind Plus, or references a Tailwind Plus component name for
  integration into packages/theme-commerce.
---

# Tailwind Plus to theme-commerce recipe

## Prerequisites

- Tailwind Plus MCP server enabled in `.cursor/mcp.json`
- MCP server name is typically `project-*-tailwindplus` (check available servers)

## Workflow

### 1. Fetch the component via MCP

Use the Tailwind Plus MCP tool `get_component_by_full_name`:

```
full_name: "Ecommerce.Components.<Category>.<Component Name>"
framework: "react"
tailwind_version: "4"
mode: "none"          # eCommerce components always use "none"
```

For Application UI or Marketing components, use mode `"light"` instead of `"none"`.

Use `list_component_names` or `search_component_names` if the exact path is unknown.

### 2. Analyze the layout structure

From the fetched JSX, identify:

- Grid system (e.g. `lg:grid-cols-12`, `lg:grid-cols-2`)
- Column spans and row spans for each major section
- How sections are stacked (gallery, buybox, details, cross-selling)
- Whether details use inline rendering or collapsible disclosures

### 3. Create the shell recipe

**Path**: `packages/theme-commerce/recipes/<ComponentName>/<RecipeName>.tsx`

Strip all business logic, data, and interactive widgets from the Tailwind Plus component. Replace with named slot props:

| Tailwind Plus element | Slot prop |
|---|---|
| Image gallery / carousel | `gallery` |
| Product form (price, options, add-to-cart) | `actions` |
| Description HTML | `description` |
| Specs / attributes | `specifications` |
| Additional info | `afterSpecifications` |
| Compare widget | `compare` |
| Reviews section | `reviews` |
| Related products | `relatedProducts` |
| Upsell products | `upsellProducts` |
| Dynamic relations | `dynamicProductRelations` |
| JSON-LD | `structuredDataProduct` |
| Entity data | `entity` (typed as the relevant commerce type) |

Keep only the layout HTML and Tailwind classes from the original component.

### 4. Replace controls with `@happyhorizon/ui` primitives

Never use Headless UI or heroicons directly. Map to UI library equivalents:

| Tailwind Plus / Headless UI | `@happyhorizon/ui` |
|---|---|
| `Disclosure`, `DisclosureButton`, `DisclosurePanel` | `Disclosure`, `DisclosureHeader`, `DisclosurePanel` from `@happyhorizon/ui/components/Disclosure` |
| `DisclosureGroup` (multiple disclosures) | `DisclosureGroup` from `@happyhorizon/ui/components/DisclosureGroup` |
| `Tab`, `TabGroup`, `TabList`, `TabPanel`, `TabPanels` | Delegate to the `gallery` slot (let the slot owner handle tabs) |
| `<button>` | `Button` from `@happyhorizon/ui/components/Button` |

### 5. Follow recipe conventions

- **No relative imports** -- use `@happyhorizon/` package paths
- **PascalCase** file and folder names
- **Shell = layout only** -- zero business logic, no data fetching, no state, no side effects
- **`BreadcrumbsContainer`** at the top (from `@happyhorizon/theme-commerce/components/Breadcrumbs/BreadcrumbsContainer`)
- **`container-site`** wrapper class for page-width containment
- **`id="html-body"`** on the outermost div
- **Cross-selling section** outside `container-site` at the bottom
- **`structuredDataProduct`** rendered last (invisible JSON-LD)
- Export a named function and a typed props interface

### 6. Wire into the container

For ProductShell recipes, update `ProductShellContainer.tsx`:

1. Import the new recipe
2. Add the variant name to `ProductShellVariant` type union
3. Add a new `if (resolvedVariant === '<Name>')` branch before the default `return`

The variant can then be activated via `theme.config.json`:

```json
{
  "productDetail": {
    "variant": "<VariantName>"
  }
}
```

## Reference files

- Recipe conventions: `.cursor/rules/theme-commerce-development.mdc`
- Import rules: `.cursor/rules/horizon-ui-conventions.mdc`
- Existing recipes: `packages/theme-commerce/recipes/ProductShell/`
- Container: `packages/theme-commerce/components/ProductShell/ProductShellContainer.tsx`
