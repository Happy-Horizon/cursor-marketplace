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

```bash
cd synced-vendor-skills
npx skills update -y -p
```

CI can run the same command on a schedule; see the repo workflow `sync-vendor-skills.yml`.
