---
name: hyva-cms-custom-field
description: Create custom field types and field handlers for Hyvä CMS components. Use when the user mentions Hyvä, Hyva, or CMS together with custom field, custom input, or modal selector (e.g. hyva custom field, custom cms field, hyva modal selector, custom hyva input, custom cms input). Do not use for generic form or UI work outside Hyvä CMS.
---

# Hyvä CMS Custom Field Type Creator

## Overview

Guides the creation of custom field types and field handlers for Hyvä CMS components.

**Two types of custom fields:**
1. **Basic Custom Field Type**: Custom input control with direct data entry (date range, color picker, custom validation)
2. **Field Handler**: Enhanced UI with complex interactions (product selector with images, searchable dropdown, link configuration modal)

**Command execution:** Use the `hyva-exec-shell-cmd` skill for commands needing the development environment.

## Workflow

### Step 1: Module Selection

**Option A: New Module** — Use `hyva-create-module` with:
- `dependencies`: `["Hyva_CmsBase", "Hyva_CmsLiveviewEditor"]`
- `composer_require`: `{"hyva-themes/commerce-module-cms": "^1.0"}`

**Option B: Existing Module** — Verify both `Hyva_CmsBase` and `Hyva_CmsLiveviewEditor` dependencies.

### Step 2: Field Type Details

Gather: field type name (lowercase), purpose, UI pattern, data structure, and validation requirements.

**UI Patterns:**
- **Basic field**: Simple input with custom validation
- **Inline handler**: Enhanced control in field area (searchable dropdown, color picker)
- **Modal handler**: Separate dialog for complex selection (product selector, link builder)

### Step 3: Generate Field Template

Create at `view/adminhtml/templates/field-types/[field-type-name].phtml`.

**Required elements:**
1. Field container: `field-container-{uid}_{fieldName}`
2. Input element with name: `{uid}_{fieldName}`
3. Validation messages: `validation-messages-{uid}_{fieldName}`
4. `updateWireField()` or `updateField()` on value change
5. Use `$block->getData('value') ?? ''` (NOT type casting)

### Step 4: Register Field Type

In `etc/adminhtml/di.xml`:

```xml
<type name="Hyva\CmsLiveviewEditor\Model\CustomField">
    <arguments>
        <argument name="customTypes" xsi:type="array">
            <item name="[field_type_name]" xsi:type="string">
                [Vendor]_[Module]::field-types/[field-type-name].phtml
            </item>
        </argument>
    </arguments>
</type>
```

### Step 5: Register Handler Modal (modal handlers only)

In `view/adminhtml/layout/liveview_editor.xml`:

```xml
<referenceContainer name="before.body.end">
    <block name="[handler_name]_handler"
           template="[Vendor]_[Module]::handlers/[handler-name]-handler.phtml"/>
</referenceContainer>
```

**CRITICAL:** Use `before.body.end` — NOT `after.body.end`.

## Critical Patterns

- **Field Value**: Always `$block->getData('value') ?? ''` — never `(string) $block->getData('value')`
- **Dialog class**: Use `open:flex` not static `flex` on modal elements
- **JSON data**: Handle both array and string types — field values may be pre-decoded
- **`updateWireField`** (default): products, links, categories
- **`updateField`** (specialized): images, debounced inputs

## Usage Example in components.json

```json
{
    "my_component": {
        "content": {
            "[field_name]": {
                "type": "custom_type",
                "custom_type": "[field_type_name]",
                "label": "Field Label",
                "attributes": {
                    "required": true
                }
            }
        }
    }
}
```
