---
name: hyva-alpine-component
description: Write CSP-compatible Alpine.js components for Hyvä themes in Magento 2. This skill should be used when the user wants to create Alpine components, add interactivity to Hyvä templates, write JavaScript for Hyvä themes, or needs help with Alpine.js patterns that work with Content Security Policy. Trigger phrases include "create alpine component", "add interactivity", "alpine for hyva", "x-data component", "csp compatibility", "csp compliant javascript".
---

# Hyvä Alpine Component

## Overview

This skill provides guidance for writing CSP-compatible Alpine.js components in Hyvä themes. Alpine CSP is a specialized Alpine.js build that operates without the `unsafe-eval` CSP directive, which is required for PCI-DSS 4.0 compliance on payment-related pages (mandatory from April 1, 2025).

**Key principle:** CSP-compatible code functions in both standard and Alpine CSP builds. Write all Alpine code using CSP patterns for future-proofing.

## CSP Constraints Summary

| Capability | Standard Alpine | Alpine CSP |
|------------|-----------------|------------|
| Property reads | `x-show="open"` | Same |
| Negation | `x-show="!open"` | Method: `x-show="isNotOpen"` |
| Mutations | `@click="open = false"` | Method: `@click="close"` |
| Method args | `@click="setTab('info')"` | Dataset: `@click="setTab" data-tab="info"` |
| `x-model` | Available | **Not supported** - use `:value` + `@input` |
| Range iteration | `x-for="i in 10"` | **Not supported** |

## Component Structure Pattern

Every Alpine component in Hyvä follows this structure:

```html
<div x-data="initComponentName">
    <!-- Template content -->
</div>
<script>
    function initComponentName() {
        return {
            // Properties
            propertyName: initialValue,

            // Lifecycle
            init() {
                // Called when component initializes
            },

            // Methods for state access
            isPropertyTrue() {
                return this.propertyName === true;
            },

            // Methods for mutations
            setPropertyValue() {
                this.propertyName = this.$event.target.value;
            }
        }
    }
    window.addEventListener('alpine:init', () => Alpine.data('initComponentName', initComponentName), {once: true})
</script>
<?php $hyvaCsp->registerInlineScript() ?>
```

**Critical requirements:**
1. Register constructor with `Alpine.data()` inside `alpine:init` event listener
2. Use `{once: true}` to prevent duplicate registrations
3. Call `$hyvaCsp->registerInlineScript()` after every `<script>` block
4. Use `$escaper->escapeJs()` for PHP values in JavaScript strings
5. Use `$escaper->escapeHtmlAttr()` for data attributes (not `escapeJs`)

## Constructor Functions

### Basic Registration

```javascript
function initMyComponent() {
    return {
        open: false
    }
}
window.addEventListener('alpine:init', () => Alpine.data('initMyComponent', initMyComponent), {once: true})
```

**Why named global functions?** Constructor functions are declared as named functions in global scope (not inlined in the `Alpine.data()` callback) so they can be proxied and extended in other templates. This is an extensibility feature of Hyvä Themes.

### Composing Multiple Objects

```javascript
function initMyModal() {
    return {
        ...hyva.modal.call(this),
        ...hyva.formValidation(this.$el),
        customProperty: '',
        customMethod() {
            // Custom logic
        }
    };
}
```

## Property Access Patterns

### Transforming Values (Negation, Conditions)

CSP does not allow inline transformations. Create methods instead:

**Wrong (CSP incompatible):**
```html
<span x-show="!item.deleted"></span>
```

**Correct:**
```html
<span x-show="isItemNotDeleted"></span>
```

```javascript
return {
    item: { deleted: false },
    isItemNotDeleted() {
        return !this.item.deleted;
    }
}
```

## Property Mutation Patterns

### Extract Mutations to Methods

**Wrong (CSP incompatible):**
```html
<button @click="open = !open">Toggle</button>
```

**Correct:**
```html
<button @click="toggle">Toggle</button>
```

```javascript
return {
    open: false,
    toggle() {
        this.open = !this.open;
    }
}
```

### Passing Arguments via Dataset

**Wrong (CSP incompatible):**
```html
<button @click="selectItem(123)">Select</button>
```

**Correct:**
```html
<button @click="selectItem" data-item-id="<?= $escaper->escapeHtmlAttr($itemId) ?>">Select</button>
```

```javascript
return {
    selected: null,
    selectItem() {
        this.selected = this.$el.dataset.itemId;
    }
}
```

## x-model Alternatives

`x-model` is **not available** in Alpine CSP. Use two-way binding patterns instead.

### Text Inputs

```html
<input type="text" :value="username" @input="setUsername">
```

```javascript
return {
    username: '',
    setUsername() {
        this.username = this.$event.target.value;
    }
}
```

## Hyva Utility Functions

The global `hyva` object provides:

- `hyva.getFormKey()` — Get/generate form key for POST requests
- `hyva.formatPrice(value, showSign, options)` — Format currency
- `hyva.safeParseNumber(rawValue)` — Parse number safely (for x-model.number replacement)
- `hyva.trapFocus(rootElement)` — Trap focus within element (for modals)
- `hyva.getBrowserStorage()` — Get localStorage/sessionStorage safely

## References

- Hyvä CSP Documentation: https://docs.hyva.io/hyva-themes/writing-code/csp/alpine-csp.html
- Alpine.js Documentation: https://alpinejs.dev/
