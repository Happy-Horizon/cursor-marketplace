#!/usr/bin/env node

/**
 * Codemod: Rename @experius-commerce/* to @happyhorizon/* packages
 *
 * Migrates older Horizon Storefront projects from the legacy @experius-commerce
 * package scope to the current @happyhorizon scope.
 *
 * Handles:
 * 1. package.json - dependency names + removes @apollo/client if present
 * 2. .npmrc - registry URL
 * 3. tsconfig.json / tsconfig.template.json - path mappings (keys + values)
 * 4. .prettierrc.js - import order patterns
 * 5. .ts/.tsx/.js/.jsx files - import statements
 * 6. .scss/.css files - @import statements
 * 7. next.config.js / core.config.js - transpile modules and config
 *
 * Usage: node codemod-rename-experius.js <project-root>
 * Example: node codemod-rename-experius.js .
 *
 * Options:
 *   --dry-run    Show what would change without writing files
 */

const fs = require('fs');
const path = require('path');

const projectRoot = process.argv[2];
const dryRun = process.argv.includes('--dry-run');

if (!projectRoot) {
    console.error('Usage: node codemod-rename-experius.js <project-root> [--dry-run]');
    console.error('Example: node codemod-rename-experius.js .');
    process.exit(1);
}

const resolvedRoot = path.resolve(projectRoot);

// ─── Package Name Mapping ────────────────────────────────────────────────────
// Old @experius-commerce/<name> → New @happyhorizon/commerce-<name>
// Note the structural change: scope/name → scope/scope-name

const PACKAGE_RENAMES = {
    // Commerce packages: @experius-commerce/<name> → @happyhorizon/commerce-<name>
    '@experius-commerce/core': '@happyhorizon/commerce-core',
    '@experius-commerce/framework-magento': '@happyhorizon/commerce-framework-magento',
    '@experius-commerce/framework-medusa': '@happyhorizon/commerce-framework-medusa',
    '@experius-commerce/framework-bigcommerce': '@happyhorizon/commerce-framework-bigcommerce',
    '@experius-commerce/types': '@happyhorizon/commerce-types',
    '@experius-commerce/utils': '@happyhorizon/commerce-utils',
    '@experius-commerce/swr': '@happyhorizon/commerce-swr',
    '@experius-commerce/cypress': '@happyhorizon/commerce-cypress',
    '@experius-commerce/router': '@happyhorizon/commerce-router',

    // Framework alias forms (used in tsconfig paths and imports, not actual npm names)
    '@experius-commerce/framework': '@happyhorizon/commerce-framework',
    '@experius-commerce/cms-framework': '@happyhorizon/cms-framework',

    // Storefront app packages
    '@experius-commerce/storefront-app': '@happyhorizon/storefront-app',
    '@experius-commerce/storefront-app-tailwind': '@happyhorizon/storefront-app-tailwind',

    // CMS packages
    '@experius-commerce/cms-framework-storyblok': '@happyhorizon/cms-framework-storyblok',
    '@experius-commerce/cms-framework-payloadcms': '@happyhorizon/cms-framework-payloadcms',

    // UI packages: @experius-ui → @happyhorizon/ui, @experius/ui → @happyhorizon/ui
    '@experius-ui': '@happyhorizon/ui',
    '@experius-ui-tailwind': '@happyhorizon/ui-tailwind',
    '@experius/ui': '@happyhorizon/ui',
    '@experius/ui-tailwind': '@happyhorizon/ui-tailwind',
};

// Import path mapping: old import prefix → new import prefix
// These handle subpath imports like '@happyhorizon/commerce-core/context'
// Sort by specificity: longer/more-specific patterns first to avoid partial matches
const IMPORT_PATH_RENAMES = Object.entries(PACKAGE_RENAMES)
    .sort(([a], [b]) => b.length - a.length)
    .map(([old, newPkg]) => ({
        pattern: new RegExp(escapeRegex(old) + '(/|\'|"|`|$)', 'g'),
        replacement: newPkg + '$1',
        old,
        new: newPkg,
    }));

// Registry URL mapping
const REGISTRY_RENAMES = {
    'npm.experius.nl': 'npm.happyhorizon.dev',
    'registry.experius.nl': 'npm.happyhorizon.dev',
};

