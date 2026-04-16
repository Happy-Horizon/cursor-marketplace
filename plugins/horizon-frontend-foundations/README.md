# Horizon Frontend Foundations

Cursor plugin for **shared** frontend stack guidance (Next.js, React, Vercel-oriented practices) used across Horizon client repositories.

Horizon **storefront-specific** rules and skills live in the companion plugin [`horizon-storefront`](../horizon-storefront/).

## How content is wired

- **`rules/`** — symlink to `synced-vendor-skills/rules-frontend-foundations/` (edit rules there).
- **`skills/*`** — symlinks into `synced-vendor-skills/.agents/skills/` (managed with [`npx skills`](https://github.com/vercel-labs/skills) from that directory).

This avoids duplicating vendor skill bodies inside the plugin folder while keeping one git-tracked source under `synced-vendor-skills/`.

## Client projects

Enable **both** plugins from this marketplace in Cursor settings, for example:

- `horizon-frontend-foundations` — shared vendor stack
- `horizon-storefront` — Happy Horizon storefront conventions

Keep **client-only** rules and skills in that repo’s project-level `.cursor` tree.

## Refresh vendor skills

**Preferred:** run the GitHub Action [Sync vendor skills](https://github.com/Happy-Horizon/cursor-marketplace/actions/workflows/sync-vendor-skills.yml) (workflow dispatch). It runs `npx skills update -y -p` in `synced-vendor-skills/`, prunes agent skill links, and opens a PR when the lockfile or skills change. A schedule also runs it daily.

**Adding a new skill:** search by name, then install using the full package and skill id from the results:

```bash
cd synced-vendor-skills
npx skills find next-upgrade
npx skills install -p -y vercel-labs/next-skills@next-upgrade
```

Replace the query and the `owner/repo@skill` string with whatever `find` prints for the skill you want.

**Local refresh only** (same as CI, no PR):

```bash
cd synced-vendor-skills
npx skills update -y -p
```
