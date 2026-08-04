# Hyvä AI Tools

Cursor plugin packaging the official [hyva-themes/hyva-ai-tools](https://github.com/hyva-themes/hyva-ai-tools)
skills for Magento 2 development with Hyvä Theme.

## Provenance

The `skills/` directory is a **verbatim copy** of upstream and should not be edited here — changes
belong upstream, or in a separate Happy Horizon plugin that complements these skills.

| | |
|---|---|
| Upstream | https://github.com/hyva-themes/hyva-ai-tools |
| Synced commit | `a28a333` (2026-07-31) |
| License | OSL-3.0 — see `LICENSE.txt` and `COPYING.txt` |

### Re-syncing

```bash
git clone --depth 1 https://github.com/hyva-themes/hyva-ai-tools.git /tmp/hyva-upstream
rm -rf plugins/hyva-ai-tools/skills
cp -R /tmp/hyva-upstream/skills plugins/hyva-ai-tools/skills
cp /tmp/hyva-upstream/LICENSE.txt /tmp/hyva-upstream/COPYING.txt plugins/hyva-ai-tools/
git -C /tmp/hyva-upstream log -1 --format='%h %cd' --date=short   # update the table above
```

Copy the whole `skills/` tree, not just the `SKILL.md` files: several skills execute scripts and read
reference docs from their own directory, so a partial copy leaves them broken at runtime.

Upstream's `install.sh`, `install-hyva-skill.sh` and `SECURITY.md` are intentionally not vendored —
they install skills into a home directory, which the plugin mechanism already handles.

## Skills

| Skill | Purpose |
|---|---|
| `hyva-alpine-component` | CSP-compatible Alpine.js components |
| `hyva-child-theme` | Create a Hyvä child theme |
| `hyva-cms-component` | Create custom Hyvä CMS components |
| `hyva-cms-components-dump` | Dump CMS components from active modules |
| `hyva-cms-custom-field` | Custom field types and handlers for CMS components |
| `hyva-compile-tailwind-css` | Compile Tailwind CSS for a theme |
| `hyva-create-module` | Scaffold a Magento 2 module in `app/code/` |
| `hyva-exec-shell-cmd` | Detect the dev environment and wrap shell commands |
| `hyva-playwright-test` | Playwright tests for Hyvä + Alpine |
| `hyva-render-media-image` | Responsive images via the Media view model |
| `hyva-tailwind-include-exclude` | Manage `include` / `exclude` in `hyva.config.json` |
| `hyva-theme-list` | List Hyvä theme paths in a project |
| `hyva-ui-component` | Apply Hyvä UI template components |

Several skills declare `requires:` and invoke each other — `hyva-exec-shell-cmd` and `hyva-theme-list`
are shared building blocks, so keep the full set installed rather than cherry-picking.

## Usage

Skills activate from natural requests inside a Magento 2 project, e.g. "create a Hyvä child theme",
"compile tailwind", "styles are missing", "add a CMS component", "exclude this module from Tailwind".
Run them from the Magento project root; the environment detection skill resolves Docker, Warden, DDEV
and native setups.