// Scope registry mapping
const SCOPE_RENAMES = {
    '@experius-commerce:registry': '@happyhorizon:registry',
    '@experius:registry': '@happyhorizon:registry',
    '@experius-ui:registry': '@happyhorizon:registry',
};

const CODE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
const STYLE_EXTENSIONS = ['.scss', '.css', '.sass', '.less'];
const CONFIG_FILES = [
    'package.json',
    '.npmrc',
    '.yarnrc',
    '.prettierrc.js',
    '.prettierrc.cjs',
    'next.config.js',
    'next.config.mjs',
    'tsconfig.json',
    'tsconfig.template.json',
    'lerna.json',
];

let filesModified = 0;
let totalReplacements = 0;
const changes = [];
const warnings = [];

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function walkDir(dir, callback) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (['node_modules', '.next', '.turbo', '.git', 'dist', 'build', '.cursor'].includes(entry.name)) continue;
            walkDir(fullPath, callback);
        } else {
            callback(fullPath, entry.name);
        }
    }
}

function applyReplacements(content, filePath) {
    let result = content;
    let count = 0;

    for (const rename of IMPORT_PATH_RENAMES) {
        const matches = result.match(rename.pattern);
        if (matches) {
            count += matches.length;
            result = result.replace(rename.pattern, rename.replacement);
        }
    }

    return { content: result, count };
}

// ─── Process package.json ────────────────────────────────────────────────────

