# Horizon Frontend Foundations

Cursor plugin for **shared** frontend stack guidance (Next.js, React, Vercel-oriented practices) used across Horizon client repositories.

Horizon **storefront-specific** rules and skills live in the companion plugin [`horizon-storefront`](../horizon-storefront/).

## How content is wired

Vendor content lives under [`synced-vendor-skills/`](../../synced-vendor-skills/). The plugin does **not** copy those trees; it exposes them with two **relative symlinks** so Cursor sees normal `rules/` and `skills/<name>/` paths:

| Path in plugin | Symlink target |
|----------------|----------------|
| `rules/` | `synced-vendor-skills/rules-frontend-foundations/` |
| `skills/` | `synced-vendor-skills/.agents/skills/` (entire tree — new `npx skills` installs show up automatically) |

Those symlinks are **committed in git**; adding or updating vendor skills does not change them. To **repair** broken links (e.g. checkout without symlink support), from the repo root:

```bash
cd plugins/horizon-frontend-foundations
ln -sfn ../../synced-vendor-skills/rules-frontend-foundations rules
ln -sfn ../../synced-vendor-skills/.agents/skills skills
```

Edit shared rules in `synced-vendor-skills/rules-frontend-foundations/`; manage vendor skill bodies via `npx skills` in `synced-vendor-skills/` as usual.

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

Replace the query and the `owner/repo@skill` string with whatever `find` prints for the skill you want. No symlink steps are needed for new skills — `skills/` already points at the whole `.agents/skills/` tree.

**Local refresh only** (mirror CI before you commit, no PR):

```bash
cd synced-vendor-skills
npx skills update -y -p
cd ..
bash scripts/prune-synced-vendor-agent-skills.sh
```
