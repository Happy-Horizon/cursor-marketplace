---
name: hyva-render-media-image
description: Generate responsive image code for Hyvä Theme templates using the Media view model. This skill should be used when the user wants to render images in a Hyvä template, create responsive picture elements, add hero images, product images, or any image that needs responsive breakpoints. Trigger phrases include "render image", "add image to template", "responsive image", "picture element", "hero image", "responsive banner", "image for mobile and desktop", or "banner image".
---

# Hyvä Render Image

Generate responsive `<picture>` elements for Hyvä Theme templates using the `\Hyva\Theme\ViewModel\Media` view model.

## When to Use

- Adding images to Hyvä PHTML templates
- Creating responsive images with different sources for mobile/desktop
- Implementing hero banners, product images, or CMS content images
- Optimizing images for Core Web Vitals (LCP, CLS)

## Workflow

### 1. Gather Image Requirements

Ask for:
1. **Image path(s)** — Location in `pub/media/` (e.g., `wysiwyg/hero.jpg`)
2. **Image dimensions** — Width and height in pixels
3. **Responsive requirements** — Different images for mobile vs desktop?
4. **Image purpose** — Hero/LCP image (eager loading) or below-fold (lazy loading)?
5. **Alt text** — Meaningful description for accessibility

### 2. Generate the Code

**Base template:**

```php
<?php
/** @var \Hyva\Theme\ViewModel\Media $mediaViewModel */
$mediaViewModel = $viewModels->require(\Hyva\Theme\ViewModel\Media::class);

echo $mediaViewModel->getResponsivePictureHtml(
    $images,           // Array of image configs
    $imgAttributes,    // Optional: alt, class, loading, fetchpriority
    $pictureAttributes // Optional: class, data-* attributes for <picture>
);
```

**Choose the appropriate pattern:**

| Scenario | Pattern |
|----------|---------|
| Single image, literal values | Single Image Example |
| Single image from variable | Wrap in array: `[$imageData]` |
| Multiple images from variable | Pass directly: `$images` |
| Different images for mobile/desktop | Responsive Images with Media Queries |

### 3. Set Loading Strategy

| Image Type | Attributes |
|------------|------------|
| Hero/LCP (above fold) | `'loading' => 'eager', 'fetchpriority' => 'high'` |
| Below fold | `'loading' => 'lazy'` |

## Single Image Example

```php
<?php
$mediaViewModel = $viewModels->require(\Hyva\Theme\ViewModel\Media::class);

$images = [
    [
        'src'    => 'wysiwyg/banner.jpg',
        'width'  => 1440,
        'height' => 600,
    ]
];

echo $mediaViewModel->getResponsivePictureHtml(
    $images,
    ['alt' => 'Banner', 'class' => 'w-full h-auto', 'loading' => 'lazy']
);
?>
```

## Responsive Images with Media Queries

```php
<?php
$images = [
    [
        'src'    => 'wysiwyg/hero-mobile.jpg',
        'width'  => 768,
        'height' => 500,
        'media'  => '(max-width: 767px)',
    ],
    [
        'src'    => 'wysiwyg/hero-desktop.jpg',
        'width'  => 1440,
        'height' => 600,
        'media'  => '(min-width: 768px)',
    ],
];

echo $mediaViewModel->getResponsivePictureHtml(
    $images,
    ['alt' => 'Hero Banner', 'loading' => 'eager', 'fetchpriority' => 'high']
);
?>
```

## Using with CMS Component Data

```php
$image = $block->getData('image');

if ($image) {
    echo $mediaViewModel->getResponsivePictureHtml(
        $image,
        ['class' => 'w-full h-auto', 'loading' => 'lazy']
    );
}
```
