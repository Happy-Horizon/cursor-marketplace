---
name: create-frontend-component
description: Build storefront UI components using the two-layer pattern in a vendor Components module (presentation) plus theme wrappers (data). Works on Classic (SCSS, data-mage-init) and Hyvä (Tailwind, Alpine.js) frontends — auto-detects stack from active theme. Use when creating a frontend component, adding a product page block, new Components template, or wiring catalog_product_view layout.
---

# Create Frontend Component

Two-layer pattern: **presentation** in `{Vendor}_Components`, **data wiring** in theme.

```
Product attribute → theme wrapper → setData() → {Vendor}_Components template → HTML
```

## Step 0 — Resolve context (always first)

Run before any file paths or module refs. Use `hyva-exec-shell-cmd` for shell commands (`bin/magento`, etc.).

### 0a. Resolve `{Vendor}` (PascalCase, e.g. `HappyHorizon`)

1. User stated vendor → use it.
2. Else scan `app/code/` for `{Vendor}/Components` module.
3. Else derive from active theme path (step 0b).
4. Ambiguous → ask user.

### 0b. Resolve `{Theme}` and theme path

1. Read active storefront theme via `bin/magento config:show design/theme/theme_id` (map ID → `app/design/frontend/{Vendor}/{Theme}/`).
2. Fallback: if only one dir under `app/design/frontend/{Vendor}/`, use it.
3. Still ambiguous → invoke `hyva-theme-list`, show output, ask user which theme.

Theme path: `app/design/frontend/{Vendor}/{Theme}/`

### 0c. Detect Frontend Stack

On resolved theme path:

| Signal | Stack |
|--------|-------|
| `web/tailwind/package.json` exists | **Hyvä** |
| Otherwise | **Classic** |

If theme path cannot be resolved → invoke `hyva-theme-list`, show output, ask user: Classic or Hyvä.

Record stack for steps 5+. Read `references/{stack}-path.md` where `{stack}` is `classic` or `hyva`.

### Derived placeholders

| Placeholder | Example (HappyHorizon, theme=default) |
|-------------|----------------------------------------|
| Module | `HappyHorizon_Components` |
| Module path | `app/code/HappyHorizon/Components/` |
| Theme path | `app/design/frontend/HappyHorizon/default/` |
| Asset ref | `HappyHorizon_Components::images/{file}` |
| JS ref (Classic) | `HappyHorizon_Components/js/{name}` |

Reference implementation: `advice` in `{Vendor}_Components` + theme wrapper.

## Checklist (shared)

- [ ] Step 0 complete: `{Vendor}`, `{Theme}`, Frontend Stack resolved
- [ ] Presentation template in `app/code/{Vendor}/Components/view/frontend/templates/{name}.phtml`
- [ ] Block registered in `app/code/{Vendor}/Components/view/frontend/layout/catalog_product_view.xml`
- [ ] Theme wrapper in `{Theme path}/Magento_Catalog/templates/product/view/components/{name}.phtml`
- [ ] Loader block in product-type layout XML (configurable, bundle, elearning, etc.)
- [ ] Stack-specific steps from `references/{stack}-path.md`

## Step 1 — Presentation template (module)

Path: `app/code/{Vendor}/Components/view/frontend/templates/{name}.phtml`

Rules:
- Pure UI. No product/content-block logic.
- Read data via `$block->getData('key')`.
- Use `$escaper` for output (`escapeHtml`, `escapeUrl`, `escapeHtmlAttr`).
- HTML content fields: `/* @noEscape */` only when CMS HTML expected.
- Default assets: `$block->getViewFileUrl('{Vendor}_Components::images/{file}')`.
- Styling: follow active stack — see `references/{stack}-path.md` (Classic: BEM classes; Hyvä: Tailwind utilities).

```php
<?php
/** @var \Magento\Framework\View\Element\Template $block */
/** @var \Magento\Framework\Escaper $escaper */

$description = $block->getData('description');
$image = $block->getData('image') ?? $block->getViewFileUrl('HappyHorizon_Components::images/advice.jpg');
?>
<!-- Classic: class="advice-block-container" | Hyvä: Tailwind utility classes -->
<div>
    ...
</div>
```

## Step 2 — Register component block (module layout)

Path: `app/code/{Vendor}/Components/view/frontend/layout/catalog_product_view.xml`

Add named block (not rendered until wrapper calls `toHtml()`):