function processPackageJson(filePath) {
    let content = fs.readFileSync(filePath, 'utf-8');
    const original = content;
    let count = 0;

    try {
        const pkg = JSON.parse(content);
        const sections = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];

        for (const section of sections) {
            if (!pkg[section]) continue;
            const newSection = {};
            for (const [name, version] of Object.entries(pkg[section])) {
                const newName = PACKAGE_RENAMES[name] || name;
                if (newName !== name) {
                    count++;
                }
                newSection[newName] = version;

                // Handle @experius/ packages not in the explicit rename map via catch-all
                if (name !== newName) continue; // already renamed
                if (name.startsWith('@experius/') && !PACKAGE_RENAMES[name]) {
                    // Catch-all: rename @experius/<pkg> → @happyhorizon/<pkg>
                    const catchAllName = name.replace('@experius/', '@happyhorizon/');
                    newSection[catchAllName] = newSection[name];
                    delete newSection[name];
                    count++;
                    warnings.push(`⚠ ${name} in ${section} renamed to ${catchAllName} via catch-all — verify this package exists on the @happyhorizon registry`);
                } else if (name.startsWith('@experius-commerce/') && !PACKAGE_RENAMES[name]) {
                    const catchAllName = name.replace('@experius-commerce/', '@happyhorizon/commerce-');
                    newSection[catchAllName] = newSection[name];
                    delete newSection[name];
                    count++;
                    warnings.push(`⚠ ${name} in ${section} renamed to ${catchAllName} via catch-all — verify this package exists on the @happyhorizon registry`);
                } else if (name.startsWith('@happyhorizon/ui') && !PACKAGE_RENAMES[name]) {
                    warnings.push(`⚠ ${name} in ${section} is not in the rename map — may need manual update`);
                }
            }
            pkg[section] = newSection;
        }

        // Also check "resolutions" section (e.g. "@experius/favicons-webpack-plugin")
        if (pkg.resolutions) {
            const newResolutions = {};
            for (const [name, version] of Object.entries(pkg.resolutions)) {
                let newName = PACKAGE_RENAMES[name] || name;
                // Catch-all for @experius/ scoped packages not in explicit map
                if (newName === name && name.startsWith('@experius/') && !PACKAGE_RENAMES[name]) {
                    newName = name.replace('@experius/', '@happyhorizon/');
                    warnings.push(`⚠ ${name} in resolutions renamed to ${newName} via catch-all — verify this package exists on the @happyhorizon registry`);
                    count++;
                } else if (newName === name && name.startsWith('@experius-commerce/') && !PACKAGE_RENAMES[name]) {
                    newName = name.replace('@experius-commerce/', '@happyhorizon/commerce-');
                    warnings.push(`⚠ ${name} in resolutions renamed to ${newName} via catch-all — verify this package exists on the @happyhorizon registry`);
                    count++;
                } else if (newName !== name) {
                    count++;
                }
                newResolutions[newName] = version;
            }
            pkg.resolutions = newResolutions;
        }

        // Also check "name" field
        if (pkg.name && PACKAGE_RENAMES[pkg.name]) {
            pkg.name = PACKAGE_RENAMES[pkg.name];
            count++;
        }

        // Check transpilePackages array
        if (pkg.transpilePackages && Array.isArray(pkg.transpilePackages)) {
            pkg.transpilePackages = pkg.transpilePackages.map((name) => {
                const newName = PACKAGE_RENAMES[name] || name;
                if (newName !== name) count++;
                // Warn about unmapped @experius packages in transpilePackages
                if (newName === name && (name.startsWith('@experius-commerce/') || name.startsWith('@experius/') || name.startsWith('@happyhorizon/ui'))) {
                    warnings.push(`⚠ ${name} in transpilePackages is not in the rename map — may need manual update`);
                }
                return newName;
            });
        }

        // Remove @apollo/client if present (v2 projects; replaced by graphql-request in v3+)
        for (const section of sections) {
            if (!pkg[section]) continue;
            if (pkg[section]['@apollo/client']) {
                delete pkg[section]['@apollo/client'];
                count++;
                console.log('    ℹ Removed @apollo/client from ' + section + ' (replaced by graphql-request in v3+)');
                // Add graphql-request if not already present
                if (!pkg[section]['graphql-request'] && section === 'dependencies') {
                    pkg[section]['graphql-request'] = '^6.0.0';
                    console.log('    ℹ Added graphql-request to dependencies');
                }
            }
            // Also remove apollo-related packages
            for (const depName of Object.keys(pkg[section])) {
                if (depName.startsWith('@apollo/') || depName === 'apollo-client' || depName === 'apollo-link'
                    || depName === 'apollo-cache-inmemory' || depName === 'apollo3-cache-persist') {
                    delete pkg[section][depName];
                    count++;
                    console.log('    ℹ Removed ' + depName + ' from ' + section);
                }
            }
        }

        // Remove patch-package and postinstall-postinstall (incompatible with Yarn 4)
        for (const section of sections) {
            if (!pkg[section]) continue;
            if (pkg[section]['patch-package']) {
                delete pkg[section]['patch-package'];
                count++;
                console.log('    ℹ Removed patch-package from ' + section + ' (incompatible with Yarn 4; use yarn patch instead)');
            }
            if (pkg[section]['postinstall-postinstall']) {
                delete pkg[section]['postinstall-postinstall'];
                count++;
                console.log('    ℹ Removed postinstall-postinstall from ' + section);
            }
        }
        // Remove patch-package postinstall script if present
        if (pkg.scripts && pkg.scripts.postinstall === 'patch-package') {
            delete pkg.scripts.postinstall;
            count++;
            console.log('    ℹ Removed "postinstall": "patch-package" from scripts');
        }

        // Warn about suspicious dependencies
        for (const section of sections) {
            if (!pkg[section]) continue;
            if (pkg[section]['fs'] === '*') {
                warnings.push(`⚠ "fs": "*" found in ${section} — this is a Node.js built-in and should be removed`);
            }
        }

        // Update author/contributor email domains
        const authorFields = ['author'];
        if (typeof pkg.author === 'string' && pkg.author.includes('@experius.nl')) {
            pkg.author = pkg.author.replace(/@experius\.nl/g, '@happyhorizon.com');
            pkg.author = pkg.author.replace(/experius\.nl/g, 'happyhorizon.com');
            pkg.author = pkg.author.replace(/Experius B\.V\./g, 'Happy Horizon B.V.');
            count++;
        }
        if (Array.isArray(pkg.contributors)) {
            for (const contributor of pkg.contributors) {
                if (contributor.email && contributor.email.includes('@experius.nl')) {
                    contributor.email = contributor.email.replace(/@experius\.nl/g, '@happyhorizon.com');
                    count++;
                }
                if (contributor.url && contributor.url.includes('experius.nl')) {
                    contributor.url = contributor.url.replace(/experius\.nl/g, 'happyhorizon.com');
                    count++;
                }
            }
        }

        if (count > 0) {
            content = JSON.stringify(pkg, null, 4) + '\n';
        }
    } catch (e) {
        // If JSON parse fails, fall through to regex replacement
        const result = applyReplacements(content, filePath);
        content = result.content;
        count = result.count;
    }

    return { content, original, count };
}

