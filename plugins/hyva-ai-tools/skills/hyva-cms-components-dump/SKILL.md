---
name: hyva-cms-components-dump
description: Dump all Hyvä CMS components from active modules. This skill should be used when the user wants to list all CMS components, view available components, debug component configurations, or see the merged components.json output. Trigger phrases include "list cms components", "dump components", "show all components", "view cms components", "components.json dump".
---

# Hyvä CMS Component Dump

Locates all `components.json` files from Hyvä CMS modules and outputs a merged JSON object containing all component definitions from active modules.

## Usage

**Important:** Execute from the Magento project root directory.

```bash
php <skill_path>/scripts/dump_cms_components.php
```

Where `<skill_path>` is the directory containing this SKILL.md file.

**Output format:** A single JSON object containing all merged CMS component definitions.

## How It Works

1. Reads module configuration from `app/etc/config.php`
2. Filters active modules (value `1` only)
3. Locates `components.json` files in:
   - `app/code/{Vendor}/{Module}/etc/hyva_cms/components.json`
   - `vendor/{vendor-name}/{package-name}/*/etc/hyva_cms/components.json`
4. Maps paths to module names via `etc/module.xml`
5. Merges JSON in module load order

## Example Output

```json
{
    "text_block": {
        "label": "Text Block",
        "category": "Content",
        "template": "Hyva_CmsBase::elements/text-block.phtml"
    },
    "feature_card": {
        "label": "Feature Card",
        "category": "Elements",
        "template": "Custom_Module::elements/feature-card.phtml"
    }
}
```

## Integration with Other Skills

Used by `hyva-cms-component` to find icons already in use and detect component name conflicts.
