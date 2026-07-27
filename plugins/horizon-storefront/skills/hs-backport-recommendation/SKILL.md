---
name: hs-backport-recommendation
description: Analyze client project theme overwrites and customizations to identify fixes, improvements, and patterns that should be backported to the Horizon Storefront core packages. Use when reviewing client projects, during code audits, or when the user asks to identify contributions from a client project back to core.
---

# Backport Recommendation

Analyzes client project customizations (theme overwrites, custom hooks, helpers, patches) to identify fixes and improvements that would benefit the Horizon Storefront core packages. This is NOT part of the upgrade process — it's a separate analysis skill.

## When to Use

- During client project code reviews or audits
- After completing a client project upgrade (good time to review what changed)
- When a developer asks "is anything here useful for core?"
- Periodically to harvest improvements from client implementations
- When a client reports a bug that turns out to be a core issue

## Analysis Checklist

```
Backport Analysis Progress:
- [ ] Map the theme overwrite structure
- [ ] Classify each overwrite (styling / functional / bug fix / feature)
- [ ] Identify bug fixes that should be in core
- [ ] Identify features that are generic enough for core
- [ ] Identify patterns that appear across multiple client projects
- [ ] Generate backport recommendations with priority
```

## Workflow

### Step 1: Map the Theme Overwrite Structure

Understand the project's theme directory. In a client project, theme overwrites live in:

```
apps/<project>/src/theme/<theme-name>/
├── ui/                    # UI component overwrites
│   ├── components/        # Component-level overwrites
│   ├── context/           # Context provider overwrites
│   ├── dataLayer/         # Analytics/tracking overwrites
│   ├── helpers/           # Helper function overwrites
│   ├── hooks/             # Hook overwrites
│   ├── pages/             # Page-level overwrites
│   └── types/             # Type overwrites
├── components/            # Custom components (not overwrites)
├── helpers/               # Custom helpers
├── hooks/                 # Custom hooks
├── styles/                # Global style overwrites
│   ├── variables.scss     # Variable overwrites
│   └── globals.scss       # Global style overwrites
└── translations/          # Translation overwrites
```

**Key distinction:**
- Files in `ui/` are **overwrites** of `@happyhorizon/ui` components
- Files outside `ui/` are **custom additions** specific to this project

### Step 2: Classify Each Overwrite

For each overwrite file, determine its **overwrite pattern**:

| Pattern | Description | Backport Potential |
|---|---|---|
| **Re-export + extend** | `export * from '@parent/...'` then adds new exports | Medium — the extension may be generic |
| **Wrapper/decorator** | Imports parent function, wraps with extra logic | High — if the extra logic fixes a bug or adds common functionality |
| **Object spread + override** | Spreads parent object, overrides specific keys | Medium — check if overrides fix issues |
| **Complete replacement** | No parent import, fully custom implementation | Low for backport, but HIGH for identifying core deficiencies |
| **Style-only** | Only `.scss` files, no `.tsx` changes | Low — usually project-specific branding |

### Step 3: Identify Backport Candidates

Look for these patterns that indicate something should be in core:

#### Category A: Bug Fixes (High Priority)

Signs that an overwrite is fixing a core bug:

1. **Defensive null checks added**:
```typescript
// Client adds null check that parent doesn't have
const value = item?.price?.amount ?? 0;  // Parent had: item.price.amount
```

2. **Edge case handling**:
```typescript
// Client handles empty arrays, undefined values, race conditions
if (!items || items.length === 0) return null;  // Parent assumed items exist
```

3. **DOM/browser compatibility fixes**:
```typescript
// Client patches DOM methods for Google Translate, Safari, etc.
// These are browser bugs that affect ALL projects
```

4. **Type fixes**:
```typescript
// Client fixes TypeScript types that are wrong in core
type CorrectType = string | null;  // Parent had: type WrongType = string
```

**How to verify**: Does this fix a bug that would affect other projects using the same core package?

#### Category B: Generic Features (Medium Priority)

Signs that a custom feature belongs in core:

1. **Re-used across multiple client projects**: If the same pattern appears in 3+ clients, it's generic enough
2. **Extends core functionality logically**: e.g. adding a new form field type, a new payment method hook
3. **No project-specific business logic**: The feature works without project-specific configuration
4. **Fills a gap in core**: Something that most e-commerce stores need but core doesn't provide

Examples:
- EU VAT validation (if multiple EU clients need it)
- Address autocomplete patterns
- Generic analytics wrappers (dataLayer dispatch extensions)
- Accessibility improvements
- Performance optimizations (memoization, lazy loading patterns)

#### Category C: Pattern Improvements (Low Priority)

Better ways of doing things that core could adopt:

