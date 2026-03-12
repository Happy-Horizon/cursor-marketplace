---
name: hyva-ui-component
description: Apply Hyva UI template-based components to a Hyvä theme. This skill should be used when the user wants to add, install, or apply a Hyva UI component (such as header, footer, gallery, menu, minicart, etc.) to their Hyvä theme. It lists available non-CMS components and their variants, displays component README instructions, and copies component files to the theme directory.
---

# Hyva UI Component

Applies Hyva UI template-based (non-CMS) components to a Hyvä theme by copying files from `{hyva_ui_path}/components/` to the theme directory.

**Path variable:** `{hyva_ui_path}` = `vendor/hyva-themes/hyva-ui` (default) or user-provided custom path.

**Command execution:** Use the `hyva-exec-shell-cmd` skill for commands needing the development environment.

## Step 0: Verify Hyva UI Installation

```bash
ls vendor/hyva-themes/hyva-ui/components/ 2>/dev/null
```

If NOT found, offer: (A) user provides custom extraction path, (B) `composer require --dev hyva-themes/hyva-ui`, or (C) download from https://hyva.io/my-account/my-downloads/

## Step 1: Identify Theme Path

Use the `hyva-theme-list` skill to find Hyvä themes in `app/design/frontend/`. Prompt user to select an existing theme or create a new one with `hyva-child-theme`.

## Step 2: List or Select Component

If no component specified, show the "Non-CMS Components (Template-Based)" section from the component catalog.

**Do NOT list:** CMS components, plugins (alpine-collapse, splidejs, sticky-header, tailwind-v3-design-tokens, tailwind-v4).

## Step 3: Show Variants

Variants: **A**=Basic, **B**=Enhanced, **C**=Advanced, **D**=Specialized.

```bash
ls {hyva_ui_path}/components/{component}/
```

## Step 4: Read Component README

Always read `{hyva_ui_path}/components/{component}/{variant}/README.md` before copying. Present dependencies, configuration options, and special requirements to the user.

## Step 5: Copy Component Files

Check which destination files already exist (track created vs updated), then copy:

```bash
cp -r {hyva_ui_path}/components/{component}/{variant}/src/* {theme_path}/
```

The `src/` directory maps directly to theme structure (`Magento_Theme/`, `Magento_Catalog/`, etc.). For existing layout XML files, **merge** content rather than overwriting.

## Step 6: After Installation

1. Run `bin/magento cache:flush`
2. Use `hyva-compile-tailwind-css` skill to rebuild CSS

## Output

Provide a summary of:
- Files created vs updated
- Any configuration options from the README
- Next steps (cache flush, CSS build, etc.)
