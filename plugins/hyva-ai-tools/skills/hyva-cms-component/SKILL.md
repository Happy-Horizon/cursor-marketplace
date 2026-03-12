---
name: hyva-cms-component
description: Create custom Hyvä CMS component. This skill should be used when the user wants to create a new Hyvä CMS component, build a Hyvä component, or needs help with components.json and PHTML templates for Hyvä CMS. Trigger phrases include "create hyva cms component", "add cms component", "new hyva component", "build page hyva cms element", "custom cms element".
---

# Hyvä CMS Component Creator

## Overview

Guides the interactive creation of custom Hyvä CMS components for Magento 2. Supports creating components in new or existing modules, with field presets for common patterns.

**Command execution:** Use the `hyva-exec-shell-cmd` skill for commands that need to run inside the development environment.

## Workflow

### Step 1: Module Selection

**Option A: New Module** — Use the `hyva-create-module` skill with:
- `dependencies`: `["Hyva_CmsBase"]`
- `composer_require`: `{"hyva-themes/commerce-module-cms": "^1.0"}`

**Option B: Existing Module** — Verify `Hyva_CmsBase` dependency and `hyva-themes/commerce-module-cms` in `composer.json`.

### Step 2: Component Details

Gather: component name (snake_case), label, category (Layout/Elements/Media/Content/Other), and icon.

For icon selection:
1. Use `hyva-cms-components-dump` to find icons already in use
2. List SVGs in `vendor/hyva-themes/magento2-theme-module/src/view/base/web/svg/lucide/`
3. Pick an unused icon that best matches the component's purpose
4. Format as `Hyva_Theme::svg/lucide/[icon-name].svg`

### Step 3: Field Selection

Offer field presets or custom field creation. For custom fields, gather: name, type, label, default value, required, and additional attributes.

### Step 4: Variant Support

Ask if the component needs template variants (default, compact, wide, etc.).

### Step 5: Generate Files

#### components.json Structure

```json
{
    "[component_name]": {
        "label": "[Label]",
        "category": "[Category]",
        "icon": "Hyva_Theme::svg/lucide/[icon].svg",
        "template": "[Vendor]_[Module]::elements/[component-name].phtml",
        "content": {},
        "design": {
            "includes": [
                "Hyva_CmsBase::etc/hyva_cms/default_design.json",
                "Hyva_CmsBase::etc/hyva_cms/default_design_typography.json"
            ]
        },
        "advanced": {
            "includes": [
                "Hyva_CmsBase::etc/hyva_cms/default_advanced.json"
            ]
        }
    }
}
```

**CRITICAL rules:**
- `children` is a ROOT-LEVEL property, NOT a field type in `content`/`design`/`advanced`
- Field validation goes in `attributes`: `"attributes": {"required": true}` ✅ NOT `"required": true` ❌
- Default values use `default_value` key, NOT `default`

#### PHTML Template Header

```php
<?php
declare(strict_types=1);

use Hyva\CmsLiveviewEditor\Block\Element;
use Hyva\Theme\Model\ViewModelRegistry;
use Magento\Framework\Escaper;

/** @var Element $block */
/** @var Escaper $escaper */
/** @var ViewModelRegistry $viewModels */
```

Always call `$block->getEditorAttrs()` on the root element and `$block->getEditorAttrs('field_name')` on each editable element.

### Step 6: Run Setup

```bash
bin/magento setup:upgrade
```

## Important Guidelines

1. Always use `getEditorAttrs()` on the root element and on each editable field
2. Never use `<script>` tags in templates — use Alpine.js via `alpine:init` event
3. Escape all user content with appropriate escaper methods
4. Use `hyva-render-media-image` skill for rendering images
5. For richtext fields, use `/** @noEscape */` (content is already safe HTML)
