# Synced vendor skills

Single source of truth for **third-party agent skills** (and shared rules used by the `horizon-frontend-foundations` Cursor plugin).

## Layout

| Path | Purpose |
|------|---------|
| `skills-lock.json` | Lock file for the [`skills` CLI](https://github.com/vercel-labs/skills) |
| `.agents/skills/` | Skill trees installed/updated by `npx skills` (Cursor discovers via the plugin symlink) |
| `rules-frontend-foundations/` | Shared `.mdc` rules symlinked into `plugins/horizon-frontend-foundations/rules/` |

## Add or update skills

From this directory:

```bash
cd synced-vendor-skills
npx skills add <owner/repo> --skill <name> -a cursor -y
npx skills update -y -p
```

Use `npx skills list` to see what is installed. Commit changes to `skills-lock.json` and `.agents/skills/` (or let CI open a PR — see [`.github/workflows/sync-vendor-skills.yml`](../.github/workflows/sync-vendor-skills.yml)).

## Plugin wiring

`plugins/horizon-frontend-foundations/` uses **relative symlinks** into this folder so the marketplace plugin stays in sync without duplicating vendor files in the plugin tree.

## Windows checkouts

This repo uses **git symlinks** from the plugin into this directory. On Windows, ensure symlink support is enabled (`git config core.symlinks true`) or use Developer Mode so links resolve correctly.
