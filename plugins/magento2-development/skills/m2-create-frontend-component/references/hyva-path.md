# Hyvä Frontend Stack — Steps 5+

Use after shared steps 1–4 when Frontend Stack = **Hyvä**.

## Checklist

- [ ] Tailwind utility classes in module presentation template (no SCSS file)
- [ ] Module template path added to theme Tailwind `@source`
- [ ] Optional: inline Alpine.js for simple interactivity
- [ ] Optional: complex interactivity via `hyva-alpine-component` skill
- [ ] Tailwind compiled via `hyva-compile-tailwind-css` (ask user first)

## Step 5 — Styles (Tailwind utilities)

Apply Tailwind utility classes directly in the module presentation template. No separate SCSS/CSS file per component.

```php
<div class="flex flex-col gap-4 p-6 bg-white rounded-lg">
    <h2 class="text-xl font-semibold text-gray-900">
        <?= $escaper->escapeHtml($title) ?>
    </h2>
    ...
</div>
```

### Register module templates with Tailwind

Add the Components module template path to the active theme's Tailwind config so utilities are not purged. In `{Theme path}/web/tailwind/tailwind-source.css` (or equivalent theme entry file), add:

```css
@source "../../../../../../code/{Vendor}/Components/view/frontend/templates/**/*.phtml";
```

Adjust relative path if module lives outside `app/code/`. Inspect existing `@source` lines in the theme file and match that pattern.

## Step 6 — Static preview (optional)

Add block + arguments to `example_components.xml` for CMS/page preview without product context — same as Classic path if the project uses this file.

## Step 7 — JavaScript (optional)

Only when component needs interactivity.

### Simple interactivity — inline Alpine.js

For toggles, accordions, small DOM updates: add Alpine directly in the presentation template. Use CSP-compatible patterns (methods for mutations, not inline expressions with assignments).

See `hyva-alpine-component` skill for the full CSP-safe component structure (`x-data`, `Alpine.data()`, `$hyvaCsp->registerInlineScript()`).

### Complex / reusable interactivity

Invoke the **`hyva-alpine-component`** skill when logic is stateful, reused across templates, or needs CSP registration beyond a few lines.

Do **not** use `data-mage-init` or RequireJS on the Hyvä path.

## Step 8 — Build

Ask user before compiling unless a Tailwind watcher is already running.

Invoke the **`hyva-compile-tailwind-css`** skill with the resolved `{Theme path}`. Verify `{Theme path}/web/css/styles.css` updated.
