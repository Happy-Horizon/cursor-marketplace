---
name: hyva-playwright-test
description: Write Playwright tests for Hyvä themes with Alpine.js components. This skill should be used when writing e2e tests, creating page objects, or debugging selector issues in Playwright tests for Hyvä Magento storefronts. Trigger phrases include "write playwright test", "playwright alpine", "test hyva page", "e2e test", "playwright selector".
---

# Writing Playwright Tests for Hyvä + Alpine.js

## Overview

Hyvä replaces Luma's KnockoutJS/RequireJS/jQuery with Alpine.js + Tailwind CSS. Playwright's strict mode (rejects locators matching multiple elements) conflicts with Alpine.js DOM patterns where hidden elements exist throughout the page.

## The #1 Rule: Hidden Alpine Elements

Hyvä templates scatter `x-show` elements throughout the DOM. Always scope page-level messages to the `#messages` container:

```typescript
// WRONG — matches hidden Alpine x-show elements throughout DOM
await expect(page.locator('.message.success')).toContainText('Added to cart');

// RIGHT — scoped to the visible messages container
await expect(page.locator('#messages .message.success')).toContainText('Added to cart');
```

## Selector Strategy

Follow [Playwright's recommended locator priority](https://playwright.dev/docs/locators):

1. **`getByRole()`** — always prefer
2. **`getByLabel()`** — for form controls
3. **`getByText()`** — scoped to a container
4. **`getByPlaceholder()`**, **`getByAltText()`**
5. **`getByTestId()`**
6. **CSS selectors** — last resort, prefer `aria-*` selectors over class-based

## Alpine.js Interaction Patterns

| Pattern | Problem | Solution |
|---------|---------|----------|
| `x-show` hidden elements | Strict mode: multiple matches | Scope to unique container |
| `x-defer="intersect"` | Not initialized until visible | `scrollIntoViewIfNeeded()` before interacting |
| `x-if` (template) | Elements don't exist until condition true | Click trigger first, then query children |
| `x-text` / `x-html` async | Updates asynchronously | Use web-first assertions with timeout |
| `x-show` submenus | Hidden until hover | `hover()` on parent before clicking child |

## Assertions

Always use web-first assertions that auto-wait and retry:

```typescript
// DO — auto-retries
await expect(loc).toBeVisible();
await expect(loc).toContainText('X');

// DON'T — no retry
expect(await loc.isVisible()).toBe(true);
```

For async Alpine.js updates, use extended timeouts — never `waitForTimeout()`:

```typescript
await expect(page.locator('#menu-cart-icon span[x-text="summaryCount"]'))
  .not.toHaveText('0', { timeout: 15_000 });
```

## Hyvä vs Luma Selector Differences

| Element | Hyvä Selector | Luma Selector |
|---------|---------------|---------------|
| Pagination nav | `getByRole('navigation', { name: 'pagination' })` | `ul.pages-items` |
| Cart icon badge | `#menu-cart-icon > span[x-text="summaryCount"]` | `.counter-number` |
| Success message | `#messages .message.success` | `.message-success` |
| Error message | `#messages .message-error, #messages .message.error` | `.message-error` |
| Main menu | `getByRole('navigation', { name: 'Main menu' })` | `nav.navigation` |
| Active page | `[aria-current="page"]` | `<strong>` element |

## References

- Playwright documentation: https://playwright.dev/docs/locators
- Hyvä documentation: https://docs.hyva.io/
