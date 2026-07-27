# Classic Frontend Stack — Steps 5+

Use after shared steps 1–4 when Frontend Stack = **Classic**.

## Checklist

- [ ] SCSS in `app/code/{Vendor}/Components/view/frontend/styles/modules/_{name}.scss` + import in `_module.scss`
- [ ] Theme imports module styles via `{Theme path}/styles/_modules.scss`
- [ ] Optional: static preview args in `example_components.xml`
- [ ] Optional: JS in `view/frontend/web/js/` + `data-mage-init`
- [ ] CSS compiled (frontools / project build)

## Step 5 — Styles (SCSS)

Presentation templates use BEM-style classes: `{name}-block-{element}` (e.g. `advice-block-container`).

1. Create `app/code/{Vendor}/Components/view/frontend/styles/modules/_{name}.scss`
2. Add `@import "modules/{name}";` to `_module.scss`
3. Theme imports via `{Theme path}/styles/_modules.scss` → `@import '../{Vendor}_Components/styles/module';`
4. Compile theme CSS (frontools / project build — inspect sibling components or project README for exact command)

Use existing SCSS mixins (`min-screen`, color vars). Nest under `.{name}-block`.

## Step 6 — Static preview (optional)

Add block + arguments to `example_components.xml` for CMS/page preview without product context.

## Step 7 — JavaScript (optional)

Only when component needs interactivity:

- Place JS in `view/frontend/web/js/{name}.js`
- Init via `data-mage-init='{"{Vendor}_Components/js/{name}": {}}'` on root element

## Step 8 — Build

Ask user before compiling unless a watcher is already running.

Run the project's SCSS/CSS build (commonly frontools or npm script — check project docs). Verify compiled CSS updated in theme output.
