---
name: create-frontend-component
description: Build storefront UI components using the two-layer pattern in a vendor Components module (presentation) plus theme wrappers (data). Use when creating a frontend component, adding a product page block, new Components template, or wiring catalog_product_view layout.
---

# Create Frontend Component

Two-layer pattern: **presentation** in `{Vendor}_Components`, **data wiring** in theme.

```
Product attribute → theme wrapper → setData() → {Vendor}_Components template → HTML
```

## Before you start — resolve vendor

Determine `{Vendor}` (PascalCase, e.g. `HappyHorizon`) before any paths or module refs.

1. User stated vendor → use it.
2. Else scan `app/code/` for `{Vendor}/Components` module.
3. Else read active theme path `app/design/frontend/{Vendor}/` via theme config or `hyva-theme-list`.
4. Ambiguous → ask user.

Derived values (replace `{Vendor}` everywhere):

| Placeholder | Example (HappyHorizon) |
|-------------|------------------------|
| Module | `HappyHorizon_Components` |
| Module path | `app/code/HappyHorizon/Components/` |
| Theme path | `app/design/frontend/HappyHorizon/default/` |
| Asset ref | `HappyHorizon_Components::images/{file}` |
| JS ref | `HappyHorizon_Components/js/{name}` |

Reference implementation: `advice` in `{Vendor}_Components` + theme wrapper.

## Checklist

- [ ] Presentation template in `app/code/{Vendor}/Components/view/frontend/templates/{name}.phtml`
- [ ] Block registered in `app/code/{Vendor}/Components/view/frontend/layout/catalog_product_view.xml`
- [ ] Theme wrapper in `app/design/frontend/{Vendor}/default/Magento_Catalog/templates/product/view/components/{name}.phtml`
- [ ] Loader block in product-type layout XML (configurable, bundle, elearning, etc.)
- [ ] SCSS in `app/code/{Vendor}/Components/view/frontend/styles/modules/_{name}.scss` + import in `_module.scss`
- [ ] Optional: static preview args in `example_components.xml`
- [ ] Optional: JS in `view/frontend/web/js/` + `data-mage-init`

## Step 1 — Presentation template (module)

Path: `app/code/{Vendor}/Components/view/frontend/templates/{name}.phtml`

Rules:
- Pure UI. No product/content-block logic.
- Read data via `$block->getData('key')`.
- Use `$escaper` for output (`escapeHtml`, `escapeUrl`, `escapeHtmlAttr`).
- HTML content fields: `/* @noEscape */` only when CMS HTML expected.
- Default assets: `$block->getViewFileUrl('{Vendor}_Components::images/{file}')`.
- CSS classes: `{name}-block-{element}` (e.g. `advice-block-container`).

```php
<?php
/** @var \Magento\Framework\View\Element\Template $block */

$description = $block->getData('description');
$image = $block->getData('image') ?? $block->getViewFileUrl('HappyHorizon_Components::images/advice.jpg');
?>
<div class="advice-block-container">
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

Path: `app/design/frontend/{Vendor}/default/Magento_Catalog/templates/product/view/components/{name}.phtml`

Pattern:
1. Load content-block ViewModel via `$viewModels->require(...)` (project-specific class — inspect sibling wrappers).
2. Read product attribute (comma-separated content block IDs).
3. Early `return` if attribute empty or no blocks found.
4. Map content block fields → array for component.
5. Get layout block by name, `setData()`, `echo toHtml()`.

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

Path: `app/design/frontend/{Vendor}/default/Magento_Catalog/layout/catalog_product_view_type_{type}.xml`

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

## Step 5 — Styles

1. Create `app/code/{Vendor}/Components/view/frontend/styles/modules/_{name}.scss`
2. Add `@import "modules/{name}";` to `_module.scss`
3. Theme imports via `app/design/frontend/{Vendor}/default/styles/_modules.scss` → `@import '../{Vendor}_Components/styles/module';`
4. Compile theme CSS (frontools / project build)

Use existing SCSS mixins (`min-screen`, color vars). Nest under `.{name}-block`.

## Step 6 — Static preview (optional)

Add block + arguments to `example_components.xml` for CMS/page preview without product context.

## Step 7 — JavaScript (optional)

Only when component needs interactivity:
- Place JS in `view/frontend/web/js/{name}.js`
- Init via `data-mage-init='{"{Vendor}_Components/js/{name}": {}}'` on root element

## Naming reference

| Item | Pattern | Example (Vendor=HappyHorizon) |
|------|---------|-------------------------------|
| Component block | `product.{name}.block` | `product.advice.block` |
| Loader block | `load.product.{name}.block` | `load.product.advice.block` |
| Module template | `{Vendor}_Components::{name}.phtml` | `HappyHorizon_Components::advice.phtml` |
| Theme wrapper | `Magento_Catalog::product/view/components/{name}.phtml` | `.../advice.phtml` |
| CSS root | `{name}-block-container` | `advice-block-container` |

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
- Hardcode vendor — always resolve `{Vendor}` first.