// ─── Process .npmrc ──────────────────────────────────────────────────────────

function processNpmrc(filePath) {
    let content = fs.readFileSync(filePath, 'utf-8');
    const original = content;
    let count = 0;

    // Replace registry URLs
    for (const [oldUrl, newUrl] of Object.entries(REGISTRY_RENAMES)) {
        const regex = new RegExp(escapeRegex(oldUrl), 'g');
        const matches = content.match(regex);
        if (matches) {
            count += matches.length;
            content = content.replace(regex, newUrl);
        }
    }

    // Replace scope registries
    for (const [oldScope, newScope] of Object.entries(SCOPE_RENAMES)) {
        const regex = new RegExp(escapeRegex(oldScope), 'g');
        const matches = content.match(regex);
        if (matches) {
            count += matches.length;
            content = content.replace(regex, newScope);
        }
    }

    return { content, original, count };
}

// ─── Process prettierrc ──────────────────────────────────────────────────────

function processPrettierrc(filePath) {
    let content = fs.readFileSync(filePath, 'utf-8');
    const original = content;
    let count = 0;

    // Replace @experius patterns with @happyhorizon in import ordering
    const patterns = [
        { old: '@experius-commerce', new: '@happyhorizon' },
        { old: '@happyhorizon/ui', new: '@happyhorizon' },
        { old: '@experius', new: '@happyhorizon' },
    ];

    for (const p of patterns) {
        const regex = new RegExp(escapeRegex(p.old), 'g');
        const matches = content.match(regex);
        if (matches) {
            count += matches.length;
            content = content.replace(regex, p.new);
        }
    }

    // Remove duplicate @happyhorizon lines that may result from replacement
    const lines = content.split('\n');
    const deduped = [];
    const seen = new Set();
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.includes('@happyhorizon') && seen.has(trimmed)) {
            count++; // count dedup as a change
            continue;
        }
        seen.add(trimmed);
        deduped.push(line);
    }
    content = deduped.join('\n');

    return { content, original, count };
}

// ─── Process TypeScript/JavaScript files ─────────────────────────────────────

function processCodeFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf-8');
    const original = content;
    const result = applyReplacements(content, filePath);
    return { content: result.content, original, count: result.count };
}

// ─── Process tsconfig files ──────────────────────────────────────────────────

