---
name: hyva-child-theme
description: Create a Hyvä child theme in a Magento 2 project. This skill should be used when the user wants to create a new Hyvä child theme, set up a custom theme based on Hyvä, or initialize a new frontend theme directory structure. Trigger phrases include "create hyva child theme", "new hyva theme", "setup child theme", "create custom theme", "initialize theme".
---

# Hyvä Child Theme Creator

This skill creates a complete Hyvä child theme with the proper directory structure, configuration files, and Tailwind CSS build setup.

**Command execution:** For commands that need to run inside the development environment (e.g., `bin/magento`), use the `hyva-exec-shell-cmd` skill to detect the environment and determine the appropriate command wrapper.

## Workflow

### Step 1: Gather Theme Information

Prompt the user for:

**Vendor Name**: PascalCase (e.g., "Acme"). If there are existing Vendor name folders in `app/design/frontend` or `app/code/`, offer those as suggestions.

**Theme Name**: PascalCase or camelCase (e.g., "StoreTheme"). Must not already exist as a subdirectory.

### Step 2: Detect Parent Theme

If the user has not specified a parent theme, invoke the `hyva-theme-list` skill to find all Hyvä themes. Present options:
- `Hyva/default-csp` or `Hyva/default` (default themes)
- Any existing Hyvä child themes from `app/design/frontend/`

### Step 3: Create Directory Structure

```
app/design/frontend/<Vendor>/<themeName>/
├── registration.php
├── theme.xml
├── composer.json
└── web/
    └── tailwind/
        └── (copied from parent theme)
```

### Step 4: Create Configuration Files

#### registration.php

```php
<?php
declare(strict_types=1);

use Magento\Framework\Component\ComponentRegistrar;

ComponentRegistrar::register(ComponentRegistrar::THEME, 'frontend/<Vendor>/<themeName>', __DIR__);
```

#### theme.xml

```xml
<?xml version="1.0"?>
<theme xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
       xsi:noNamespaceSchemaLocation="urn:magento:framework:Config/etc/theme.xsd">
    <title>Example Store Theme</title>
    <parent>Hyva/default-csp</parent>
</theme>
```

Split PascalCase theme names into words for the title (e.g., `StoreTheme` → `Store Theme`).

#### composer.json

```json
{
    "name": "<vendor-lowercase>/<package-name>",
    "description": "Example Store Theme based on Hyvä",
    "type": "magento2-theme",
    "license": "proprietary",
    "require": {
        "hyva-themes/magento2-default-theme-csp": "*"
    },
    "autoload": {
        "files": ["registration.php"]
    }
}
```

Append `-theme` suffix to package name only if the theme name doesn't already end with "theme".

### Step 5: Copy and Configure Tailwind

```bash
mkdir -p app/design/frontend/<Vendor>/<ThemeName>/web
rsync -a --exclude='node_modules' <parent_theme_path>/web/tailwind app/design/frontend/<Vendor>/<ThemeName>/web/
```

Update `web/tailwind/hyva.config.json` to include parent theme path(s) in Tailwind content scanning.

### Step 6: Install Dependencies and Build CSS

Use the `hyva-compile-tailwind-css` skill to install dependencies and build CSS.

### Step 7: Enable the Theme

Via CLI:
```bash
bin/magento setup:upgrade
bin/magento cache:flush
```

Or via Magento Admin: Content > Design > Configuration.
