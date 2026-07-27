#!/usr/bin/env node

/**
 * Codemod: Replace JSX.Element with React.ReactElement
 *
 * React 19 removes the global JSX namespace. This codemod:
 * 1. Replaces all `JSX.Element` with `React.ReactElement`
 * 2. Adds `import React from 'react'` or `import type React` if missing
 *
 * Usage: node codemod-jsx-element.js <directory>
 * Example: node codemod-jsx-element.js ./src
 */

const fs = require('fs');
const path = require('path');

const targetDir = process.argv[2];
const dryRun = process.argv.includes('--dry-run');

if (!targetDir) {
    console.error('Usage: node codemod-jsx-element.js <directory> [--dry-run]');
    process.exit(1);
}

const EXTENSIONS = ['.tsx', '.ts', '.d.ts'];
let filesModified = 0;
let totalReplacements = 0;

function walkDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.turbo') continue;
            walkDir(fullPath);
        } else if (EXTENSIONS.some((ext) => entry.name.endsWith(ext))) {
            processFile(fullPath);
        }
    }
}

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf-8');
    const original = content;

    // Count JSX.Element occurrences
    const matches = content.match(/\bJSX\.Element\b/g);
    if (!matches) return;

    const count = matches.length;

    // Replace JSX.Element with React.ReactElement
    content = content.replace(/\bJSX\.Element\b/g, 'React.ReactElement');

    // Check if React import exists
    const hasReactImport = /import\s+(?:type\s+)?React[\s,{]/.test(content) ||
        /import\s+\*\s+as\s+React\s+from/.test(content);

    const hasReactTypeImport = /import\s+type\s+React/.test(content) ||
        /import\s+type\s+\{[^}]*\}\s+from\s+['"]react['"]/.test(content);

    if (!hasReactImport) {
        // Check if there's an existing import from 'react' we can augment
        const existingTypeImport = content.match(/^(import\s+type\s+)\{([^}]+)\}(\s+from\s+['"]react['"];?)$/m);
        const existingImport = content.match(/^(import\s+)\{([^}]+)\}(\s+from\s+['"]react['"];?)$/m);

        if (existingTypeImport) {
            // Add React to existing type import: import type { FC } from 'react' → import type React, { FC } from 'react'
            content = content.replace(
                existingTypeImport[0],
                `${existingTypeImport[1]}React, {${existingTypeImport[2]}}${existingTypeImport[3]}`
            );
        } else if (existingImport) {
            // Add React to existing import: import { FC } from 'react' → import React, { FC } from 'react'
            content = content.replace(
                existingImport[0],
                `${existingImport[1]}React, {${existingImport[2]}}${existingImport[3]}`
            );
        } else {
            // Check if this is a .d.ts file (prefer type import)
            const isTypeFile = filePath.endsWith('.d.ts');

            // Add new import at the top (after any existing imports from 'react')
            const reactImportLine = isTypeFile
                ? "import type React from 'react';\n"
                : "import React from 'react';\n";

            // Find the best place to insert
            const firstImportMatch = content.match(/^import\s/m);
            if (firstImportMatch) {
                content = content.slice(0, firstImportMatch.index) + reactImportLine + content.slice(firstImportMatch.index);
            } else {
                content = reactImportLine + content;
            }
        }
    }

    if (content !== original) {
        if (!dryRun) {
            fs.writeFileSync(filePath, content, 'utf-8');
        }
        filesModified++;
        totalReplacements += count;
        console.log(`  ${filePath} (${count} replacement${count > 1 ? 's' : ''})`);
    }
}

console.log(`\n${dryRun ? '[DRY RUN] ' : ''}Scanning for JSX.Element usage in: ${path.resolve(targetDir)}\n`);
walkDir(path.resolve(targetDir));

console.log(`\n${dryRun ? '[DRY RUN] ' : ''}Done! ${dryRun ? 'Would modify' : 'Modified'} ${filesModified} file(s), ${totalReplacements} total replacement(s).`);
if (filesModified > 0 && !dryRun) {
    console.log('\nReview changes with: git diff');
}
if (dryRun) {
    console.log('\nRun without --dry-run to apply changes.');
}
