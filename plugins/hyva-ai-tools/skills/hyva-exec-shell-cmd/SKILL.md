---
name: hyva-exec-shell-cmd
description: Utility skill to detect Magento development environment and determine command wrapper. This skill should be used by other skills that need to execute shell commands in the Magento environment. It detects Warden, docker-magento, DDEV, and local environments and provides the appropriate command wrapper.
---

# Execute Shell Commands in Magento Environment

Detects the Magento development environment and provides the appropriate command wrapper for executing shell commands.

## Step 1: Detect Environment

Run from the Magento project root:

```bash
<skill_path>/scripts/detect_env.sh [magento_root_path]
```

Output: `warden`, `docker-magento`, `ddev`, or `local`

## Step 2: Apply Command Wrapper

| Environment | Command Wrapper |
|-------------|-----------------|
| Warden | `warden env exec -T php-fpm bash -c "<command>"` |
| docker-magento | `bin/clinotty bash -c "<command>"` |
| DDEV | `ddev exec <command>` |
| Local | `<command>` (run directly) |

## Examples

```bash
# Warden
warden env exec -T php-fpm bash -c "bin/magento cache:clean"

# docker-magento
bin/clinotty bash -c "bin/magento cache:clean"

# DDEV
ddev exec bin/magento cache:clean

# Local
bin/magento cache:clean
```

## Commands That Do NOT Require Wrapping

Run these on the host system without wrapping:
- `composer` commands
- `git` commands
- `warden` / `ddev` CLI commands
- File operations on the host filesystem