```xml
<block name="product.{name}.block" template="{Vendor}_Components::{name}.phtml"/>
```

Block name pattern: `product.{name}.block`.

## Step 3 — Theme wrapper (data layer)

Path: `{Theme path}/Magento_Catalog/templates/product/view/components/{name}.phtml`

Pattern:
1. Load content-block ViewModel via `$viewModels->require(...)` — **inspect sibling wrappers** for project-specific ViewModelRegistry class and ViewModel.
2. Read product attribute (comma-separated content block IDs).
3. Early `return` if attribute empty or no blocks found.
4. Map content block fields → array for component.
5. Get layout block by name, `setData()`, `echo toHtml()`.

On Hyvä: loader block class may differ from `Magento\Catalog\Block\Product\View\Description` — copy from existing wrappers in the same theme directory.

```php
<?php
/** @var \Magento\Catalog\Block\Product\View\Description $block */
/** @var \HappyHorizon\ViewModelRegistry\Model\ViewModelRegistry $viewModels */

$viewModel = $viewModels->require(HappyHorizon\ContentBlockAttributes\ViewModel\ContentBlock::class);
$product = $block->getProduct();
$ids = $product->getProductAdviceBlocks();

if (!$ids) {
    return;
}

$blocks = $viewModel->getContentBlocksByIds(explode(',', $ids));
if ($blocks->getSize() === 0) {
    return;
}

$component = $block->getLayout()->getBlock('product.advice.block');
$item = $blocks->getFirstItem();

if ($component && $item) {
    $component->setData([
        'description' => $item->getData('description'),
        'image' => $item->getData('image') ?? null,
        'icon' => $item->getData('icon') ?? null,
        'alt' => $item->getData('image_alt') ?? null,
    ]);
    echo $component->toHtml();
}
```

For list data (reviews, usps): loop blocks, build array, pass to component.

Copy patterns from existing wrappers in same directory before writing new one.

## Step 4 — Wire loader block (theme layout)

Path: `{Theme path}/Magento_Catalog/layout/catalog_product_view_type_{type}.xml`

Add loader inside target container:

```xml
<block
    class="Magento\Catalog\Block\Product\View\Description"
    name="load.product.{name}.block"
    template="Magento_Catalog::product/view/components/{name}.phtml"
/>
```

Common containers:
- `product.usps.fullwidth.container` — full-width USPs
- `product.static.content.container` — advice, reviews, image list

Add loader to every product type layout that needs the component (configurable, bundle, elearning).

## Steps 5+ — Stack-specific

After steps 1–4, read and follow **`references/{stack}-path.md`**:

| Stack | Reference file | Covers |
|-------|----------------|--------|
| Classic | `references/classic-path.md` | SCSS, static preview, RequireJS |
| Hyvä | `references/hyva-path.md` | Tailwind `@source`, Alpine.js, compile |

## Naming reference

| Item | Pattern | Example (Vendor=HappyHorizon) |
|------|---------|-------------------------------|
| Component block | `product.{name}.block` | `product.advice.block` |
| Loader block | `load.product.{name}.block` | `load.product.advice.block` |
| Module template | `{Vendor}_Components::{name}.phtml` | `HappyHorizon_Components::advice.phtml` |
| Theme wrapper | `Magento_Catalog::product/view/components/{name}.phtml` | `.../advice.phtml` |
| CSS root (Classic) | `{name}-block-container` | `advice-block-container` |

## Reference components ({Vendor}=HappyHorizon)

Inspect these before creating new ones:

| Component | Module template | Product attribute |
|-----------|-----------------|-------------------|
| advice | `advice.phtml` | `product_advice_blocks` → `getProductAdviceBlocks()` |
| usps | `usps.phtml` | `product_usps` → `getProductUsps()` |
| reviews | `reviews.phtml` | `product_review_blocks` → `getProductReviewBlocks()` |
| image_list | `image_list.phtml` | `product_image_blocks` → `getProductImageBlocks()` |
| faq | `faq.phtml` | inline / content block |
| person-box | `person-box.phtml` | nested in other blocks |

## Do not

- Put product/content-block logic in `{Vendor}_Components` templates.
- Render component block directly in theme layout without wrapper (skips data + early return).
- Forget escaper on user/CMS output.
- Skip product-type layout files — component won't show on all types.
- Hardcode vendor or theme — always resolve `{Vendor}` and `{Theme}` first.
- Skip stack detection — Classic and Hyvä styling/JS paths differ.
