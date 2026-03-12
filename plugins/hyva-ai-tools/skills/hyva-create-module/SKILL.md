---
name: hyva-create-module
description: Create a new Magento 2 module in app/code/. This skill should be used when the user wants to create a module, scaffold a new module, generate module boilerplate, or set up a custom module. It handles registration.php, composer.json, module.xml generation with configurable dependencies. Trigger phrases include "create module", "new module", "scaffold module", "generate module".
---

# Create Magento 2 Module

Creates new Magento 2 modules in `app/code/`. Designed to be called by other skills that need module scaffolding.

**Command execution:** Use the `hyva-exec-shell-cmd` skill for commands needing the development environment.

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `vendor` | Yes | Vendor name in PascalCase (e.g., `Acme`) |
| `module` | Yes | Module name in PascalCase (e.g., `CustomFeature`) |
| `description` | No | Module description (default: "[Vendor] [Module] module") |
| `dependencies` | No | Array of module dependencies for `<sequence>` in module.xml |
| `composer_require` | No | Object of composer requirements (package: version) |

## Workflow

### Step 1: Validate Input

- Verify vendor and module names are PascalCase
- Check that `app/code/{Vendor}/{Module}` does not already exist

### Step 2: Create Directory Structure

```
app/code/{Vendor}/{Module}/
├── registration.php
├── composer.json
└── etc/
    └── module.xml
```

### Step 3: Generate Files

#### registration.php

```php
<?php
declare(strict_types=1);

use Magento\Framework\Component\ComponentRegistrar;

ComponentRegistrar::register(ComponentRegistrar::MODULE, '{Vendor}_{Module}', __DIR__);
```

#### composer.json

```json
{
    "name": "{vendor-kebabcase}/module-{module-kebabcase}",
    "description": "{Vendor} {Module} module",
    "type": "magento2-module",
    "require": {
        "php": ">=8.1"
    },
    "autoload": {
        "files": ["registration.php"],
        "psr-4": {
            "{Vendor}\\{Module}\\": ""
        }
    }
}
```

#### module.xml

```xml
<?xml version="1.0"?>
<config xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:noNamespaceSchemaLocation="urn:magento:framework:Module/etc/module.xsd">
    <module name="{Vendor}_{Module}">
        <sequence>
            <!-- dependencies go here -->
        </sequence>
    </module>
</config>
```

### PascalCase to kebab-case Conversion

| PascalCase | kebab-case |
|------------|------------|
| `CustomFeature` | `custom-feature` |
| `CmsComponents` | `cms-components` |
| `MyModule` | `my-module` |

## Error Handling

Abort and report when:
- Vendor/module name not PascalCase
- Directory already exists at `app/code/{Vendor}/{Module}`
- Cannot create directory or write file