function processTsconfig(filePath) {
    let content = fs.readFileSync(filePath, 'utf-8');
    const original = content;
    let count = 0;

    // First: apply the specific IMPORT_PATH_RENAMES (handles keys and values with specific packages)
    const specificResult = applyReplacements(content, filePath);
    content = specificResult.content;
    count += specificResult.count;

    // Second: catch-all for any remaining @experius references in path values
    // This handles patterns like: "../../node_modules/@experius/*"
    // where the general @experius/ scope is used without a specific package name

    // Replace @experius/* in node_modules paths → @happyhorizon/*
    const generalNodeModulesPattern = /(node_modules\/@)experius(\/)/g;
    const generalMatches = content.match(generalNodeModulesPattern);
    if (generalMatches) {
        count += generalMatches.length;
        content = content.replace(generalNodeModulesPattern, '$1happyhorizon$2');
    }

    // Also replace @experius-commerce scope remaining references in path values
    const generalCommercePattern = /(["'])@experius-commerce\//g;
    const commerceMatches = content.match(generalCommercePattern);
    if (commerceMatches) {
        count += commerceMatches.length;
        content = content.replace(generalCommercePattern, '$1@happyhorizon/commerce-');
    }

    // Replace @experius/ scope in path keys (not already handled)
    // e.g. "@happyhorizon/commerce-framework/*" as a tsconfig path key
    // Already handled by applyReplacements above, but catch remaining @experius/ refs
    const generalExperiusPattern = /(["'])@experius\//g;
    const experiusMatches = content.match(generalExperiusPattern);
    if (experiusMatches) {
        count += experiusMatches.length;
        content = content.replace(generalExperiusPattern, '$1@happyhorizon/');
    }

    return { content, original, count };
}

// ─── Process next.config.js ──────────────────────────────────────────────────

function processNextConfig(filePath) {
    let content = fs.readFileSync(filePath, 'utf-8');
    const original = content;
    let count = 0;

    // Apply standard import path renames (e.g. require('@happyhorizon/commerce-core/...'))
    const result = applyReplacements(content, filePath);
    content = result.content;
    count += result.count;

    // Also catch general @experius/ references in transpilePackages arrays etc
    const generalPattern = /@experius-commerce\//g;
    const generalMatches = content.match(generalPattern);
    if (generalMatches) {
        count += generalMatches.length;
        content = content.replace(generalPattern, '@happyhorizon/commerce-');
    }

    const uiPattern = /@experius\//g;
    const uiMatches = content.match(uiPattern);
    if (uiMatches) {
        count += uiMatches.length;
        content = content.replace(uiPattern, '@happyhorizon/');
    }

    return { content, original, count };
}

// ─── Main ────────────────────────────────────────────────────────────────────

function processFile(filePath) {
    const fileName = path.basename(filePath);
    let result;

    if (fileName === 'package.json') {
        result = processPackageJson(filePath);
    } else if (fileName === '.npmrc' || fileName === '.yarnrc') {
        result = processNpmrc(filePath);
    } else if (fileName.startsWith('.prettierrc')) {
        result = processPrettierrc(filePath);
    } else if (fileName.startsWith('tsconfig')) {
        result = processTsconfig(filePath);
    } else if (fileName === 'next.config.js' || fileName === 'next.config.mjs') {
        result = processNextConfig(filePath);
    } else {
        result = processCodeFile(filePath);
    }

    if (result.count > 0 && result.content !== result.original) {
        const relPath = path.relative(resolvedRoot, filePath);
        if (!dryRun) {
            fs.writeFileSync(filePath, result.content, 'utf-8');
        }
        filesModified++;
        totalReplacements += result.count;
        changes.push({ file: relPath, count: result.count });
        console.log(`  ${relPath} (${result.count} replacement${result.count > 1 ? 's' : ''})`);
    }
}

console.log(`\n${dryRun ? '[DRY RUN] ' : ''}Scanning for @experius references in: ${resolvedRoot}\n`);

// First pass: config files in root
for (const configFile of CONFIG_FILES) {
    const filePath = path.join(resolvedRoot, configFile);
    if (fs.existsSync(filePath)) {
        processFile(filePath);
    }
}

// Second pass: walk all source files
const allExtensions = [...CODE_EXTENSIONS, ...STYLE_EXTENSIONS];
walkDir(resolvedRoot, (filePath, fileName) => {
    // Skip config files already processed
    if (CONFIG_FILES.includes(fileName) && path.dirname(filePath) === resolvedRoot) return;
    // Skip CHANGELOG files (historical references)
    if (fileName === 'CHANGELOG.md') return;

    const ext = path.extname(fileName);
    if (allExtensions.includes(ext) || CONFIG_FILES.includes(fileName)) {
        processFile(filePath);
    }
});

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n${dryRun ? '[DRY RUN] ' : ''}Done!`);
console.log(`  Files ${dryRun ? 'would be ' : ''}modified: ${filesModified}`);
console.log(`  Total replacements: ${totalReplacements}`);

if (warnings.length > 0) {
    console.log('\nWarnings (may need manual attention):');
    for (const w of warnings) {
        console.log(`  ${w}`);
    }
}

if (filesModified > 0) {
    console.log('\nPackage name mapping applied:');
    console.log('  @experius-commerce/core → @happyhorizon/commerce-core');
    console.log('  @happyhorizon/commerce-framework/* → @happyhorizon/commerce-framework/*');
    console.log('  @experius-commerce/types → @happyhorizon/commerce-types');
    console.log('  @experius-commerce/utils → @happyhorizon/commerce-utils');
    console.log('  @experius-commerce/swr → @happyhorizon/commerce-swr');
    console.log('  @experius-commerce/storefront-app → @happyhorizon/storefront-app');
    console.log('  @experius/ui → @happyhorizon/ui');
    console.log('  @parent/* → ../../node_modules/@happyhorizon/*');

    if (!dryRun) {
        console.log('\nReview changes with: git diff');
        console.log('\nAfter review, run: yarn install (or npm install)');
    }
}

if (dryRun) {
    console.log('\nRun without --dry-run to apply changes.');
}
