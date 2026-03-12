---
name: hyva-compile-tailwind-css
description: Compile Tailwind CSS for Hyvä themes in Magento 2. This skill should be used when the user wants to build styles, generate CSS, compile Tailwind, run Tailwind, or create production/development stylesheets for a Hyvä theme. Triggers on phrases like "compile tailwind", "build styles", "generate css", "run tailwind", "build css", or "npm build for theme".
---

# Compile Tailwind CSS for Hyvä Themes

Compiles Tailwind CSS for Hyvä themes in Magento 2. Handles both production builds and development watch mode.

## Step 1: Detect Environment

Use the `hyva-exec-shell-cmd` skill to detect the environment and determine the appropriate command wrapper.

## Step 2: Identify Theme

If no theme path provided, invoke the `hyva-theme-list` skill to discover available themes. Filter to only include themes in `app/design/frontend/` by default.

**If no themes found:** Inform the user and suggest creating a child theme with `hyva-child-theme`.

## Step 3: Install Dependencies & Build

**Default to production build** unless user explicitly requests "watch" or "live reload".

```bash
# Install deps only if node_modules missing
if [ ! -d "<theme-path>/web/tailwind/node_modules" ]; then
  cd <theme-path>/web/tailwind && npm ci
fi

# Production build (default)
cd <theme-path>/web/tailwind && npm run build

# OR watch mode (only if explicitly requested)
cd <theme-path>/web/tailwind && npm run watch
```

## Step 4: Verify Output

Compiled CSS location: `<theme-path>/web/css/styles.css`

Confirm the file was updated by checking its modification time.

## Troubleshooting

- **Missing node_modules:** Run `npm ci`
- **Outdated styles in production:** Run `bin/magento setup:static-content:deploy`
- **npm install fails:** Check Node version (requires Node 16+), delete `node_modules` and `package-lock.json` then retry