1. **Better error handling patterns**
2. **Better TypeScript typing**
3. **Better component composition**
4. **Better hook abstractions**
5. **Better SCSS variable organization**

#### Category D: Not for Backport

Skip these — they are project-specific:

1. **Business logic** (custom pricing rules, specific checkout flows)
2. **Brand-specific styling** (colors, fonts, layouts)
3. **Third-party integrations** (SharpSpring, Tweakwise, specific payment providers)
4. **URL/routing rules** specific to the project
5. **Translation content**
6. **Environment-specific configuration**

### Step 4: Deep Analysis of Candidates

For each backport candidate, gather:

#### Overwrite Analysis Template

```
## Backport Candidate: <component/file name>
- **Source project**: <client project name>
- **File(s)**: <path to overwrite file(s)>
- **Overwrite pattern**: Re-export+extend / Wrapper / Complete replacement
- **Category**: Bug fix / Generic feature / Pattern improvement
- **Priority**: High / Medium / Low

### What it does
<description of the change>

### Why it should be in core
<reasoning — who else would benefit?>

### Core package affected
<which @happyhorizon/* package would this go into>

### Proposed implementation
<how to implement in core — as a fix, new prop, new hook, config option, etc.>

### Breaking change risk
None / Minor (new optional prop) / Major (API change)

### Related client projects
<list other clients with similar overwrites, if known>
```

### Step 5: Analyze Overwrite Patterns Systematically

Use this systematic approach to scan a project:

#### 5a: Find Functional Overwrites (not just style changes)

Search for `.tsx` and `.ts` files in the theme directory that import from `@parent/*`:

```
# These are overwrites that modify behavior, not just add new components
```

Files that import from `@parent/*` are modifying existing core behavior. Files that don't are purely additive.

#### 5b: Identify Wrapper/Decorator Patterns

Look for patterns like:

```typescript
import { originalFunction } from '@parent/...';

export function wrappedFunction(...args) {
    // Pre-processing
    const result = originalFunction(...args);
    // Post-processing
    return result;
}
```

These wrappers often indicate missing extension points in core.

#### 5c: Identify Complete Replacements

Files that don't import from `@parent/*` at all are complete replacements. Ask: **why was the parent component completely replaced?**

- If for styling → not a backport candidate
- If for functionality → the core component may be too rigid
- If for bug fixing → the core component has a bug

#### 5d: Look for Repeated Patterns Across Files

If multiple overwrites follow the same pattern (e.g. adding null checks, adding loading states, fixing accessibility), that's a systemic issue in core.

### Step 6: Generate Recommendations Report

Output a prioritized list:

```
# Backport Recommendations: <Project Name>

## High Priority (Bug Fixes)
1. <description> — affects: <core package>
2. ...

## Medium Priority (Generic Features)
1. <description> — affects: <core package>
2. ...

## Low Priority (Pattern Improvements)
1. <description> — affects: <core package>
2. ...

## Core Deficiency Notes
- <observations about why so many overwrites exist>
- <suggestions for making core more extensible>

## Statistics
- Total theme overwrite files: X
- Functional overwrites (TSX/TS): Y
- Style-only overwrites (SCSS): Z
- Backport candidates identified: N
  - High priority: A
  - Medium priority: B
  - Low priority: C
```

## Tips for Effective Analysis

1. **Start with the `ui/components/` directory** — this is where most functional overwrites live
2. **Check `helpers/` and `hooks/` next** — these often contain generic utilities
3. **Compare overwrite file size to parent** — if an overwrite is 95% identical to parent with one small fix, that's likely a bug fix
4. **Look at git blame** — recent changes may have been bug fixes during development
5. **Check if similar overwrites exist in other client projects** — if the same component is overwritten in 3+ clients, core needs improving
6. **Don't over-recommend** — only recommend backports that genuinely improve core for ALL projects, not just one

## Integration with Other Skills

- **During upgrades** (`hs-core-upgrade/SKILL.md`): Good time to analyze overwrites while already reviewing client code
- **During patch validation** (`hs-patch-validation/SKILL.md`): Patches often reveal core bugs that should be backported as fixes
- **Not part of the upgrade path**: This analysis produces recommendations, not upgrade steps. Backporting is a separate workflow that happens in the monorepo.

## Backport Implementation Workflow (in Monorepo)

Once candidates are identified, the actual backport happens in the Horizon Storefront monorepo:

1. Create a feature branch in the monorepo
2. Implement the fix/feature in the appropriate `packages/*` directory
3. Add tests if applicable
4. Update CHANGELOG.md
5. Create a PR with the backport recommendation as context
6. After merge and publish, the client project can remove the theme overwrite

This keeps the analysis (this skill) separate from the implementation (monorepo development).
